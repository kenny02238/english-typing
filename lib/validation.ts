import { ValidationResult } from '@/types';

/**
 * 驗證使用者輸入
 * @param userInput 使用者輸入的單字陣列
 * @param correctAnswer 正確答案的單字陣列
 * @returns 驗證結果陣列
 */
export function validateInput(
  userInput: string[],
  correctAnswer: string[]
): ValidationResult[] {
  return userInput.map((word, index) => {
    const correct = correctAnswer[index] || '';
    const isCorrect = word.toLowerCase().trim() === correct.toLowerCase().trim();
    
    return {
      word,
      isCorrect,
      correctWord: correct,
    };
  });
}

/**
 * 將句子拆分為單字陣列
 * @param sentence 完整句子
 * @returns 單字陣列
 */
export function splitIntoWords(sentence: string): string[] {
  return sentence.trim().split(/\s+/);
}

/**
 * 檢查是否全部正確
 * @param validationResults 驗證結果陣列
 * @returns 是否全部正確
 */
export function isAllCorrect(validationResults: ValidationResult[]): boolean {
  return validationResults.every(result => result.isCorrect);
}

