import { sql } from '@vercel/postgres';
import { Exercise, UserPreferences } from '@/types';

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

export async function saveExercise(
  exercise: Exercise,
  preferences: UserPreferences
): Promise<boolean> {
  try {
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

export async function getRandomExercise(
  preferences: UserPreferences
): Promise<Exercise | null> {
  try {
    const difficulty = preferences.difficulty || 'A2';
    const sentenceLength = preferences.sentenceLength || 'medium';
    const topics = preferences.topics || [];

    let result;
    
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

    await sql`
      UPDATE exercises 
      SET used_count = used_count + 1 
      WHERE id = ${row.id}
    `;

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

