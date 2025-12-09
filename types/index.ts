// 題目資料結構
export interface Exercise {
  sentence: string; // 完整句子
  chunks: string[]; // 從小到大的chunk陣列
  translation: string; // 繁體中文翻譯
  wordMeanings: Record<string, string>; // 單字解釋
}

// 使用者選擇的條件
export interface UserPreferences {
  topics: string[]; // 主題（可多選）
  sentenceLength: 'short' | 'medium' | 'long'; // 句子長度
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1'; // CEFR難度
  sentenceTypes: string[]; // 句型偏好（可多選）
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

