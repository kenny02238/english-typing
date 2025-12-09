"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Exercise, UserPreferences, ValidationResult } from "@/types";
import { validateInput, splitIntoWords, isAllCorrect } from "@/lib/validation";
import { speechService } from "@/lib/speech";

// 語速選項
const SPEECH_RATES = [0.25, 0.5, 0.75, 1.0];

export default function PracticePage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [userInput, setUserInput] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<
    ValidationResult[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [showAnswer, setShowAnswer] = useState(false); // 是否顯示答案
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasInitialized = useRef(false); // 追蹤是否已經初始化
  const isGeneratingRef = useRef(false); // 追蹤是否正在生成題目

  // 檢測是否為 Mac（用於顯示正確的快捷鍵符號）
  const isMac =
    typeof window !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const cmdKey = isMac ? "⌘" : "Ctrl";

  // 初始化：讀取偏好設定並生成第一題
  useEffect(() => {
    // 防止重複初始化（React Strict Mode 會導致 useEffect 執行兩次）
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    // 首次進入頁面時，先清空語音佇列
    if (speechService) {
      speechService.clearQueue();
      speechService.stop(); // 停止任何正在播放的語音
    }

    const prefsStr = sessionStorage.getItem("userPreferences");
    if (!prefsStr) {
      router.push("/");
      return;
    }

    const prefs = JSON.parse(prefsStr);
    setPreferences(prefs);

    // 等待一小段時間確保語音佇列已清空
    setTimeout(() => {
      generateNewExercise(prefs);
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 生成新題目
  const generateNewExercise = async (prefs: UserPreferences) => {
    // 防止重複調用
    if (isGeneratingRef.current) {
      console.log("正在生成題目中，跳過重複調用");
      return;
    }

    isGeneratingRef.current = true;
    setIsLoading(true);
    setCurrentChunkIndex(0);
    setUserInput([]);
    setValidationResults([]);
    setShowAnswer(false); // 重置答案顯示狀態

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API 錯誤:", response.status, errorData);

        // 處理 rate limit 錯誤
        if (response.status === 429 || errorData.type === "rate_limit") {
          // 優先使用 header 中的 retry-after，否則使用錯誤訊息中的
          const retryAfterHeader = response.headers.get("retry-after");
          let retryAfter = errorData.retryAfter || "幾分鐘";

          // 如果 header 中有 retry-after（秒數），轉換為 "x分鐘x秒" 格式
          if (retryAfterHeader) {
            const totalSeconds = parseInt(retryAfterHeader);
            if (!isNaN(totalSeconds)) {
              const minutes = Math.floor(totalSeconds / 60);
              const seconds = totalSeconds % 60;
              if (minutes > 0 && seconds > 0) {
                retryAfter = `${minutes}分鐘${seconds}秒`;
              } else if (minutes > 0) {
                retryAfter = `${minutes}分鐘`;
              } else {
                retryAfter = `${seconds}秒`;
              }
            }
          }

          throw new Error(`API 配額已用完，請稍後再試（約 ${retryAfter}）`);
        }

        throw new Error(
          errorData.error ||
            `生成失敗: ${response.status} ${response.statusText}`
        );
      }

      const newExercise: Exercise = await response.json();
      setExercise(newExercise);
      setIsLoading(false); // 立即設置載入完成，讓用戶看到內容

      // 先完全清空語音佇列，避免重複播放或殘留的語音
      if (speechService) {
        speechService.stop(); // 停止當前播放
        speechService.clearQueue(); // 清空佇列
      }

      // 等待頁面渲染完成和語音服務初始化後再播放
      // 使用 requestAnimationFrame 確保 DOM 已更新
      requestAnimationFrame(() => {
        setTimeout(async () => {
          if (newExercise.chunks[0] && speechService) {
            await speechService.speak(newExercise.chunks[0], speechRate);
          }
        }, 800); // 增加延遲時間，確保語音服務已準備好
      });
    } catch (error) {
      console.error("生成題目錯誤:", error);
      const errorMessage =
        error instanceof Error ? error.message : "生成題目失敗，請重試";
      alert(errorMessage);
      // 如果生成失敗，跳轉回首頁
      router.push("/");
    } finally {
      // 無論成功或失敗，都要重置載入狀態和生成標記
      setIsLoading(false);
      isGeneratingRef.current = false;
    }
  };

  // 處理語速切換
  const increaseSpeed = useCallback(() => {
    setSpeechRate((currentRate) => {
      const currentIndex = SPEECH_RATES.indexOf(currentRate);
      if (currentIndex < SPEECH_RATES.length - 1) {
        return SPEECH_RATES[currentIndex + 1];
      }
      return currentRate;
    });
  }, []);

  const decreaseSpeed = useCallback(() => {
    setSpeechRate((currentRate) => {
      const currentIndex = SPEECH_RATES.indexOf(currentRate);
      if (currentIndex > 0) {
        return SPEECH_RATES[currentIndex - 1];
      }
      return currentRate;
    });
  }, []);

  // 處理全域快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMacKey = e.metaKey;
      const isCtrlKey = e.ctrlKey;
      const isModKey = isMacKey || isCtrlKey;

      // Command/Ctrl + K：重聽（在輸入框內外都可用）
      if ((e.key === "k" || e.key === "K") && isModKey) {
        e.preventDefault();
        if (exercise && speechService) {
          const currentChunk = exercise.chunks[currentChunkIndex];
          if (currentChunk) {
            speechService.speak(currentChunk, speechRate);
          }
        }
        return;
      }

      // Command/Ctrl + L：升速度（在輸入框內外都可用）
      if ((e.key === "l" || e.key === "L") && isModKey) {
        e.preventDefault();
        increaseSpeed();
        return;
      }

      // Command/Ctrl + J：降速度（在輸入框內外都可用）
      if ((e.key === "j" || e.key === "J") && isModKey) {
        e.preventDefault();
        decreaseSpeed();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exercise, currentChunkIndex, speechRate, increaseSpeed, decreaseSpeed]);

  // 處理輸入變化
  const handleInputChange = (index: number, value: string) => {
    const newInput = [...userInput];
    newInput[index] = value;
    setUserInput(newInput);

    // 自動跳到下一格（按空白鍵）
    if (value.endsWith(" ") && index < currentWords.length - 1) {
      newInput[index] = value.trim();
      setUserInput(newInput);
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 處理Enter鍵提交
  const handleSubmit = () => {
    if (!exercise) return;

    const currentChunk = exercise.chunks[currentChunkIndex];
    const correctWords = splitIntoWords(currentChunk);

    // 即使所有輸入框都為空，也要進行驗證並顯示結果
    // 空輸入會被視為錯誤
    const results = validateInput(userInput, correctWords);
    setValidationResults(results);

    // 如果全對
    if (isAllCorrect(results)) {
      setTimeout(() => {
        // 如果是最後一個chunk，自動生成下一題
        if (currentChunkIndex === exercise.chunks.length - 1) {
          // 完成當前題目，自動生成下一題
          if (preferences) {
            // 確保 preferences 有必要的欄位
            const prefsToUse: UserPreferences = {
              topics: preferences.topics || [],
              ...(preferences.sentenceLength && {
                sentenceLength: preferences.sentenceLength,
              }),
              ...(preferences.difficulty && {
                difficulty: preferences.difficulty,
              }),
              ...(preferences.customSentence && {
                customSentence: preferences.customSentence,
              }),
            };
            generateNewExercise(prefsToUse);
          } else {
            console.error("preferences 為 null，無法生成下一題");
            alert("無法生成下一題，請返回首頁重新開始");
          }
        } else {
          // 進入下一個chunk（使用函數式更新確保拿到最新值）
          setCurrentChunkIndex((prev) => {
            const nextIndex = prev + 1;
            const nextChunk = exercise.chunks[nextIndex];

            // 先停止當前播放，避免重複播放
            if (speechService) {
              speechService.stop();
            }

            // 自動播放下一個chunk
            setTimeout(async () => {
              if (nextChunk && speechService) {
                await speechService.speak(nextChunk, speechRate);
              }
            }, 300);

            return nextIndex;
          });

          setUserInput([]);
          setValidationResults([]);
          setShowAnswer(false); // 關閉答案顯示，進入下一階段

          // 自動focus到第一個輸入框
          setTimeout(() => {
            inputRefs.current[0]?.focus();
          }, 300);
        }
      }, 1000);
    }
  };

  // 檢查是否已提交（有驗證結果）
  const hasSubmitted = validationResults.length > 0;

  // 重聽按鈕
  const handleRepeat = async () => {
    if (!exercise || !speechService) return;
    const currentChunk = exercise.chunks[currentChunkIndex];
    if (currentChunk) {
      await speechService.speak(currentChunk, speechRate);
    }
  };

  // 切換答案顯示
  const handleToggleAnswer = () => {
    setShowAnswer((prev) => !prev);
  };

  // 練習其他種類題目（返回首頁）
  const handlePracticeOther = () => {
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">AI正在生成題目...</p>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 text-lg">載入中...</p>
        </div>
      </div>
    );
  }

  const currentChunk = exercise.chunks[currentChunkIndex];
  const currentWords = splitIntoWords(currentChunk);

  // 練習介面
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* 進度指示 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">
                Chunk {currentChunkIndex + 1} / {exercise.chunks.length}
              </span>
              <button
                onClick={handlePracticeOther}
                className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                🔄 練習其他種類題目
              </button>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${
                    ((currentChunkIndex + 1) / exercise.chunks.length) * 100
                  }%`,
                }}
              ></div>
            </div>
          </div>

          {/* 當前chunk提示 */}
          <div className="text-center mb-8">
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              🎧 請聽寫以下內容
            </div>
            <div className="text-slate-400 text-lg mb-4">
              ({currentWords.length} 個單字)
            </div>

            {/* 顯示當前chunk的答案 */}
            {showAnswer && (
              <div className="mb-4 px-6 py-4 bg-purple-50 border-2 border-purple-300 rounded-xl shadow-sm">
                <div className="text-sm text-purple-600 mb-2 font-medium">
                  答案：
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {exercise.chunks[currentChunkIndex]}
                </div>
              </div>
            )}

            {/* 提交後顯示當前chunk的翻譯 */}
            {hasSubmitted && exercise.chunkTranslations && (
              <div className="mt-4 px-4 py-2 bg-slate-100 rounded-lg inline-block">
                <div className="text-sm text-slate-600 mb-1">中文意思：</div>
                <div className="text-lg font-semibold text-slate-800">
                  {exercise.chunkTranslations[currentChunkIndex]}
                </div>
              </div>
            )}
          </div>

          {/* 輸入格子 */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-3 justify-center">
              {currentWords.map((word, index) => {
                const result = validationResults[index];
                const hasResult = result !== undefined;
                const isCorrect = result?.isCorrect;
                // 查找單字的中文意思（處理大小寫和標點符號）
                const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, "");
                const wordMeaningFull =
                  exercise.wordMeanings[word] ||
                  exercise.wordMeanings[word.toLowerCase()] ||
                  exercise.wordMeanings[cleanWord] ||
                  "";

                // 解析詞性和中文意思：格式為 "中文意思 (詞性)"
                let wordMeaning = "";
                let partOfSpeech = "";
                if (wordMeaningFull) {
                  const match = wordMeaningFull.match(/^(.+?)\s*\((.+?)\)$/);
                  if (match) {
                    wordMeaning = match[1].trim();
                    partOfSpeech = match[2].trim();
                  } else {
                    // 如果沒有詞性，只顯示中文意思
                    wordMeaning = wordMeaningFull;
                  }
                }

                return (
                  <div key={index} className="flex flex-col items-center">
                    {/* 單字中文意思（提交後顯示在輸入框上方） */}
                    {hasSubmitted && wordMeaning && (
                      <div className="mb-1 text-xs text-slate-600 font-medium text-center min-h-4 px-1">
                        {wordMeaning}
                      </div>
                    )}
                    {hasSubmitted && !wordMeaning && (
                      <div className="mb-1 text-xs text-slate-400 text-center min-h-4 px-1">
                        &nbsp;
                      </div>
                    )}
                    <input
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      value={userInput[index] ?? ""}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSubmit();
                        }
                      }}
                      disabled={hasResult && isCorrect}
                      className={`w-32 px-4 py-3 text-center text-lg font-medium rounded-lg border-2 transition-all ${
                        hasResult
                          ? isCorrect
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-red-500 bg-red-50 text-red-700"
                          : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-900"
                      }`}
                      placeholder={
                        userInput[index] ? undefined : `${index + 1}`
                      }
                      autoFocus={index === 0}
                    />
                    {/* 詞性（提交後顯示在輸入框下方） */}
                    {hasSubmitted && partOfSpeech && (
                      <div className="mt-1 text-xs text-slate-500 text-center min-h-4 italic">
                        {partOfSpeech}
                      </div>
                    )}
                    {hasSubmitted && !partOfSpeech && (
                      <div className="mt-1 text-xs text-slate-400 text-center min-h-4">
                        &nbsp;
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 控制按鈕 */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={handleRepeat}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-all cursor-pointer"
            >
              🔊 重聽 <span className="text-xs opacity-70">({cmdKey}+K)</span>
            </button>
            <button
              onClick={handleToggleAnswer}
              className={`flex-1 py-3 font-medium rounded-lg transition-all cursor-pointer ${
                showAnswer
                  ? "bg-purple-500 hover:bg-purple-600 text-white"
                  : "bg-purple-100 hover:bg-purple-200 text-purple-700"
              }`}
            >
              {showAnswer ? "🙈 隱藏答案" : "👁️ 查看答案"}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all cursor-pointer"
            >
              ✓ 提交 <span className="text-xs opacity-90">(Enter)</span>
            </button>
          </div>

          {/* 語速控制 */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-4 text-sm mb-2">
              <span className="text-slate-600 font-medium">語速:</span>
              {SPEECH_RATES.map((rate) => (
                <button
                  key={rate}
                  onClick={() => setSpeechRate(rate)}
                  className={`px-3 py-1.5 rounded-md transition-all text-sm cursor-pointer ${
                    speechRate === rate
                      ? "bg-blue-500 text-white font-semibold shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {rate === 1.0 ? "1x" : `${rate}x`}
                </button>
              ))}
            </div>
            <div className="text-center text-xs text-slate-500">
              <span>{cmdKey}+L</span>
              <span className="mx-2">升速</span>
              <span className="mx-1">·</span>
              <span>{cmdKey}+J</span>
              <span className="mx-2">降速</span>
            </div>
          </div>

          {/* 快捷鍵提示 */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex flex-col gap-3">
                <span className="font-semibold text-slate-700 text-center text-xs">
                  ⌨️ 快捷鍵
                </span>
                <div className="flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-slate-700 font-mono text-xs shadow-sm">
                      Space
                    </kbd>
                    <span className="text-slate-600">下一格</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-slate-700 font-mono text-xs shadow-sm">
                      {cmdKey}
                    </kbd>
                    <span className="text-slate-400">+</span>
                    <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-slate-700 font-mono text-xs shadow-sm">
                      K
                    </kbd>
                    <span className="text-slate-600">重聽</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-slate-700 font-mono text-xs shadow-sm">
                      Enter
                    </kbd>
                    <span className="text-slate-600">提交</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
