// DecisionLog Model - Records user decisions for pattern learning

import type { DecisionLog, ContextSnapshot } from '../types/learningTypes';

export function createDecisionLog(
  id: string,
  situationKey: string,
  primaryIntent: string,
  comparedItems: string[],
  userChoice: string,
  contextSnapshot: ContextSnapshot
): DecisionLog {
  return {
    id,
    tsIso: new Date().toISOString(),
    situationKey,
    primaryIntent,
    comparedItems,
    userChoice,
    contextSnapshot
  };
}

export function generateSituationKey(
  conflictType: string,
  itemA: string,
  itemB: string,
  context?: { urgency?: string; isReshuffle?: boolean }
): string {
  let key = `${conflictType}:${itemA} vs ${itemB}`;
  
  if (context?.isReshuffle) {
    key = `reshuffle:${context.urgency || 'normal'}:plans=A|B`;
  }
  
  return key;
}

export function extractContextSnapshot(
  cognitiveLoad: 'low' | 'medium' | 'high',
  urgencyLevels: Record<string, 'low' | 'medium' | 'high'>,
  mustLocks: string[],
  timeWindow: { startIso: string; endIso: string },
  isReshuffle: boolean = false,
  isFollowUp: boolean = false
): ContextSnapshot {
  return {
    cognitiveLoad,
    urgencyLevels,
    mustLocks,
    timeWindow,
    isReshuffle,
    isFollowUp
  };
}
