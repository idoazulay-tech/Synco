// Decision Collector - Collects user decisions for pattern learning

import type { DecisionLog, ContextSnapshot } from '../types/learningTypes';
import { createDecisionLog, generateSituationKey } from '../models/DecisionLog';

let decisionIdCounter = 0;

export function generateDecisionId(): string {
  return `dec_${Date.now()}_${++decisionIdCounter}`;
}

export function collectDecision(
  primaryIntent: string,
  comparedItems: string[],
  userChoice: string,
  contextSnapshot: ContextSnapshot,
  conflictType: string = 'conflict'
): DecisionLog {
  const id = generateDecisionId();
  
  // Generate situation key based on conflict type and items
  let situationKey: string;
  if (contextSnapshot.isReshuffle) {
    const urgency = Object.values(contextSnapshot.urgencyLevels)[0] || 'normal';
    situationKey = `reshuffle:${urgency}:plans=A|B`;
  } else if (comparedItems.length >= 2) {
    situationKey = generateSituationKey(conflictType, comparedItems[0], comparedItems[1]);
  } else {
    situationKey = `${conflictType}:${comparedItems[0] || 'unknown'}`;
  }
  
  return createDecisionLog(
    id,
    situationKey,
    primaryIntent,
    comparedItems,
    userChoice,
    contextSnapshot
  );
}

export function extractDecisionFromAction(
  actionType: string,
  taskId: string,
  taskTitle: string,
  alternatives: string[],
  context: Partial<ContextSnapshot>
): DecisionLog {
  const fullContext: ContextSnapshot = {
    cognitiveLoad: context.cognitiveLoad || 'medium',
    urgencyLevels: context.urgencyLevels || {},
    mustLocks: context.mustLocks || [],
    timeWindow: context.timeWindow || { startIso: '', endIso: '' },
    isReshuffle: context.isReshuffle || false,
    isFollowUp: context.isFollowUp || false
  };
  
  const comparedItems = [taskTitle, ...alternatives];
  
  return collectDecision(
    actionType,
    comparedItems,
    taskTitle,
    fullContext,
    'task_selection'
  );
}

export function shouldCollectDecision(actionType: string): boolean {
  const collectableActions = [
    'mark_done',
    'cancel',
    'toggle_must_lock',
    'reschedule',
    'accept_plan',
    'priority_choice'
  ];
  return collectableActions.includes(actionType);
}
