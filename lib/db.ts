import { sql } from '@vercel/postgres';
import { Exercise, UserPreferences } from '@/types';

// 初始化資料表（只需要執行一次）
export async function initDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS exercises (
        id SERIAL PRIMARY KEY,
        sentence TEXT NOT NULL,
        chunks TEXT NOT NULL,
        translation TEXT NOT NULL,
        chunk_translations TEXT NOT NULL,
        word_meanings TEXT NOT NULL,
        difficulty VARCHAR(10) NOT NULL,
        sentence_length VARCHAR(20) NOT NULL,
        topics TEXT NOT NULL,
        used_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(sentence, difficulty, sentence_length)
      );
      
      CREATE INDEX IF NOT EXISTS idx_difficulty_length 
        ON exercises(difficulty, sentence_length);
      
      CREATE INDEX IF NOT EXISTS idx_used_count 
        ON exercises(used_count);
    `;
    console.log('資料表初始化成功');
  } catch (error) {
    console.error('資料表初始化錯誤:', error);
    throw error;
  }
}

// 儲存題目到資料庫
export async function saveExercise(
  exercise: Exercise,
  preferences: UserPreferences
): Promise<boolean> {
  try {
    // 檢查是否已存在相同題目
    const existing = await sql`
      SELECT id FROM exercises 
      WHERE sentence = ${exercise.sentence}
        AND difficulty = ${preferences.difficulty || 'A2'}
        AND sentence_length = ${preferences.sentenceLength || 'medium'}
      LIMIT 1
    `;

    if (existing.rows.length > 0) {
      console.log('題目已存在，跳過儲存');
      return false;
    }

    await sql`
      INSERT INTO exercises 
      (sentence, chunks, translation, chunk_translations, word_meanings,
       difficulty, sentence_length, topics)
      VALUES (
        ${exercise.sentence},
        ${JSON.stringify(exercise.chunks)},
        ${exercise.translation},
        ${JSON.stringify(exercise.chunkTranslations)},
        ${JSON.stringify(exercise.wordMeanings)},
        ${preferences.difficulty || 'A2'},
        ${preferences.sentenceLength || 'medium'},
        ${JSON.stringify(preferences.topics || [])}
      )
    `;
    return true;
  } catch (error) {
    console.error('儲存題目錯誤:', error);
    return false;
  }
}

// 從資料庫獲取隨機題目
export async function getRandomExercise(
  preferences: UserPreferences
): Promise<Exercise | null> {
  try {
    const difficulty = preferences.difficulty || 'A2';
    const sentenceLength = preferences.sentenceLength || 'medium';
    const topics = preferences.topics || [];

    // 構建查詢條件
    let result;
    
    // 先查詢符合難度和長度的題目（不限制主題，因為主題匹配較複雜）
    // 主題匹配可以在應用層處理，或使用更簡單的方式
    result = await sql`
      SELECT * FROM exercises 
      WHERE difficulty = ${difficulty}
        AND sentence_length = ${sentenceLength}
      ORDER BY used_count ASC, RANDOM()
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // 更新使用次數
    await sql`
      UPDATE exercises 
      SET used_count = used_count + 1 
      WHERE id = ${row.id}
    `;

    // 轉換為 Exercise 格式
    return {
      sentence: row.sentence,
      chunks: JSON.parse(row.chunks),
      translation: row.translation,
      chunkTranslations: JSON.parse(row.chunk_translations),
      wordMeanings: JSON.parse(row.word_meanings),
    };
  } catch (error) {
    console.error('獲取題目錯誤:', error);
    return null;
  }
}

// 獲取題目數量統計
export async function getExerciseStats(): Promise<Record<string, number>> {
  try {
    const result = await sql`
      SELECT difficulty, sentence_length, COUNT(*) as count
      FROM exercises
      GROUP BY difficulty, sentence_length
    `;

    const stats: Record<string, number> = {};
    result.rows.forEach((row) => {
      const key = `${row.difficulty}-${row.sentence_length}`;
      stats[key] = parseInt(row.count as string);
    });

    return stats;
  } catch (error) {
    console.error('獲取統計錯誤:', error);
    return {};
  }
}

// 檢查題目是否存在
export async function exerciseExists(
  sentence: string,
  difficulty: string,
  sentenceLength: string
): Promise<boolean> {
  try {
    const result = await sql`
      SELECT id FROM exercises 
      WHERE sentence = ${sentence}
        AND difficulty = ${difficulty}
        AND sentence_length = ${sentenceLength}
      LIMIT 1
    `;
    return result.rows.length > 0;
  } catch (error) {
    return false;
  }
}

