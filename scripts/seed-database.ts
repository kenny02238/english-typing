import ai from '../lib/gemini';
import { saveExercise, initDatabase, getExerciseStats } from '../lib/db';
import { UserPreferences, Exercise } from '../types';

// 從 route.ts 匯入 buildPrompt（需要複製過來或改為獨立模組）
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

const DIFFICULTIES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3'] as const;
const SENTENCE_LENGTHS = ['short', 'medium', 'long'] as const;
const TOPICS = [
  ['旅遊'],
  ['餐廳'],
  ['商務'],
  ['日常生活'],
  ['情緒表達'],
  ['購物'],
  ['健康醫療'],
  ['科技'],
];

// 每種組合生成多少題（平均分配）
const EXERCISES_PER_COMBINATION = 20; // 總共約 21 * 8 * 20 = 3,360 題

async function generateExercise(preferences: UserPreferences): Promise<Exercise | null> {
  try {
    const prompt = buildPrompt(preferences);
    const fullPrompt = `You are an English teacher. Create a typing practice exercise.

${prompt}

Return ONLY valid JSON, no markdown or explanations.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });

    const responseText = response?.text || response?.response?.text || "";
    let jsonText = responseText.trim();
    
    const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                      jsonText.match(/(\{[\s\S]*\})/);
    
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }
    
    if (!jsonText || !jsonText.startsWith('{')) {
      throw new Error("無法解析JSON");
    }
    
    const exercise: Exercise = JSON.parse(jsonText);

    // 驗證格式
    if (
      !exercise.sentence ||
      !exercise.chunks ||
      !exercise.translation ||
      !exercise.wordMeanings ||
      !exercise.chunkTranslations
    ) {
      throw new Error("格式不正確");
    }

    return exercise;
  } catch (error) {
    console.error('生成題目錯誤:', error);
    return null;
  }
}

async function seedDatabase() {
  console.log('開始初始化資料庫...');
  try {
    await initDatabase();
  } catch (error) {
    console.error('資料庫初始化失敗:', error);
    console.log('繼續執行（可能資料表已存在）...');
  }
  
  let totalGenerated = 0;
  let totalSaved = 0;
  let totalSkipped = 0;

  for (const difficulty of DIFFICULTIES) {
    for (const sentenceLength of SENTENCE_LENGTHS) {
      for (const topics of TOPICS) {
        const combination = `${difficulty}-${sentenceLength}-${topics.join(',')}`;
        console.log(`\n處理組合: ${combination}`);
        
        let generated = 0;
        let saved = 0;
        let skipped = 0;

        for (let i = 0; i < EXERCISES_PER_COMBINATION; i++) {
          try {
            const preferences: UserPreferences = {
              difficulty,
              sentenceLength,
              topics,
            };

            const exercise = await generateExercise(preferences);
            
            if (exercise) {
              totalGenerated++;
              generated++;
              
              const wasSaved = await saveExercise(exercise, preferences);
              if (wasSaved) {
                totalSaved++;
                saved++;
              } else {
                totalSkipped++;
                skipped++;
              }
              
              process.stdout.write(`\r進度: ${i + 1}/${EXERCISES_PER_COMBINATION} (已生成: ${generated}, 已儲存: ${saved}, 跳過: ${skipped})`);
            }

            // 避免 rate limit，每次請求間隔 300ms（Gemini 免費額度較低）
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) {
            console.error(`\n錯誤:`, error);
          }
        }
        
        console.log(`\n✓ ${combination}: 生成 ${generated}, 儲存 ${saved}, 跳過 ${skipped}`);
      }
    }
  }

  console.log(`\n\n=== 完成統計 ===`);
  console.log(`總生成: ${totalGenerated}`);
  console.log(`總儲存: ${totalSaved}`);
  console.log(`總跳過: ${totalSkipped}`);

  // 顯示統計
  try {
    const stats = await getExerciseStats();
    console.log(`\n=== 題庫統計 ===`);
    Object.entries(stats).forEach(([key, count]) => {
      console.log(`${key}: ${count} 題`);
    });
  } catch (error) {
    console.error('獲取統計失敗:', error);
  }
}

// 執行
seedDatabase().catch(console.error);

