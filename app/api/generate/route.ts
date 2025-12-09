import { NextRequest, NextResponse } from "next/server";
import ai from "@/lib/gemini";
import { UserPreferences, Exercise } from "@/types";
import { getRandomExercise, saveExercise, exerciseExists } from "@/lib/db";

function generateMockExercise(preferences: UserPreferences): Exercise {
  const sentenceLength = preferences.sentenceLength || 'medium';
  const difficulty = preferences.difficulty || 'A2';

  const mockSentences: Record<string, Record<string, Exercise>> = {
    short: {
      A1: {
        sentence: "I love reading books",
        chunks: ["books", "reading books", "I love reading books"],
        translation: "我喜歡讀書",
        chunkTranslations: ["書", "讀書", "我喜歡讀書"],
        wordMeanings: {
          "I": "我 (代名詞)",
          "love": "喜歡 (動詞)",
          "reading": "閱讀 (動名詞)",
          "books": "書 (名詞)"
        }
      },
      A2: {
        sentence: "She goes to school every day",
        chunks: ["every day", "to school every day", "She goes to school every day"],
        translation: "她每天去學校",
        chunkTranslations: ["每天", "每天去學校", "她每天去學校"],
        wordMeanings: {
          "She": "她 (代名詞)",
          "goes": "去 (動詞)",
          "to": "到 (介系詞)",
          "school": "學校 (名詞)",
          "every": "每個 (形容詞)",
          "day": "天 (名詞)"
        }
      },
      B1: {
        sentence: "I want to visit the museum",
        chunks: ["the museum", "to visit the museum", "I want to visit the museum"],
        translation: "我想參觀博物館",
        chunkTranslations: ["博物館", "參觀博物館", "我想參觀博物館"],
        wordMeanings: {
          "I": "我 (代名詞)",
          "want": "想要 (動詞)",
          "to": "到 (不定詞標記)",
          "visit": "參觀 (動詞)",
          "the": "這個 (冠詞)",
          "museum": "博物館 (名詞)"
        }
      }
    },
    medium: {
      A1: {
        sentence: "This is a photograph of our village",
        chunks: ["our village", "of our village", "a photograph of our village", "This is a photograph of our village"],
        translation: "這是我們村莊的照片",
        chunkTranslations: ["我們的村莊", "我們的村莊", "我們村莊的照片", "這是我們村莊的照片"],
        wordMeanings: {
          "This": "這 (代名詞)",
          "is": "是 (動詞)",
          "a": "一個 (冠詞)",
          "photograph": "照片 (名詞)",
          "of": "的 (介系詞)",
          "our": "我們的 (代名詞)",
          "village": "村莊 (名詞)"
        }
      },
      A2: {
        sentence: "I enjoy reading books because they help me relax",
        chunks: ["me relax", "help me relax", "they help me relax", "because they help me relax", "reading books because they help me relax", "I enjoy reading books because they help me relax"],
        translation: "我喜歡讀書，因為它們幫助我放鬆",
        chunkTranslations: ["我放鬆", "幫助我放鬆", "它們幫助我放鬆", "因為它們幫助我放鬆", "讀書因為它們幫助我放鬆", "我喜歡讀書，因為它們幫助我放鬆"],
        wordMeanings: {
          "I": "我 (代名詞)",
          "enjoy": "享受 (動詞)",
          "reading": "閱讀 (動名詞)",
          "books": "書 (名詞)",
          "because": "因為 (連接詞)",
          "they": "它們 (代名詞)",
          "help": "幫助 (動詞)",
          "me": "我 (代名詞)",
          "relax": "放鬆 (動詞)"
        }
      },
      B1: {
        sentence: "She decided to visit the museum that her friend recommended",
        chunks: ["her friend recommended", "that her friend recommended", "the museum that her friend recommended", "to visit the museum that her friend recommended", "She decided to visit the museum that her friend recommended"],
        translation: "她決定參觀她朋友推薦的博物館",
        chunkTranslations: ["她朋友推薦", "她朋友推薦的", "她朋友推薦的博物館", "參觀她朋友推薦的博物館", "她決定參觀她朋友推薦的博物館"],
        wordMeanings: {
          "She": "她 (代名詞)",
          "decided": "決定 (動詞)",
          "to": "到 (不定詞標記)",
          "visit": "參觀 (動詞)",
          "the": "這個 (冠詞)",
          "museum": "博物館 (名詞)",
          "that": "那個 (關係代名詞)",
          "her": "她的 (代名詞)",
          "friend": "朋友 (名詞)",
          "recommended": "推薦 (動詞)"
        }
      }
    },
    long: {
      A2: {
        sentence: "Despite the heavy rain that had been falling all morning she decided to walk to the nearby bookstore",
        chunks: ["all morning", "had been falling all morning", "that had been falling all morning", "the heavy rain that had been falling all morning", "Despite the heavy rain that had been falling all morning", "to the nearby bookstore", "walk to the nearby bookstore", "to walk to the nearby bookstore", "she decided to walk to the nearby bookstore", "Despite the heavy rain that had been falling all morning she decided to walk to the nearby bookstore"],
        translation: "儘管整個早上都在下大雨，她決定步行到附近的書店",
        chunkTranslations: ["整個早上", "整個早上一直在下", "整個早上一直在下的", "整個早上一直在下的大雨", "儘管整個早上一直在下的大雨", "到附近的書店", "步行到附近的書店", "步行到附近的書店", "她決定步行到附近的書店", "儘管整個早上一直在下的大雨，她決定步行到附近的書店"],
        wordMeanings: {
          "Despite": "儘管 (介系詞)",
          "the": "這個 (冠詞)",
          "heavy": "重的 (形容詞)",
          "rain": "雨 (名詞)",
          "that": "那個 (關係代名詞)",
          "had": "已經 (助動詞)",
          "been": "被 (助動詞)",
          "falling": "落下 (動名詞)",
          "all": "全部 (形容詞)",
          "morning": "早上 (名詞)",
          "she": "她 (代名詞)",
          "decided": "決定 (動詞)",
          "to": "到 (不定詞標記)",
          "walk": "步行 (動詞)",
          "nearby": "附近的 (形容詞)",
          "bookstore": "書店 (名詞)"
        }
      },
      B1: {
        sentence: "I have been studying English for three years because I want to improve my communication skills",
        chunks: ["my communication skills", "to improve my communication skills", "I want to improve my communication skills", "because I want to improve my communication skills", "for three years because I want to improve my communication skills", "studying English for three years because I want to improve my communication skills", "I have been studying English for three years because I want to improve my communication skills"],
        translation: "我已經學了三年英語，因為我想提高我的溝通技巧",
        chunkTranslations: ["我的溝通技巧", "提高我的溝通技巧", "我想提高我的溝通技巧", "因為我想提高我的溝通技巧", "三年因為我想提高我的溝通技巧", "學英語三年因為我想提高我的溝通技巧", "我已經學了三年英語，因為我想提高我的溝通技巧"],
        wordMeanings: {
          "I": "我 (代名詞)",
          "have": "已經 (助動詞)",
          "been": "被 (助動詞)",
          "studying": "學習 (動名詞)",
          "English": "英語 (名詞)",
          "for": "為了 (介系詞)",
          "three": "三 (數詞)",
          "years": "年 (名詞)",
          "because": "因為 (連接詞)",
          "want": "想要 (動詞)",
          "to": "到 (不定詞標記)",
          "improve": "改善 (動詞)",
          "my": "我的 (代名詞)",
          "communication": "溝通 (名詞)",
          "skills": "技巧 (名詞)"
        }
      }
    }
  };

  let mockExercise: Exercise | undefined = mockSentences[sentenceLength]?.[difficulty];
  
  if (!mockExercise && mockSentences[sentenceLength]) {
    const difficultyOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3'];
    const currentIndex = difficultyOrder.indexOf(difficulty);
    
    for (let offset = 1; offset < difficultyOrder.length; offset++) {
      if (currentIndex - offset >= 0) {
        const lowerDifficulty = difficultyOrder[currentIndex - offset];
        if (mockSentences[sentenceLength][lowerDifficulty]) {
          mockExercise = mockSentences[sentenceLength][lowerDifficulty];
          break;
        }
      }
      if (currentIndex + offset < difficultyOrder.length) {
        const higherDifficulty = difficultyOrder[currentIndex + offset];
        if (mockSentences[sentenceLength][higherDifficulty]) {
          mockExercise = mockSentences[sentenceLength][higherDifficulty];
          break;
        }
      }
    }
  }
  
  if (!mockExercise) {
    const fallbackLengths = ['medium', 'short', 'long'];
    for (const fallbackLength of fallbackLengths) {
      if (mockSentences[fallbackLength]?.[difficulty]) {
        mockExercise = mockSentences[fallbackLength][difficulty];
        break;
      }
      if (mockSentences[fallbackLength]) {
        const difficultyOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3'];
        const currentIndex = difficultyOrder.indexOf(difficulty);
        for (let offset = 1; offset < difficultyOrder.length; offset++) {
          if (currentIndex - offset >= 0) {
            const lowerDifficulty = difficultyOrder[currentIndex - offset];
            if (mockSentences[fallbackLength][lowerDifficulty]) {
              mockExercise = mockSentences[fallbackLength][lowerDifficulty];
              break;
            }
          }
          if (currentIndex + offset < difficultyOrder.length) {
            const higherDifficulty = difficultyOrder[currentIndex + offset];
            if (mockSentences[fallbackLength][higherDifficulty]) {
              mockExercise = mockSentences[fallbackLength][higherDifficulty];
              break;
            }
          }
        }
        if (mockExercise) break;
      }
    }
  }
  
  if (!mockExercise) {
    mockExercise = mockSentences.medium?.A2 || mockSentences.short?.A1;
  }

  if (!mockExercise) {
    mockExercise = {
      sentence: "I love reading books",
      chunks: ["books", "reading books", "I love reading books"],
      translation: "我喜歡讀書",
      chunkTranslations: ["書", "讀書", "我喜歡讀書"],
      wordMeanings: {
        "I": "我 (代名詞)",
        "love": "喜歡 (動詞)",
        "reading": "閱讀 (動名詞)",
        "books": "書 (名詞)"
      }
    };
  }

  return mockExercise;
}

