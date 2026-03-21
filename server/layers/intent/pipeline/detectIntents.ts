// Step 4: Intent detection

import type { PrimaryIntent } from '../types';
import { INTENT_PATTERNS } from '../rules/patterns';

export interface IntentResult {
  primary: PrimaryIntent;
  secondary: PrimaryIntent[];
  confidence: number;
  matchedPatterns: string[];
}

export function detectIntents(text: string): IntentResult {
  const matchedPatterns: string[] = [];
  const scores: Record<PrimaryIntent, number> = {
    create_task: 0,
    create_event: 0,
    reschedule: 0,
    cancel: 0,
    inquire: 0,
    log_note: 0,
    complete_task: 0,
    decompose_task: 0,
    journal_entry: 0,
    set_constraint: 0,
    manage_day: 0,
    unknown: 0
  };
  
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        scores[intent as PrimaryIntent] += 2;
        matchedPatterns.push(`${intent}:${pattern.source}`);
      }
    }
  }
  
  const sortedIntents = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);
  
  let primary: PrimaryIntent = 'unknown';
  const secondary: PrimaryIntent[] = [];
  let confidence = 0.5;
  
  if (sortedIntents.length > 0) {
    primary = sortedIntents[0][0] as PrimaryIntent;
    const maxScore = sortedIntents[0][1];
    
    for (let i = 1; i < sortedIntents.length && i < 3; i++) {
      secondary.push(sortedIntents[i][0] as PrimaryIntent);
    }
    
    const totalScore = sortedIntents.reduce((sum, [, score]) => sum + score, 0);
    confidence = Math.min(1, maxScore / Math.max(totalScore, 2));
  }
  
  return {
    primary,
    secondary,
    confidence,
    matchedPatterns
  };
}
