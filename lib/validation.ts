import { ValidationResult } from '@/types';

export function validateInput(
  userInput: string[],
  correctAnswer: string[]
): ValidationResult[] {
  return correctAnswer.map((correct, index) => {
    const userWord = userInput[index] || '';
    const isCorrect = userWord.toLowerCase().trim() === correct.toLowerCase().trim() && userWord.trim() !== '';
    
    return {
      word: userWord,
      isCorrect,
      correctWord: correct,
    };
  });
}

export function splitIntoWords(sentence: string): string[] {
  return sentence.trim().split(/\s+/);
}

export function isAllCorrect(validationResults: ValidationResult[]): boolean {
  return validationResults.every(result => result.isCorrect);
}

