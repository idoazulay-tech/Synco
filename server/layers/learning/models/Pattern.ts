// Pattern Model - Detected behavioral patterns from decision logs

import type { Pattern, RuleType } from '../types/learningTypes';

export function createPattern(
  id: string,
  situationKey: string,
  patternType: RuleType,
  initialChoice: string
): Pattern {
  const now = new Date().toISOString();
  return {
    id,
    situationKey,
    patternType,
    observationCount: 1,
    dominantChoice: initialChoice,
    choiceDistribution: { [initialChoice]: 1 },
    firstSeenIso: now,
    lastSeenIso: now,
    confidence: 1 // First observation is 100% confidence
  };
}

export function updatePattern(
  pattern: Pattern,
  newChoice: string
): Pattern {
  const newDistribution = { ...pattern.choiceDistribution };
  newDistribution[newChoice] = (newDistribution[newChoice] || 0) + 1;
  
  const newCount = pattern.observationCount + 1;
  
  // Find dominant choice
  let maxCount = 0;
  let dominant = pattern.dominantChoice;
  for (const [choice, count] of Object.entries(newDistribution)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = choice;
    }
  }
  
  // Calculate confidence as ratio of dominant choice
  const confidence = maxCount / newCount;
  
  return {
    ...pattern,
    observationCount: newCount,
    choiceDistribution: newDistribution,
    dominantChoice: dominant,
    lastSeenIso: new Date().toISOString(),
    confidence
  };
}

export function isPatternReadyForRule(
  pattern: Pattern,
  minObservations: number,
  minConfidence: number
): boolean {
  return pattern.observationCount >= minObservations && pattern.confidence >= minConfidence;
}

export function getPatternStrength(pattern: Pattern): 'weak' | 'moderate' | 'strong' {
  if (pattern.confidence >= 0.8 && pattern.observationCount >= 5) return 'strong';
  if (pattern.confidence >= 0.6 && pattern.observationCount >= 3) return 'moderate';
  return 'weak';
}
