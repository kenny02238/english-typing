import { NextRequest, NextResponse } from "next/server";
import ai from "@/lib/gemini";
import { UserPreferences, Exercise } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const preferences: UserPreferences = await request.json();
    
    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: "無效的偏好設定格式" },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(preferences);

    const fullPrompt = `You are an English teacher. Create a typing practice exercise.

${prompt}

Return ONLY valid JSON, no markdown or explanations.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
      });

      let responseText = "";
      try {
        if ((response as any)?.candidates?.[0]?.content?.parts?.[0]?.text) {
          responseText = (response as any).candidates[0].content.parts[0].text;
        } else if (typeof (response as any)?.text === 'string') {
          responseText = (response as any).text;
        }
      } catch (e) {
        console.error('解析回應錯誤:', e);
        return NextResponse.json(
          { error: "無法從 API 回應中提取文字內容" },
          { status: 500 }
        );
      }
      
      if (!responseText) {
        return NextResponse.json(
          { error: "無法從 API 回應中提取文字內容" },
          { status: 500 }
        );
      }
      
      let jsonText = responseText.trim();
      
      const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                        jsonText.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      
      if (!jsonText || !jsonText.startsWith('{')) {
        return NextResponse.json(
          { error: "AI回應格式不正確，無法解析JSON" },
          { status: 500 }
        );
      }
      
      const exercise: Exercise = JSON.parse(jsonText);

      if (
        !exercise.sentence ||
        !exercise.chunks ||
        !exercise.translation ||
        !exercise.wordMeanings ||
        !exercise.chunkTranslations ||
        exercise.chunkTranslations.length !== exercise.chunks.length
      ) {
        return NextResponse.json(
          { error: "AI回應格式不正確，缺少必要欄位" },
          { status: 500 }
        );
      }

      return NextResponse.json(exercise);

    } catch (geminiError: any) {
      console.error("Gemini API 錯誤:", geminiError);
      
      // 處理 429 配額已用完錯誤
      if (geminiError?.status === 429 || geminiError?.statusCode === 429) {
        let errorData = geminiError?.error || geminiError;
        
        // 如果 error 是字串，嘗試解析 JSON
        if (typeof errorData === 'string') {
          try {
            const parsed = JSON.parse(errorData);
            if (parsed?.error) {
              errorData = parsed.error;
            } else {
              errorData = parsed;
            }
          } catch (e) {
            // 解析失敗，繼續使用原始字串
          }
        }
        
        // 如果 errorData.error 存在且是字串，也嘗試解析
        if (errorData?.error && typeof errorData.error === 'string') {
          try {
            const parsed = JSON.parse(errorData.error);
            if (parsed?.error) {
              errorData = parsed.error;
            } else {
              errorData = parsed;
            }
          } catch (e) {
            // 解析失敗，繼續使用原始資料
          }
        }
        
        const errorMessage = errorData?.message || String(geminiError);
        
        // 嘗試從錯誤訊息中提取配額資訊
        let quotaLimit = 20; // 預設免費層限制
        let retryAfter = null;
        
        // 從錯誤詳情中提取資訊（優先）
        if (errorData?.details && Array.isArray(errorData.details)) {
          for (const detail of errorData.details) {
            // 提取配額限制
            if (detail?.quotaFailure?.violations && Array.isArray(detail.quotaFailure.violations)) {
              for (const violation of detail.quotaFailure.violations) {
                if (violation?.quotaValue) {
                  quotaLimit = parseInt(String(violation.quotaValue));
                }
              }
            }
            // 提取重試時間
            if (detail?.retryInfo?.retryDelay) {
              const delayStr = String(detail.retryInfo.retryDelay);
              // 處理 "20s" 格式
              let seconds = 0;
              if (delayStr.endsWith('s')) {
                seconds = parseFloat(delayStr.replace(/[^\d.]/g, ''));
              } else {
                seconds = parseFloat(delayStr.replace(/[^\d.]/g, ''));
              }
              if (!isNaN(seconds) && seconds > 0) {
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = Math.floor(seconds % 60);
                if (minutes > 0) {
                  retryAfter = remainingSeconds > 0 
                    ? `${minutes}分${remainingSeconds}秒`
                    : `${minutes}分鐘`;
                } else {
                  retryAfter = `${Math.ceil(seconds)}秒`;
                }
              }
            }
          }
        }
        
        // 如果沒有從 details 提取到，嘗試從錯誤訊息字串中提取
        if (quotaLimit === 20) {
          const quotaMatch = errorMessage.match(/limit[:\s]+(\d+)/i) || 
                            errorMessage.match(/quotaValue["']?\s*:\s*["']?(\d+)/i);
          if (quotaMatch) {
            quotaLimit = parseInt(quotaMatch[1]);
          }
        }
        
        if (!retryAfter) {
          // 從訊息中提取重試時間，支援 "20.755467853s" 或 "20s" 格式
          const retryMatch = errorMessage.match(/retry.*?in\s*([\d.]+)\s*s/i) ||
                            errorMessage.match(/retryDelay["']?\s*:\s*["']?([\d.]+)s?/i);
          if (retryMatch) {
            const seconds = parseFloat(retryMatch[1]);
            if (!isNaN(seconds) && seconds > 0) {
              const minutes = Math.floor(seconds / 60);
              const remainingSeconds = Math.floor(seconds % 60);
              if (minutes > 0) {
                retryAfter = remainingSeconds > 0 
                  ? `${minutes}分${remainingSeconds}秒`
                  : `${minutes}分鐘`;
              } else {
                retryAfter = `${Math.ceil(seconds)}秒`;
              }
            }
          }
        }
        
        // 組裝友善的錯誤訊息
        let friendlyMessage = `今日免費配額已用完（${quotaLimit}次/天）`;
        if (retryAfter) {
          friendlyMessage += `，請在 ${retryAfter} 後再試`;
        } else {
          friendlyMessage += `，請明天再試或考慮升級方案`;
        }
        
        return NextResponse.json(
          { error: friendlyMessage },
          { status: 429 }
        );
      }
      
      // 其他錯誤直接返回原始訊息
      const errorMessage = geminiError?.message || 
                          geminiError?.error?.message || 
                          String(geminiError);
      
      return NextResponse.json(
        { error: errorMessage },
        { status: geminiError?.status || 500 }
      );
    }
  } catch (error: any) {
    console.error("生成題目錯誤:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

function buildPrompt(preferences: UserPreferences): string {
  const sentenceLength = preferences.sentenceLength || 'medium';
  const difficulty = preferences.difficulty || 'A2';

  const lengthGuidelines: Record<string, { range: string; description: string }> = {
    short: {
      range: "5-8",
      description: "Short: 5-8 words, simple structure, one clear idea",
    },
    medium: {
      range: "10-15",
      description: "Medium: 10-15 words, moderate complexity, can include one subordinate clause",
    },
    long: {
      range: "18-25",
      description: "Long: 18-25 words, complex structure with multiple clauses",
    },
  };

  const lengthGuideline = lengthGuidelines[sentenceLength];

  const allTopics = [...preferences.topics];
  if (preferences.customSentence?.trim()) {
    allTopics.push(preferences.customSentence.trim());
  }
  const topicsText =
    allTopics.length > 0
      ? `topics: ${allTopics.join(", ")}`
      : "any common topic";

  const difficultyGuidelines: Record<string, string> = {
    A1: "A1 (Beginner): Basic vocabulary, simple tenses, no complex grammar",
    A2: "A2 (Elementary): Common vocabulary, basic tenses, simple conjunctions",
    B1: "B1 (Intermediate): Varied vocabulary, multiple tenses, subordinate clauses",
    B2: "B2 (Upper-Intermediate): Advanced vocabulary, complex grammar, multiple clauses",
    C1: "C1 (Advanced): Very advanced vocabulary, sophisticated structures, academic language",
    C2: "C2 (Proficiency): Native-level vocabulary, highly complex structures, professional language",
    C3: "C3 (Mastery): Very advanced but PRACTICAL vocabulary, sophisticated structures, avoid overly formal/academic jargon",
  };

  const difficultyGuideline = difficultyGuidelines[difficulty] || difficultyGuidelines.A1;

  return `Create an English typing practice exercise.

Requirements:
- Difficulty: ${difficultyGuideline}
- Length: ${lengthGuideline.description} (EXACTLY ${lengthGuideline.range} words)
- Topics: ${topicsText}
- Use PRACTICAL and NATURAL English for ${difficulty} level
- Create a UNIQUE sentence each time

Response format (JSON only, no markdown):

{
  "sentence": "完整英文句子",
  "chunks": ["最小片段", "中等片段", "完整句子"],
  "translation": "完整繁體中文翻譯",
  "chunkTranslations": ["片段1翻譯", "片段2翻譯", "片段3翻譯"],
  "wordMeanings": {
    "word": "中文意思 (詞性)"
  }
}

Rules:
- chunks: 從小到大漸進（從句子末尾開始）
- chunkTranslations: 與 chunks 數量相同
- wordMeanings: 包含所有單字，格式為 "中文 (詞性)"
- 詞性: 名詞/動詞/形容詞/副詞/代名詞/介系詞/冠詞/連接詞`;
}
