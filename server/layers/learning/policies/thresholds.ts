// Thresholds Policy - Configurable thresholds for learning engine

export const LEARNING_THRESHOLDS = {
  // Pattern detection thresholds
  MIN_OBSERVATIONS_FOR_PATTERN: 3,
  MIN_CONFIDENCE_FOR_PROPOSAL: 0.75,
  
  // Rule management thresholds
  PAUSE_RULE_CONFIDENCE: 0.4,
  REACTIVATE_RULE_MATCHES: 3,
  
  // Confidence adjustment amounts
  CONFIDENCE_INCREMENT: 0.05,
  CONFIDENCE_DECREMENT: 0.1,
  ANOMALY_DECAY_FACTOR: 0.8,
  TIME_DECAY_RATE_PER_DAY: 0.01,
  
  // Proposal thresholds
  MAX_DECLINED_BEFORE_SUPPRESS: 2,
  DECLINED_COOLDOWN_DAYS: 7,
  
  // Anomaly detection thresholds
  HIGH_COGNITIVE_LOAD_THRESHOLD: 'high',
  EXCESSIVE_MUST_LOCKS: 3,
  EXCESSIVE_CANCELLATIONS: 2,
  
  // Auto-apply thresholds
  AUTO_APPLY_MIN_CONFIDENCE: 0.8,
  CONFIRM_REQUIRED_CONFIDENCE: 0.6
} as const;

export type LearningThresholds = typeof LEARNING_THRESHOLDS;

export function getThreshold<K extends keyof LearningThresholds>(
  key: K
): LearningThresholds[K] {
  return LEARNING_THRESHOLDS[key];
}

export function shouldAutoApply(confidence: number, isAnomaly: boolean): boolean {
  return confidence >= LEARNING_THRESHOLDS.AUTO_APPLY_MIN_CONFIDENCE && !isAnomaly;
}

export function shouldAskConfirmation(confidence: number, isAnomaly: boolean): boolean {
  if (isAnomaly) return true;
  return confidence >= LEARNING_THRESHOLDS.CONFIRM_REQUIRED_CONFIDENCE && 
         confidence < LEARNING_THRESHOLDS.AUTO_APPLY_MIN_CONFIDENCE;
}
