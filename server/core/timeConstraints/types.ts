/**
 * Time Constraint & Flexibility Layer - Types
 * שכבת חוק-על לניהול התנהגות משימות בזמן
 * 
 * Layer 1: Core / Laws / Gates
 * אסור לעקוף בשום תנאי
 */

export enum TimeConstraintType {
  HARD_LOCK = 'HARD_LOCK',
  HUMAN_DEPENDENT = 'HUMAN_DEPENDENT',
  FLEX_WINDOW = 'FLEX_WINDOW',
  FILL_GAPS = 'FILL_GAPS'
}

export interface TimeConstraintClassification {
  type: TimeConstraintType;
  confidence: number;
  reason: string;
  canReschedule: boolean;
  requiresClarification?: boolean;
  flexWindow?: {
    startDate: string;
    endDate: string;
    preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  };
}

export type ScheduleOperationType = 
  | 'create'
  | 'reschedule'
  | 'delete'
  | 'optimize'
  | 'auto_move';

export interface ScheduleOperation {
  operationType: ScheduleOperationType;
  taskId?: string;
  proposedStartTime?: Date;
  proposedEndTime?: Date;
  reason?: string;
  isAutomatic: boolean;
}

export interface GateDecision {
  allowed: boolean;
  reason: string;
  constraintType?: TimeConstraintType;
  suggestedAlternative?: {
    startTime: Date;
    endTime: Date;
    reason: string;
  };
}

export interface ScheduleState {
  tasks: Array<{
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    timeConstraint: TimeConstraintType;
    participants?: string[];
    isLocked?: boolean;
  }>;
  currentTime: Date;
}

export const CONSTRAINT_PRIORITY: Record<TimeConstraintType, number> = {
  [TimeConstraintType.HARD_LOCK]: 1,
  [TimeConstraintType.HUMAN_DEPENDENT]: 2,
  [TimeConstraintType.FLEX_WINDOW]: 3,
  [TimeConstraintType.FILL_GAPS]: 4
};

export const CONSTRAINT_LABELS_HE: Record<TimeConstraintType, string> = {
  [TimeConstraintType.HARD_LOCK]: 'נעול',
  [TimeConstraintType.HUMAN_DEPENDENT]: 'תלוי באדם',
  [TimeConstraintType.FLEX_WINDOW]: 'גמיש בחלון',
  [TimeConstraintType.FILL_GAPS]: 'מילוי זמן'
};
