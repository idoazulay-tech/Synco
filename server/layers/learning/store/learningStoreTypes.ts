// Learning Store Types - Interfaces for learning data persistence

import type {
  DecisionLog,
  OutcomeLog,
  Pattern,
  PreferenceRule,
  PendingRuleProposal,
  PatternStats,
  LearningContext
} from '../types/learningTypes';

export interface LearningStoreState {
  decisionLogs: DecisionLog[];
  outcomeLogs: OutcomeLog[];
  patterns: Pattern[];
  preferenceRules: PreferenceRule[];
  patternStats: PatternStats[];
  pendingRuleProposal: PendingRuleProposal | null;
}

export interface ILearningStore {
  // Decision logs
  addDecisionLog(log: DecisionLog): void;
  getDecisionLogs(): DecisionLog[];
  getRecentDecisionLogs(limit: number): DecisionLog[];
  getDecisionLogsBySituation(situationKey: string): DecisionLog[];
  
  // Outcome logs
  addOutcomeLog(log: OutcomeLog): void;
  getOutcomeLogs(): OutcomeLog[];
  getRecentOutcomeLogs(limit: number): OutcomeLog[];
  
  // Patterns
  setPatterns(patterns: Pattern[]): void;
  getPatterns(): Pattern[];
  getPatternBySituation(situationKey: string): Pattern | undefined;
  
  // Pattern stats
  setPatternStats(stats: PatternStats[]): void;
  getPatternStats(): PatternStats[];
  
  // Preference rules
  addPreferenceRule(rule: PreferenceRule): void;
  updatePreferenceRule(rule: PreferenceRule): void;
  getPreferenceRules(): PreferenceRule[];
  getActiveRules(): PreferenceRule[];
  getPausedRules(): PreferenceRule[];
  getRuleById(id: string): PreferenceRule | undefined;
  getRuleBySituation(situationKey: string): PreferenceRule | undefined;
  
  // Pending proposal
  setPendingProposal(proposal: PendingRuleProposal | null): void;
  getPendingProposal(): PendingRuleProposal | null;
  
  // Learning context
  getLearningContext(situationKey: string): LearningContext;
  
  // State management
  getLearningState(): LearningStoreState;
  resetLearningState(): void;
}

export function createEmptyLearningState(): LearningStoreState {
  return {
    decisionLogs: [],
    outcomeLogs: [],
    patterns: [],
    preferenceRules: [],
    patternStats: [],
    pendingRuleProposal: null
  };
}
