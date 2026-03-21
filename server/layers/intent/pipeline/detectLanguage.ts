// Step 2: Language detection

import type { Language } from '../types';

export interface LanguageResult {
  primary: Language;
  hebrewRatio: number;
  englishRatio: number;
}

export function detectLanguage(text: string): LanguageResult {
  const hebrewPattern = /[\u0590-\u05FF]/g;
  const englishPattern = /[a-zA-Z]/g;
  
  const hebrewMatches = text.match(hebrewPattern) || [];
  const englishMatches = text.match(englishPattern) || [];
  
  const totalLetters = hebrewMatches.length + englishMatches.length;
  
  if (totalLetters === 0) {
    return { primary: 'he', hebrewRatio: 0, englishRatio: 0 };
  }
  
  const hebrewRatio = hebrewMatches.length / totalLetters;
  const englishRatio = englishMatches.length / totalLetters;
  
  let primary: Language;
  if (hebrewRatio > 0.8) {
    primary = 'he';
  } else if (englishRatio > 0.8) {
    primary = 'en';
  } else {
    primary = 'mixed';
  }
  
  return { primary, hebrewRatio, englishRatio };
}
