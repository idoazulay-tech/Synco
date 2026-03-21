/**
 * System Laws Module
 * שכבת חוקי-על מרכזית ל-Synco
 * 
 * Layer 1: Core / Laws / Gates
 * 
 * סדר ריצה מחייב:
 * 1) Time Constraint & Flexibility Layer
 * 2) Outcome Anchor & Backward Planning
 * 3) Adaptive Shortening & Reschedule Proposal
 * 4) Operational Consequences Only
 */

export {
  DecisionType,
  UserChoiceType,
  OperationalConsequence,
  OutcomeAtRiskDecision,
  TaskForDropping,
  ShortenedTask,
  ProposedSchedulePreview,
  ScheduleSnapshot,
  ScheduleChange,
  SystemLawsState,
  SystemLawsOperation,
  SystemLawsDecision,
  OutcomeThresholdCondition,
  OUTCOME_THRESHOLD_CONDITIONS,
  COMMITMENT_KEYWORDS_HE
} from './types';

export {
  checkOutcomeThreshold,
  calculateEffectiveBuffer,
  buildOperationalConsequences,
  buildOutcomeAtRiskDecision
} from './outcomeAnchorLaw';

export {
  calculateShorteningForTask,
  calculateAllShortenings,
  getTasksForDropping,
  buildProposedSchedulePreview
} from './adaptiveShorteningLaw';

export {
  systemLawsGate,
  approvePreview,
  rejectPreview
} from './systemLawsGate';
