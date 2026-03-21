// Step 9: Confidence score computation

import type { ExtractedEntities, PrimaryIntent } from '../types';
import { computeScore, ScoringFactors, ENTITY_REQUIREMENTS } from '../rules/scoring';

export interface ConfidenceResult {
  score: number;
  factors: ScoringFactors;
}

export function computeConfidence(
  inputTypeConfidence: number,
  intentConfidence: number,
  intent: PrimaryIntent,
  entities: ExtractedEntities,
  missingCritical: string[],
  isFollowUp: boolean
): ConfidenceResult {
  const required = ENTITY_REQUIREMENTS[intent] || [];
  const totalExpected = required.length;
  
  let entitiesFound = 0;
  for (const field of required) {
    if (hasEntity(entities, field)) {
      entitiesFound++;
    }
  }
  
  const factors: ScoringFactors = {
    inputTypeConfidence,
    intentConfidence,
    entitiesFound,
    totalExpectedEntities: totalExpected,
    missingCriticalInfo: missingCritical.length,
    hasConflicts: false,
    isFollowUp
  };
  
  const score = computeScore(factors);
  
  return { score, factors };
}

function hasEntity(entities: ExtractedEntities, field: string): boolean {
  switch (field) {
    case 'time':
      return entities.time.confidence > 0;
    case 'date':
      return entities.date.confidence > 0;
    case 'duration':
      return entities.duration.confidence > 0;
    case 'people':
      return entities.people.normalized.length > 0;
    case 'location':
      return entities.location.confidence > 0;
    case 'taskName':
      return entities.taskName.confidence > 0;
    default:
      return false;
  }
}
