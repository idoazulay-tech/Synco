/**
 * System Laws Gate - Types
 * 
 * Layer 1: Core / Laws / Gates
 * סדר ריצה מחייב לכל פעולה על הלו"ז
 */

import { TimeConstraintType } from '../timeConstraints/types';

export type DecisionType = 
  | 'EXECUTE'
  | 'BLOCK' 
  | 'OUTCOME_AT_RISK'
  | 'NEEDS_USER_DECISION'
  | 'APPROVED'
  | 'REJECTED';

export type UserChoiceType = 
  | 'SHORTEN_DURATIONS'
  | 'DROP_TASK'
  | 'ACCEPT_DELAY'
  | 'CANCEL';

export interface OperationalConsequence {
  type: 'operational';
  facts: string[];
  requiredActions: string[];
}

export interface OutcomeAtRiskDecision {
  type: 'OUTCOME_AT_RISK';
  outcomeId: string;
  outcomeTitle: string;
  missingMinutes: number;
  originalDeadline: Date;
  projectedArrival: Date;
  consequences: OperationalConsequence;
  availableChoices: UserChoiceType[];
}

export interface TaskForDropping {
  id: string;
  title: string;
  shortTitle: string;
  durationMinutes: number;
  isUrgent: boolean;
  hasDeadline: boolean;
  linkedOutcomeId?: string;
  recommendedForDrop: boolean;
  reason?: string;
}

export interface ShortenedTask {
  taskId: string;
  originalDuration: number;
  newDuration: number;
  reductionPercent: number;
  reason: string;
}

export interface ProposedSchedulePreview {
  id: string;
  proposalType: UserChoiceType;
  originalState: ScheduleSnapshot;
  proposedState: ScheduleSnapshot;
  changes: ScheduleChange[];
  outcomeStillAchievable: boolean;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
}

export interface ScheduleSnapshot {
  tasks: Array<{
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
  }>;
  outcomeDeadline: Date;
}

export interface ScheduleChange {
  type: 'shortened' | 'dropped' | 'moved';
  taskId: string;
  taskTitle: string;
  before: { startTime: Date; endTime: Date; duration: number };
  after?: { startTime: Date; endTime: Date; duration: number };
}

export interface SystemLawsState {
  currentTime: Date;
  tasks: Array<{
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    timeConstraintType: TimeConstraintType;
    linkedOutcomeId?: string;
    historicalDurations?: number[];
    taskType?: string;
  }>;
  outcomes: Array<{
    id: string;
    title: string;
    deadlineTime: Date;
    bufferMinutes: number;
    linkedTaskIds: string[];
  }>;
  userHistory?: UserHistoryData;
}

export interface UserHistoryData {
  averageTaskCompletionRatio: number;
  taskTypeAverages: Record<string, number>;
  learnedBuffers: Record<string, number>;
}

export interface SystemLawsOperation {
  operationType: 'create' | 'reschedule' | 'delete' | 'optimize' | 'auto_move';
  taskId?: string;
  outcomeId?: string;
  proposedStartTime?: Date;
  proposedEndTime?: Date;
  isAutomatic: boolean;
}

export interface SystemLawsDecision {
  allowed: boolean;
  decisionType: DecisionType;
  reason: string;
  layerSource: 'timeConstraint' | 'outcomeAnchor' | 'adaptiveShortening' | 'system';
  outcomeAtRisk?: OutcomeAtRiskDecision;
  proposedPreview?: ProposedSchedulePreview;
  tasksForDropping?: TaskForDropping[];
  shortenedTasks?: ShortenedTask[];
}

export const OUTCOME_THRESHOLD_CONDITIONS = [
  'hasUnambiguousDeadline',
  'hasRealConsequences', 
  'notFlexibleByUser',
  'hasCommitmentLanguage'
] as const;

export type OutcomeThresholdCondition = typeof OUTCOME_THRESHOLD_CONDITIONS[number];

export const COMMITMENT_KEYWORDS_HE = [
  'חייב', 'חייבת', 'מתחיל ב', 'מתחילה ב',
  'נסגר ב', 'לא מחכה', 'לא גמיש', 'בדיוק ב',
  'עד', 'לא יאוחר מ', 'מוכרח', 'מוכרחת'
];
