// Step 7: Cognitive load detection

import type { CognitiveLoad } from '../types';

export interface CognitiveLoadResult {
  level: CognitiveLoad;
  factors: CognitiveLoadFactors;
}

export interface CognitiveLoadFactors {
  textLength: number;
  commaCount: number;
  repetitionCount: number;
  topicSwitches: number;
  urgencyRepetitions: number;
}

export function detectCognitiveLoad(text: string): CognitiveLoadResult {
  const textLength = text.length;
  const commaCount = (text.match(/,/g) || []).length;
  
  const words = text.split(/\s+/);
  const wordFreq = new Map<string, number>();
  for (const word of words) {
    if (word.length > 2) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }
  const repetitionCount = Array.from(wordFreq.values()).filter(c => c > 1).length;
  
  const topicIndicators = ['גם', 'ועוד', 'בנוסף', 'חוץ מזה', 'ודבר נוסף'];
  const topicSwitches = topicIndicators.filter(ind => text.includes(ind)).length;
  
  const urgencyWords = ['דחוף', 'עכשיו', 'מייד', 'חייב'];
  const urgencyRepetitions = urgencyWords.reduce((count, word) => {
    const matches = text.match(new RegExp(word, 'g')) || [];
    return count + Math.max(0, matches.length - 1);
  }, 0);
  
  const factors: CognitiveLoadFactors = {
    textLength,
    commaCount,
    repetitionCount,
    topicSwitches,
    urgencyRepetitions
  };
  
  let score = 0;
  
  if (textLength > 100) score += 1;
  if (textLength > 200) score += 1;
  if (commaCount > 3) score += 1;
  if (repetitionCount > 2) score += 1;
  if (topicSwitches > 0) score += topicSwitches;
  if (urgencyRepetitions > 0) score += urgencyRepetitions * 2;
  
  let level: CognitiveLoad;
  if (score >= 4) {
    level = 'high';
  } else if (score >= 2) {
    level = 'medium';
  } else {
    level = 'low';
  }
  
  return { level, factors };
}
