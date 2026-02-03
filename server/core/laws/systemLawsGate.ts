/**
 * System Laws Gate - שער מרכזי לכל פעולה על הלו"ז
 * 
 * סדר ריצה מחייב:
 * 1) Time Constraint & Flexibility Layer
 * 2) Outcome Anchor & Backward Planning
 * 3) Adaptive Shortening & Reschedule Proposal
 * 4) Operational Consequences Only (במצבי החלטה)
 * 
 * כל שינוי בלו"ז חייב לעבור דרך systemLawsGate.
 * אסור לפצל Gates ואסור להטמיע חוקים בתוך ה-Scheduler.
 */

import {
  SystemLawsState,
  SystemLawsOperation,
  SystemLawsDecision,
  DecisionType,
  OutcomeAtRiskDecision
} from './types';

import { enforceTimeConstraintLayer, TimeConstraintType } from '../timeConstraints';
import { enforceOutcomeAnchorLayer, buildBackwardPlan, createOutcomeAnchor } from '../outcomes';
import { buildOutcomeAtRiskDecision } from './outcomeAnchorLaw';
import { calculateAllShortenings, getTasksForDropping, buildProposedSchedulePreview } from './adaptiveShorteningLaw';

export function systemLawsGate(
  state: SystemLawsState,
  operation: SystemLawsOperation
): SystemLawsDecision {
  const timeConstraintResult = runTimeConstraintLayer(state, operation);
  if (!timeConstraintResult.allowed) {
    return {
      allowed: false,
      decisionType: 'BLOCK',
      reason: timeConstraintResult.reason,
      layerSource: 'timeConstraint'
    };
  }
  
  const outcomeResult = runOutcomeAnchorLayer(state, operation);
  if (!outcomeResult.allowed) {
    return {
      allowed: false,
      decisionType: 'BLOCK',
      reason: outcomeResult.reason,
      layerSource: 'outcomeAnchor'
    };
  }
  
  const atRiskCheck = checkOutcomeAtRisk(state);
  if (atRiskCheck) {
    const shorteningResult = calculateAllShortenings(
      state.tasks,
      atRiskCheck.missingMinutes,
      state.userHistory
    );
    
    const tasksForDropping = getTasksForDropping(state.tasks);
    
    const preview = shorteningResult.targetAchieved
      ? buildProposedSchedulePreview(
          'SHORTEN_DURATIONS',
          state.tasks,
          { shortenedTasks: shorteningResult.shortenedTasks },
          atRiskCheck.originalDeadline
        )
      : undefined;
    
    return {
      allowed: false,
      decisionType: 'OUTCOME_AT_RISK',
      reason: `חסרות ${atRiskCheck.missingMinutes} דקות להגעה ל"${atRiskCheck.outcomeTitle}"`,
      layerSource: 'adaptiveShortening',
      outcomeAtRisk: atRiskCheck,
      proposedPreview: preview,
      tasksForDropping,
      shortenedTasks: shorteningResult.shortenedTasks
    };
  }
  
  return {
    allowed: true,
    decisionType: 'EXECUTE',
    reason: 'הפעולה אושרה על ידי כל השכבות',
    layerSource: 'system'
  };
}

function runTimeConstraintLayer(
  state: SystemLawsState,
  operation: SystemLawsOperation
): { allowed: boolean; reason: string } {
  const scheduleState = {
    currentTime: state.currentTime,
    tasks: state.tasks.map(t => ({
      id: t.id,
      title: t.title,
      startTime: t.startTime,
      endTime: t.endTime,
      timeConstraint: t.timeConstraintType,
      participants: undefined,
      isLocked: t.timeConstraintType === TimeConstraintType.HARD_LOCK
    }))
  };
  
  const scheduleOperation = {
    operationType: operation.operationType as any,
    taskId: operation.taskId,
    proposedStartTime: operation.proposedStartTime,
    proposedEndTime: operation.proposedEndTime,
    isAutomatic: operation.isAutomatic
  };
  
  const decision = enforceTimeConstraintLayer(scheduleState, scheduleOperation);
  return {
    allowed: decision.allowed,
    reason: decision.reason
  };
}

function runOutcomeAnchorLayer(
  state: SystemLawsState,
  operation: SystemLawsOperation
): { allowed: boolean; reason: string } {
  if (state.outcomes.length === 0) {
    return { allowed: true, reason: 'אין תוצאות מוגדרות' };
  }
  
  const linkedTasks = state.tasks
    .filter(t => t.linkedOutcomeId)
    .map(t => ({
      id: t.id,
      title: t.title,
      durationMinutes: t.durationMinutes,
      order: 1,
      linkedOutcomeId: t.linkedOutcomeId!,
      latestEnd: t.endTime,
      isFlexible: false
    }));
  
  const outcomeState = {
    currentTime: state.currentTime,
    outcomes: state.outcomes.map(o => ({
      ...o,
      timeConstraint: TimeConstraintType.HARD_LOCK,
      createdAt: new Date(),
      source: 'detected' as const,
      linkedTaskIds: o.linkedTaskIds
    })),
    linkedTasks,
    allTasks: state.tasks.map(t => ({
      id: t.id,
      title: t.title,
      startTime: t.startTime,
      endTime: t.endTime,
      linkedOutcomeId: t.linkedOutcomeId,
      timeConstraint: t.timeConstraintType
    }))
  };
  
  const outcomeOperation = {
    operationType: mapOperationType(operation.operationType),
    taskId: operation.taskId,
    outcomeId: operation.outcomeId,
    proposedStartTime: operation.proposedStartTime,
    proposedEndTime: operation.proposedEndTime,
    isAutomatic: operation.isAutomatic
  };
  
  const decision = enforceOutcomeAnchorLayer(outcomeState, outcomeOperation);
  return {
    allowed: decision.allowed,
    reason: decision.reason
  };
}

function mapOperationType(opType: string): any {
  const mapping: Record<string, string> = {
    'create': 'create_task',
    'reschedule': 'move_task',
    'delete': 'delete_task',
    'optimize': 'optimize',
    'auto_move': 'move_task'
  };
  return mapping[opType] || opType;
}

function checkOutcomeAtRisk(state: SystemLawsState): OutcomeAtRiskDecision | null {
  for (const outcome of state.outcomes) {
    const linkedTasks = state.tasks.filter(t => t.linkedOutcomeId === outcome.id);
    const totalDuration = linkedTasks.reduce((sum, t) => sum + t.durationMinutes, 0);
    const totalWithBuffer = totalDuration + outcome.bufferMinutes;
    
    const availableMinutes = Math.floor(
      (outcome.deadlineTime.getTime() - state.currentTime.getTime()) / (1000 * 60)
    );
    
    if (totalWithBuffer > availableMinutes) {
      const missingMinutes = totalWithBuffer - availableMinutes;
      const projectedArrival = new Date(outcome.deadlineTime);
      projectedArrival.setMinutes(projectedArrival.getMinutes() + missingMinutes);
      
      return buildOutcomeAtRiskDecision(
        outcome.id,
        outcome.title,
        missingMinutes,
        outcome.deadlineTime,
        projectedArrival
      );
    }
  }
  
  return null;
}

export function approvePreview(previewId: string): SystemLawsDecision {
  return {
    allowed: true,
    decisionType: 'APPROVED',
    reason: 'ההצעה אושרה על ידי המשתמש',
    layerSource: 'system'
  };
}

export function rejectPreview(previewId: string): SystemLawsDecision {
  return {
    allowed: false,
    decisionType: 'REJECTED',
    reason: 'ההצעה נדחתה על ידי המשתמש',
    layerSource: 'system'
  };
}
