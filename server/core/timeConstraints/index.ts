/**
 * Time Constraint & Flexibility Layer
 * שכבת חוק-על לניהול התנהגות משימות בזמן
 * 
 * Layer 1: Core / Laws / Gates
 * אסור לעקוף בשום תנאי
 */

export { TimeConstraintType, CONSTRAINT_PRIORITY, CONSTRAINT_LABELS_HE } from './types';
export type { 
  TimeConstraintClassification, 
  ScheduleOperation, 
  ScheduleState, 
  GateDecision,
  ScheduleOperationType 
} from './types';

export { 
  classifyTaskTimeConstraint, 
  getConstraintLabel 
} from './classifier';
export type { ParsedTimeData } from './classifier';

export { 
  enforceTimeConstraintLayer, 
  canTaskBeBumped, 
  getTasksToEvict 
} from './gate';
export type { EnforceOptions } from './gate';
