// Outcome Collector - Collects task outcomes for learning

import type { OutcomeLog, OutcomeFeedback } from '../types/learningTypes';

let outcomeIdCounter = 0;

export function generateOutcomeId(): string {
  return `out_${Date.now()}_${++outcomeIdCounter}`;
}

export function collectOutcome(
  actionType: string,
  success: boolean,
  durationPlannedMinutes: number,
  durationActualMinutes: number | null = null,
  userFeedback: OutcomeFeedback | null = null,
  notes: string = ''
): OutcomeLog {
  return {
    id: generateOutcomeId(),
    tsIso: new Date().toISOString(),
    actionType,
    success,
    durationPlannedMinutes,
    durationActualMinutes,
    userFeedback,
    notes
  };
}

export function calculateDurationAccuracy(
  planned: number,
  actual: number | null
): number | null {
  if (actual === null) return null;
  if (planned === 0) return actual === 0 ? 1 : 0;
  return 1 - Math.abs(planned - actual) / planned;
}

export function inferFeedbackFromDuration(
  planned: number,
  actual: number
): OutcomeFeedback {
  const ratio = actual / planned;
  
  if (ratio <= 1.1) return 'ok';
  if (ratio <= 1.5) return 'too_slow';
  return 'stress';
}

export function shouldCollectOutcome(actionType: string): boolean {
  const outcomeActions = ['mark_done', 'cancel', 'complete_task'];
  return outcomeActions.includes(actionType);
}

export function aggregateOutcomes(outcomes: OutcomeLog[]): {
  successRate: number;
  avgDurationAccuracy: number;
  feedbackDistribution: Record<OutcomeFeedback, number>;
} {
  if (outcomes.length === 0) {
    return {
      successRate: 0,
      avgDurationAccuracy: 0,
      feedbackDistribution: { ok: 0, too_slow: 0, wrong: 0, stress: 0 }
    };
  }
  
  const successCount = outcomes.filter(o => o.success).length;
  const successRate = successCount / outcomes.length;
  
  const accuracies = outcomes
    .map(o => calculateDurationAccuracy(o.durationPlannedMinutes, o.durationActualMinutes))
    .filter((a): a is number => a !== null);
  
  const avgDurationAccuracy = accuracies.length > 0
    ? accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length
    : 0;
  
  const feedbackDistribution: Record<OutcomeFeedback, number> = {
    ok: 0, too_slow: 0, wrong: 0, stress: 0
  };
  
  for (const outcome of outcomes) {
    if (outcome.userFeedback) {
      feedbackDistribution[outcome.userFeedback]++;
    }
  }
  
  return { successRate, avgDurationAccuracy, feedbackDistribution };
}
