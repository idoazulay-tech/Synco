// Learning Engine Types - Core type definitions for Layer 5

export type RuleType = 'priority' | 'schedule' | 'reshuffle' | 'mustLock';
export type RuleStatus = 'active' | 'paused';
export type OutcomeFeedback = 'ok' | 'too_slow' | 'wrong' | 'stress';
export type AnswerType = 'confirm' | 'choice' | 'text';

export interface ContextSnapshot {
  cognitiveLoad: 'low' | 'medium' | 'high';
  urgencyLevels: Record<string, 'low' | 'medium' | 'high'>;
  mustLocks: string[];
  timeWindow: { startIso: string; endIso: string };
  isReshuffle: boolean;
  isFollowUp: boolean;
}

export interface DecisionLog {
  id: string;
  tsIso: string;
  situationKey: string;
  primaryIntent: string;
  comparedItems: string[];
  userChoice: string;
  contextSnapshot: ContextSnapshot;
}

export interface OutcomeLog {
  id: string;
  tsIso: string;
  actionType: string;
  success: boolean;
  durationPlannedMinutes: number;
  durationActualMinutes: number | null;
  userFeedback: OutcomeFeedback | null;
  notes: string;
}

export interface Pattern {
  id: string;
  situationKey: string;
  patternType: RuleType;
  observationCount: number;
  dominantChoice: string;
  choiceDistribution: Record<string, number>;
  firstSeenIso: string;
  lastSeenIso: string;
  confidence: number;
}

export interface RulePayload {
  priorityOrder?: string[];
  preferredTimeWindow?: { startHour: number; endHour: number };
  preferredPlan?: 'A' | 'B';
  mustLockTaskTypes?: string[];
  [key: string]: unknown;
}

export interface PreferenceRule {
  id: string;
  ruleType: RuleType;
  situationKey: string;
  payload: RulePayload;
  confidence: number;
  createdAtIso: string;
  updatedAtIso: string;
  status: RuleStatus;
}

export interface RuleProposalQuestion {
  questionId: string;
  textHebrew: string;
  expectedAnswerType: AnswerType;
  options: string[];
}

export interface PendingRuleProposal {
  id: string;
  situationKey: string;
  suggestedRule: {
    ruleType: RuleType;
    payload: RulePayload;
  };
  evidenceCount: number;
  confidence: number;
  question: RuleProposalQuestion;
  declinedCount: number;
}

export interface AnomalyFlags {
  isAnomaly: boolean;
  reasons: string[];
  shouldAskForConfirmation: boolean;
  confidenceModifier: number;
}

export interface LearningContext {
  activeRules: PreferenceRule[];
  relevantPatterns: Pattern[];
  anomalyFlags: AnomalyFlags;
  pendingProposal: PendingRuleProposal | null;
}

export interface PatternStats {
  situationKey: string;
  totalOccurrences: number;
  choiceCounts: Record<string, number>;
  lastUpdatedIso: string;
}

export interface LearningUIInstructions {
  showRuleProposalModal: boolean;
  refreshLearningPanel: boolean;
  message: string | null;
  messageType: 'success' | 'info' | 'warning' | null;
}
