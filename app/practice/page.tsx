"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Exercise, UserPreferences, ValidationResult } from "@/types";
import { validateInput, splitIntoWords, isAllCorrect } from "@/lib/validation";
import { speechService } from "@/lib/speech";

export default function PracticePage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [userInput, setUserInput] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<
    ValidationResult[]
  >([]);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 初始化：讀取偏好設定並生成第一題
  useEffect(() => {
    const prefsStr = sessionStorage.getItem("userPreferences");
    if (!prefsStr) {
      router.push("/");
      return;
    }

    const prefs = JSON.parse(prefsStr);
    setPreferences(prefs);
    generateNewExercise(prefs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 生成新題目
  const generateNewExercise = async (prefs: UserPreferences) => {
    setIsLoading(true);
    setShowResult(false);
    setCurrentChunkIndex(0);
    setUserInput([]);
    setValidationResults([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (!response.ok) throw new Error("生成失敗");

      const newExercise: Exercise = await response.json();
      setExercise(newExercise);

      // 先停止所有播放，避免重複播放
      if (speechService) {
        speechService.stop();
      }

      // 自動播放第一個chunk
      setTimeout(() => {
        if (newExercise.chunks[0] && speechService) {
          speechService.speak(newExercise.chunks[0], speechRate);
        }
      }, 500);
    } catch (error) {
      console.error("生成題目錯誤:", error);
      alert("生成題目失敗，請重試");
    } finally {
      setIsLoading(false);
    }
  };

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
    const results = validateInput(userInput, correctWords);
    setValidationResults(results);

    // 如果全對
    if (isAllCorrect(results)) {
      setTimeout(() => {
        // 如果是最後一個chunk，顯示結果
        if (currentChunkIndex === exercise.chunks.length - 1) {
          setShowResult(true);
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
            setTimeout(() => {
              if (nextChunk && speechService) {
                speechService.speak(nextChunk, speechRate);
              }
            }, 200);

            return nextIndex;
          });

          setUserInput([]);
          setValidationResults([]);

          // 自動focus到第一個輸入框
          setTimeout(() => {
            inputRefs.current[0]?.focus();
          }, 300);
        }
      }, 1000);
    }
  };

  // 重聽按鈕
  const handleRepeat = () => {
    if (!exercise || !speechService) return;
    const currentChunk = exercise.chunks[currentChunkIndex];
    if (currentChunk) {
      speechService.speak(currentChunk, speechRate);
    }
  };

  // 繼續練習
  const handleContinue = () => {
    if (preferences) {
      generateNewExercise(preferences);
    }
  };

  // 返回首頁
  const handleGoHome = () => {
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

  // 如果顯示結果（完成整句練習）
  if (showResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* 完整句子 */}
            <div className="text-center mb-8">
              <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
                ✅ 完成！
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-4">
                {exercise.sentence}
              </h2>
              <p className="text-2xl text-slate-600">{exercise.translation}</p>
            </div>

            {/* 單字解釋 */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">
                📝 單字解釋
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(exercise.wordMeanings).map(
                  ([word, meaning]) => (
                    <div
                      key={word}
                      className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                    >
                      <div className="font-semibold text-slate-800 mb-1">
                        {word}
                      </div>
                      <div className="text-slate-600 text-sm">{meaning}</div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* 按鈕 */}
            <div className="flex gap-4">
              <button
                onClick={handleContinue}
                className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                🔄 繼續練習
              </button>
              <button
                onClick={handleGoHome}
                className="px-6 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-all"
              >
                🏠 返回首頁
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                onClick={handleGoHome}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                🏠 返回首頁
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
          </div>

          {/* 輸入格子 */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-3 justify-center">
              {currentWords.map((_, index) => {
                const result = validationResults[index];
                const hasResult = result !== undefined;
                const isCorrect = result?.isCorrect;

                return (
                  <div key={index} className="flex flex-col">
                    <input
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      value={userInput[index] || ""}
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
                          : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      }`}
                      placeholder={`#${index + 1}`}
                      autoFocus={index === 0}
                    />
                    {hasResult && !isCorrect && (
                      <div className="mt-1 text-xs text-slate-500 text-center">
                        正確: {result.correctWord}
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
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-all"
            >
              🔊 重聽
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all"
            >
              ✓ 提交 (Enter)
            </button>
          </div>

          {/* 語速控制 */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="text-slate-600">語速:</span>
            {[0.25, 0.5, 0.75, 1.0].map((rate) => (
              <button
                key={rate}
                onClick={() => setSpeechRate(rate)}
                className={`px-3 py-1 rounded transition-all ${
                  speechRate === rate
                    ? "bg-blue-500 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {rate === 1.0 ? "1x" : `${rate}x`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