export async function POST(request: NextRequest) {
  try {
    const preferences: UserPreferences = await request.json();
    
    if (!preferences || typeof preferences !== 'object') {
      throw new Error("無效的偏好設定格式");
    }

    const difficulty = preferences.difficulty || 'A2';
    const sentenceLength = preferences.sentenceLength || 'medium';

    try {
      const dbExercise = await getRandomExercise(preferences);
      if (dbExercise) {
        console.log('從資料庫讀取題目');
        return NextResponse.json(dbExercise);
      }
    } catch (dbError) {
      console.warn('資料庫讀取錯誤，繼續使用 AI:', dbError);
    }

    console.log('資料庫沒有題目，調用 AI 生成');

    const prompt = buildPrompt(preferences);

    const fullPrompt = `You are an English teacher. Create a typing practice exercise.

${prompt}

Return ONLY valid JSON, no markdown or explanations.`;

    let response;
    let exercise: Exercise;
    
    try {
      response = await ai.models.generateContent({
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
      }
      
      if (!responseText) {
        throw new Error("無法從 API 回應中提取文字內容");
      }
      
      let jsonText = responseText.trim();
      
      const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                        jsonText.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      
      if (!jsonText || !jsonText.startsWith('{')) {
        throw new Error("AI回應格式不正確，無法解析JSON");
      }
      
      exercise = JSON.parse(jsonText);

      if (
        !exercise.sentence ||
        !exercise.chunks ||
        !exercise.translation ||
        !exercise.wordMeanings ||
        !exercise.chunkTranslations ||
        exercise.chunkTranslations.length !== exercise.chunks.length
      ) {
        throw new Error("AI回應格式不正確");
      }

      exerciseExists(exercise.sentence, difficulty, sentenceLength)
        .then(exists => {
          if (!exists) {
            saveExercise(exercise, preferences).catch(err => {
              console.error('儲存題目到資料庫失敗:', err);
            });
          } else {
            console.log('題目已存在，跳過儲存');
          }
        })
        .catch(err => {
          console.error('檢查題目是否存在時發生錯誤:', err);
        });

      return NextResponse.json(exercise);

    } catch (geminiError: any) {
      if (geminiError?.status === 429 || geminiError?.code === 'rate_limit_exceeded' || geminiError?.statusCode === 429) {
        console.warn("API rate limit 觸發，嘗試從資料庫讀取");
        
        try {
          const fallbackExercise = await getRandomExercise(preferences);
          if (fallbackExercise) {
            console.log('從資料庫讀取 fallback 題目');
            return NextResponse.json(fallbackExercise);
          }
        } catch (dbError) {
          console.warn('資料庫 fallback 讀取失敗:', dbError);
        }
        
        console.warn("資料庫也沒有題目，使用 mock 資料");
        const mockExercise = generateMockExercise(preferences);
        return NextResponse.json(mockExercise);
      }
      throw geminiError;
    }
  } catch (error: any) {
    console.error("生成題目錯誤:", error);
    
    if (error?.status === 429 || error?.statusCode === 429 || error?.code === 'rate_limit_exceeded') {
      const retryAfter = error?.retryAfter || error?.message?.match(/try again in ([\d.]+s)/)?.[1] || "幾分鐘";
      return NextResponse.json(
        { 
          error: `API 配額已用完，請稍後再試（約 ${retryAfter}）`,
          type: 'rate_limit',
          retryAfter 
        },
        { status: 429 }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : "生成題目失敗，請稍後再試";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

function buildPrompt(preferences: UserPreferences): string {
  const sentenceLength = preferences.sentenceLength || 
    (['short', 'medium', 'long'] as const)[Math.floor(Math.random() * 3)];
  
  const difficulty = preferences.difficulty || 
    (['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3'] as const)[Math.floor(Math.random() * 7)];

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
