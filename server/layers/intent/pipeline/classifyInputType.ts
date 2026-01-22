// Step 3: Input type classification

import type { InputType } from '../types';
import { INPUT_TYPE_PATTERNS } from '../rules/patterns';
import { 
  COMMAND_KEYWORDS, 
  THOUGHT_KEYWORDS, 
  QUESTION_KEYWORDS,
  CORRECTION_KEYWORDS,
  EMOTIONAL_KEYWORDS 
} from '../rules/keywords';

export interface InputTypeResult {
  type: InputType;
  confidence: number;
  matchedPatterns: string[];
  matchedKeywords: string[];
}

export function classifyInputType(text: string): InputTypeResult {
  const normalizedText = text.trim().toLowerCase();
  const matchedPatterns: string[] = [];
  const matchedKeywords: string[] = [];
  
  const scores: Record<InputType, number> = {
    command: 0,
    thought: 0,
    question: 0,
    correction: 0,
    emotional_dump: 0
  };
  
  for (const pattern of INPUT_TYPE_PATTERNS.command) {
    if (pattern.test(text)) {
      scores.command += 2;
      matchedPatterns.push(`command:${pattern.source}`);
    }
  }
  
  for (const pattern of INPUT_TYPE_PATTERNS.thought) {
    if (pattern.test(text)) {
      scores.thought += 2;
      matchedPatterns.push(`thought:${pattern.source}`);
    }
  }
  
  for (const pattern of INPUT_TYPE_PATTERNS.question) {
    if (pattern.test(text)) {
      scores.question += 2;
      matchedPatterns.push(`question:${pattern.source}`);
    }
  }
  
  for (const pattern of INPUT_TYPE_PATTERNS.correction) {
    if (pattern.test(text)) {
      scores.correction += 2;
      matchedPatterns.push(`correction:${pattern.source}`);
    }
  }
  
  for (const pattern of INPUT_TYPE_PATTERNS.emotional_dump) {
    if (pattern.test(text)) {
      scores.emotional_dump += 2;
      matchedPatterns.push(`emotional:${pattern.source}`);
    }
  }
  
  for (const kw of COMMAND_KEYWORDS) {
    if (normalizedText.includes(kw)) {
      scores.command += 1;
      matchedKeywords.push(kw);
    }
  }
  
  for (const kw of THOUGHT_KEYWORDS) {
    if (normalizedText.includes(kw)) {
      scores.thought += 1;
      matchedKeywords.push(kw);
    }
  }
  
  for (const kw of QUESTION_KEYWORDS) {
    if (normalizedText.includes(kw)) {
      scores.question += 1;
      matchedKeywords.push(kw);
    }
  }
  
  for (const kw of CORRECTION_KEYWORDS) {
    if (normalizedText.includes(kw)) {
      scores.correction += 1.5;
      matchedKeywords.push(kw);
    }
  }
  
  for (const kw of EMOTIONAL_KEYWORDS) {
    if (normalizedText.includes(kw)) {
      scores.emotional_dump += 1.5;
      matchedKeywords.push(kw);
    }
  }
  
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 15 && scores.emotional_dump > 0) {
    scores.emotional_dump += 1;
  }
  
  let maxType: InputType = 'command';
  let maxScore = 0;
  
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxType = type as InputType;
    }
  }
  
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.min(1, maxScore / Math.max(totalScore, 3)) : 0.5;
  
  return {
    type: maxType,
    confidence,
    matchedPatterns,
    matchedKeywords
  };
}
