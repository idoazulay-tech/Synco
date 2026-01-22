// Step 6: Commitment level detection

import type { CommitmentLevel } from '../types';
import { COMMITMENT_KEYWORDS } from '../rules/keywords';

export interface CommitmentResult {
  level: CommitmentLevel;
  confidence: number;
  matchedKeywords: string[];
}

export function detectCommitment(text: string): CommitmentResult {
  const normalizedText = text.toLowerCase();
  const matchedKeywords: string[] = [];
  
  let highScore = 0;
  let mediumScore = 0;
  let lowScore = 0;
  
  for (const kw of COMMITMENT_KEYWORDS.high) {
    if (normalizedText.includes(kw)) {
      highScore += 2;
      matchedKeywords.push(kw);
    }
  }
  
  for (const kw of COMMITMENT_KEYWORDS.medium) {
    if (normalizedText.includes(kw)) {
      mediumScore += 1.5;
      matchedKeywords.push(kw);
    }
  }
  
  for (const kw of COMMITMENT_KEYWORDS.low) {
    if (normalizedText.includes(kw)) {
      lowScore += 1.5;
      matchedKeywords.push(kw);
    }
  }
  
  let level: CommitmentLevel;
  let maxScore: number;
  
  if (highScore >= mediumScore && highScore >= lowScore) {
    level = 'high';
    maxScore = highScore;
  } else if (mediumScore >= lowScore) {
    level = 'medium';
    maxScore = mediumScore;
  } else if (lowScore > 0) {
    level = 'low';
    maxScore = lowScore;
  } else {
    level = 'medium';
    maxScore = 0;
  }
  
  const totalScore = highScore + mediumScore + lowScore;
  const confidence = totalScore > 0 ? Math.min(1, maxScore / totalScore) : 0.5;
  
  return { level, confidence, matchedKeywords };
}
