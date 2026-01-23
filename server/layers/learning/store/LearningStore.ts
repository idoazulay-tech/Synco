// Learning Store - In-memory store for learning engine data

import type {
  DecisionLog,
  OutcomeLog,
  Pattern,
  PreferenceRule,
  PendingRuleProposal,
  PatternStats,
  LearningContext
} from '../types/learningTypes';
import type { ILearningStore, LearningStoreState } from './learningStoreTypes';
import { createEmptyLearningState } from './learningStoreTypes';

export class LearningStore implements ILearningStore {
  private state: LearningStoreState;
  
  constructor() {
    this.state = createEmptyLearningState();
  }
  
  // Decision logs
  addDecisionLog(log: DecisionLog): void {
    this.state.decisionLogs.push(log);
  }
  
  getDecisionLogs(): DecisionLog[] {
    return [...this.state.decisionLogs];
  }
  
  getRecentDecisionLogs(limit: number): DecisionLog[] {
    return this.state.decisionLogs.slice(-limit);
  }
  
  getDecisionLogsBySituation(situationKey: string): DecisionLog[] {
    return this.state.decisionLogs.filter(l => l.situationKey === situationKey);
  }
  
  // Outcome logs
  addOutcomeLog(log: OutcomeLog): void {
    this.state.outcomeLogs.push(log);
  }
  
  getOutcomeLogs(): OutcomeLog[] {
    return [...this.state.outcomeLogs];
  }
  
  getRecentOutcomeLogs(limit: number): OutcomeLog[] {
    return this.state.outcomeLogs.slice(-limit);
  }
  
  // Patterns
  setPatterns(patterns: Pattern[]): void {
    this.state.patterns = patterns;
  }
  
  getPatterns(): Pattern[] {
    return [...this.state.patterns];
  }
  
  getPatternBySituation(situationKey: string): Pattern | undefined {
    return this.state.patterns.find(p => p.situationKey === situationKey);
  }
  
  // Pattern stats
  setPatternStats(stats: PatternStats[]): void {
    this.state.patternStats = stats;
  }
  
  getPatternStats(): PatternStats[] {
    return [...this.state.patternStats];
  }
  
  // Preference rules
  addPreferenceRule(rule: PreferenceRule): void {
    this.state.preferenceRules.push(rule);
  }
  
  updatePreferenceRule(rule: PreferenceRule): void {
    const index = this.state.preferenceRules.findIndex(r => r.id === rule.id);
    if (index >= 0) {
      this.state.preferenceRules[index] = rule;
    } else {
      this.state.preferenceRules.push(rule);
    }
  }
  
  getPreferenceRules(): PreferenceRule[] {
    return [...this.state.preferenceRules];
  }
  
  getActiveRules(): PreferenceRule[] {
    return this.state.preferenceRules.filter(r => r.status === 'active');
  }
  
  getPausedRules(): PreferenceRule[] {
    return this.state.preferenceRules.filter(r => r.status === 'paused');
  }
  
  getRuleById(id: string): PreferenceRule | undefined {
    return this.state.preferenceRules.find(r => r.id === id);
  }
  
  getRuleBySituation(situationKey: string): PreferenceRule | undefined {
    return this.state.preferenceRules.find(r => r.situationKey === situationKey);
  }
  
  // Pending proposal
  setPendingProposal(proposal: PendingRuleProposal | null): void {
    this.state.pendingRuleProposal = proposal;
  }
  
  getPendingProposal(): PendingRuleProposal | null {
    return this.state.pendingRuleProposal;
  }
  
  // Learning context
  getLearningContext(situationKey: string): LearningContext {
    const activeRules = this.getActiveRules()
      .filter(r => r.situationKey === situationKey);
    
    const relevantPatterns = this.getPatterns()
      .filter(p => p.situationKey === situationKey);
    
    return {
      activeRules,
      relevantPatterns,
      anomalyFlags: {
        isAnomaly: false,
        reasons: [],
        shouldAskForConfirmation: false,
        confidenceModifier: 1.0
      },
      pendingProposal: this.getPendingProposal()
    };
  }
  
  // State management
  getLearningState(): LearningStoreState {
    return {
      decisionLogs: [...this.state.decisionLogs],
      outcomeLogs: [...this.state.outcomeLogs],
      patterns: [...this.state.patterns],
      preferenceRules: [...this.state.preferenceRules],
      patternStats: [...this.state.patternStats],
      pendingRuleProposal: this.state.pendingRuleProposal
    };
  }
  
  resetLearningState(): void {
    this.state = createEmptyLearningState();
  }
}

// Singleton instance
let learningStoreInstance: LearningStore | null = null;

export function getLearningStore(): LearningStore {
  if (!learningStoreInstance) {
    learningStoreInstance = new LearningStore();
  }
  return learningStoreInstance;
}

export function resetLearningStore(): void {
  if (learningStoreInstance) {
    learningStoreInstance.resetLearningState();
  }
}
