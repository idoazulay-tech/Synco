// Confidence scoring weights and calculation

export interface ScoringWeights {
  inputTypeMatch: number;
  intentMatch: number;
  entityPresence: number;
  missingInfoPenalty: number;
  conflictPenalty: number;
  followUpBonus: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  inputTypeMatch: 0.2,
  intentMatch: 0.25,
  entityPresence: 0.3,
  missingInfoPenalty: 0.1,
  conflictPenalty: 0.15,
  followUpBonus: 0.1
};

export interface ScoringFactors {
  inputTypeConfidence: number;
  intentConfidence: number;
  entitiesFound: number;
  totalExpectedEntities: number;
  missingCriticalInfo: number;
  hasConflicts: boolean;
  isFollowUp: boolean;
}

export function computeScore(factors: ScoringFactors, weights: ScoringWeights = DEFAULT_WEIGHTS): number {
  let score = 0;
  
  score += factors.inputTypeConfidence * weights.inputTypeMatch;
  score += factors.intentConfidence * weights.intentMatch;
  
  if (factors.totalExpectedEntities > 0) {
    const entityRatio = factors.entitiesFound / factors.totalExpectedEntities;
    score += entityRatio * weights.entityPresence;
  } else {
    score += weights.entityPresence;
  }
  
  score -= factors.missingCriticalInfo * weights.missingInfoPenalty;
  
  if (factors.hasConflicts) {
    score -= weights.conflictPenalty;
  }
  
  if (factors.isFollowUp) {
    score += weights.followUpBonus;
  }
  
  return Math.max(0, Math.min(1, score));
}

export const ENTITY_REQUIREMENTS: Record<string, string[]> = {
  create_event: ['date', 'time', 'taskName'],
  create_task: ['taskName'],
  reschedule: ['taskName'],
  cancel: ['taskName'],
  inquire: [],
  log_note: [],
  complete_task: ['taskName'],
  decompose_task: ['taskName'],
  journal_entry: [],
  set_constraint: [],
  manage_day: [],
  unknown: []
};

export const RECOMMENDED_ENTITIES: Record<string, string[]> = {
  create_event: ['people', 'location', 'duration'],
  create_task: ['duration', 'date', 'urgency'],
  reschedule: ['date', 'time'],
  cancel: [],
  inquire: ['date'],
  log_note: [],
  complete_task: [],
  decompose_task: [],
  journal_entry: [],
  set_constraint: ['time', 'date'],
  manage_day: ['date'],
  unknown: []
};
