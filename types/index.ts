// 題目資料結構
export interface Exercise {
  sentence: string; // 完整句子
  chunks: string[]; // 從小到大的chunk陣列
  translation: string; // 完整句子的繁體中文翻譯
  chunkTranslations: string[]; // 每個chunk的繁體中文翻譯（與chunks對應）
  wordMeanings: Record<string, string>; // 單字解釋
}

// 使用者選擇的條件
export interface UserPreferences {
  topics: string[]; // 主題（可多選）
  sentenceLength?: 'short' | 'medium' | 'long'; // 句子長度（可選，未選則隨機）
  difficulty?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'C3'; // CEFR難度（可選，未選則隨機）
  customSentence?: string; // 自訂題目（可選，如果沒有則隨機生成）
}

// 輸入驗證結果
export interface ValidationResult {
  word: string; // 使用者輸入的單字
  isCorrect: boolean; // 是否正確
  correctWord: string; // 正確答案
}

// 練習狀態
export interface PracticeState {
  currentExercise: Exercise | null; // 當前題目
  currentChunkIndex: number; // 當前chunk索引
  userInput: string[]; // 使用者輸入陣列
  validationResults: ValidationResult[]; // 驗證結果
  showResult: boolean; // 是否顯示結果（翻譯與解釋）
}

