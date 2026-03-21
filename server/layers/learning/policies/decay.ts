// Decay Policy - Manages confidence decay over time and events

import { LEARNING_THRESHOLDS } from './thresholds';

export interface DecayResult {
  newConfidence: number;
  shouldPause: boolean;
  reason: string;
}

export function calculateEventDecay(
  currentConfidence: number,
  isMatch: boolean
): DecayResult {
  if (isMatch) {
    const newConfidence = Math.min(1, currentConfidence + LEARNING_THRESHOLDS.CONFIDENCE_INCREMENT);
    return {
      newConfidence,
      shouldPause: false,
      reason: 'behavior_matched_rule'
    };
  } else {
    const newConfidence = Math.max(0, currentConfidence - LEARNING_THRESHOLDS.CONFIDENCE_DECREMENT);
    return {
      newConfidence,
      shouldPause: newConfidence < LEARNING_THRESHOLDS.PAUSE_RULE_CONFIDENCE,
      reason: 'behavior_deviated_from_rule'
    };
  }
}

export function calculateTimeDecay(
  currentConfidence: number,
  daysSinceLastUse: number
): DecayResult {
  const decay = daysSinceLastUse * LEARNING_THRESHOLDS.TIME_DECAY_RATE_PER_DAY;
  const newConfidence = Math.max(0, currentConfidence - decay);
  
  return {
    newConfidence,
    shouldPause: newConfidence < LEARNING_THRESHOLDS.PAUSE_RULE_CONFIDENCE,
    reason: `time_decay_after_${daysSinceLastUse}_days`
  };
}

export function calculateAnomalyDecay(
  currentConfidence: number,
  anomalySeverity: 'low' | 'medium' | 'high'
): DecayResult {
  const severityFactors: Record<string, number> = {
    low: 0.95,
    medium: LEARNING_THRESHOLDS.ANOMALY_DECAY_FACTOR,
    high: 0.6
  };
  
  const factor = severityFactors[anomalySeverity];
  const newConfidence = currentConfidence * factor;
  
  return {
    newConfidence,
    shouldPause: false, // Anomaly decay is temporary, don't pause
    reason: `anomaly_${anomalySeverity}_detected`
  };
}

export function shouldSuppressProposal(
  declinedCount: number,
  lastDeclinedIso: string | null
): boolean {
  if (declinedCount >= LEARNING_THRESHOLDS.MAX_DECLINED_BEFORE_SUPPRESS) {
    if (!lastDeclinedIso) return true;
    
    const daysSinceDeclined = Math.floor(
      (Date.now() - new Date(lastDeclinedIso).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceDeclined < LEARNING_THRESHOLDS.DECLINED_COOLDOWN_DAYS;
  }
  return false;
}
