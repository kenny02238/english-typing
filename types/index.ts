export interface Exercise {
  sentence: string;
  chunks: string[];
  translation: string;
  chunkTranslations: string[];
  wordMeanings: Record<string, string>;
}

export interface UserPreferences {
  topics: string[];
  sentenceLength?: 'short' | 'medium' | 'long';
  difficulty?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'C3';
  customSentence?: string;
}

export interface ValidationResult {
  word: string;
  isCorrect: boolean;
  correctWord: string;
}

export interface PracticeState {
  currentExercise: Exercise | null;
  currentChunkIndex: number;
  userInput: string[];
  validationResults: ValidationResult[];
  showResult: boolean;
}

