// Anomaly Detector - Detects unusual patterns that may require confirmation

import type { ContextSnapshot, AnomalyFlags, DecisionLog, OutcomeLog } from '../types/learningTypes';
import { LEARNING_THRESHOLDS } from '../policies/thresholds';

export function detectAnomaly(
  currentContext: ContextSnapshot,
  recentOutcomes: OutcomeLog[] = [],
  recentDecisions: DecisionLog[] = []
): AnomalyFlags {
  const reasons: string[] = [];
  let confidenceModifier = 1.0;
  
  // Check cognitive load
  if (currentContext.cognitiveLoad === LEARNING_THRESHOLDS.HIGH_COGNITIVE_LOAD_THRESHOLD) {
    reasons.push('high_cognitive_load');
    confidenceModifier *= 0.9;
  }
  
  // Check excessive must locks
  if (currentContext.mustLocks.length >= LEARNING_THRESHOLDS.EXCESSIVE_MUST_LOCKS) {
    reasons.push('excessive_must_locks');
    confidenceModifier *= 0.85;
  }
  
  // Check for unusual urgency patterns
  const highUrgencyCount = Object.values(currentContext.urgencyLevels)
    .filter(u => u === 'high').length;
  if (highUrgencyCount >= 3) {
    reasons.push('multiple_high_urgency_tasks');
    confidenceModifier *= 0.8;
  }
  
  // Check recent cancellations
  const recentCancellations = recentOutcomes.filter(
    o => !o.success || o.userFeedback === 'wrong'
  ).length;
  if (recentCancellations >= LEARNING_THRESHOLDS.EXCESSIVE_CANCELLATIONS) {
    reasons.push('excessive_recent_cancellations');
    confidenceModifier *= 0.75;
  }
  
  // Check for stress feedback
  const stressCount = recentOutcomes.filter(o => o.userFeedback === 'stress').length;
  if (stressCount >= 2) {
    reasons.push('user_showing_stress');
    confidenceModifier *= 0.7;
  }
  
  // Check for reshuffle context (always warrants extra caution)
  if (currentContext.isReshuffle) {
    reasons.push('reshuffle_in_progress');
    confidenceModifier *= 0.95;
  }
  
  const isAnomaly = reasons.length > 0;
  
  return {
    isAnomaly,
    reasons,
    shouldAskForConfirmation: isAnomaly && confidenceModifier < 0.85,
    confidenceModifier
  };
}

export function getAnomalySeverity(flags: AnomalyFlags): 'low' | 'medium' | 'high' {
  if (!flags.isAnomaly) return 'low';
  
  if (flags.confidenceModifier < 0.7) return 'high';
  if (flags.confidenceModifier < 0.85) return 'medium';
  return 'low';
}

export function shouldOverrideAutoApply(
  flags: AnomalyFlags,
  ruleConfidence: number
): boolean {
  // Even high confidence rules should ask for confirmation during anomalies
  if (flags.confidenceModifier < 0.75) {
    return true;
  }
  
  // For moderate anomalies, override if rule confidence is not very high
  if (flags.confidenceModifier < 0.9 && ruleConfidence < 0.9) {
    return true;
  }
  
  return false;
}

export function combineAnomalyFlags(flags: AnomalyFlags[]): AnomalyFlags {
  if (flags.length === 0) {
    return {
      isAnomaly: false,
      reasons: [],
      shouldAskForConfirmation: false,
      confidenceModifier: 1.0
    };
  }
  
  const allReasons = flags.flatMap(f => f.reasons);
  const uniqueReasons = [...new Set(allReasons)];
  
  // Multiply confidence modifiers
  const combinedModifier = flags.reduce(
    (acc, f) => acc * f.confidenceModifier,
    1.0
  );
  
  return {
    isAnomaly: flags.some(f => f.isAnomaly),
    reasons: uniqueReasons,
    shouldAskForConfirmation: flags.some(f => f.shouldAskForConfirmation),
    confidenceModifier: combinedModifier
  };
}
