// Learning Engine - Main orchestrator for Layer 5

import type {
  DecisionLog,
  OutcomeLog,
  ContextSnapshot,
  PreferenceRule,
  Pattern,
  PendingRuleProposal,
  LearningContext,
  AnomalyFlags,
  LearningUIInstructions
} from './types/learningTypes';
import type { ILearningStore, LearningStoreState } from './store/learningStoreTypes';

import { collectDecision, shouldCollectDecision } from './collectors/decisionCollector';
import { collectOutcome, shouldCollectOutcome } from './collectors/outcomeCollector';
import { detectPatterns, findPatternsReadyForProposal, updatePatternStats } from './engines/patternDetector';
import { createProposal, confirmProposal, declineProposal, findProposalsFromPatterns } from './engines/ruleProposer';
import { updateConfidenceFromDecision, getExpectedChoiceFromRule, checkReactivation } from './engines/confidenceUpdater';
import { detectAnomaly, shouldOverrideAutoApply } from './engines/anomalyDetector';
import { shouldAutoApply, shouldAskConfirmation } from './policies/thresholds';

export interface LearningResult {
  state: LearningStoreState;
  uiInstructions: LearningUIInstructions;
  learningContext: LearningContext | null;
}

export class LearningEngine {
  private store: ILearningStore;
  
  constructor(store: ILearningStore) {
    this.store = store;
  }
  
  collectDecision(
    actionType: string,
    comparedItems: string[],
    userChoice: string,
    context: ContextSnapshot,
    conflictType: string = 'conflict'
  ): DecisionLog | null {
    if (!shouldCollectDecision(actionType)) {
      return null;
    }
    
    const log = collectDecision(actionType, comparedItems, userChoice, context, conflictType);
    this.store.addDecisionLog(log);
    
    // Update pattern stats
    const stats = updatePatternStats(this.store.getPatternStats(), log);
    this.store.setPatternStats(stats);
    
    // Update rule confidence if applicable
    const rule = this.store.getRuleBySituation(log.situationKey);
    if (rule && rule.status === 'active') {
      const expectedChoice = getExpectedChoiceFromRule(rule);
      if (expectedChoice) {
        const result = updateConfidenceFromDecision(rule, log, expectedChoice);
        this.store.updatePreferenceRule(result.rule);
      }
    }
    
    return log;
  }
  
  collectOutcome(
    actionType: string,
    success: boolean,
    plannedMinutes: number,
    actualMinutes: number | null = null,
    feedback: 'ok' | 'too_slow' | 'wrong' | 'stress' | null = null
  ): OutcomeLog | null {
    if (!shouldCollectOutcome(actionType)) {
      return null;
    }
    
    const log = collectOutcome(actionType, success, plannedMinutes, actualMinutes, feedback);
    this.store.addOutcomeLog(log);
    return log;
  }
  
  detectPatterns(): Pattern[] {
    const recentLogs = this.store.getRecentDecisionLogs(50);
    const existingPatterns = this.store.getPatterns();
    
    const updatedPatterns = detectPatterns(recentLogs, existingPatterns);
    this.store.setPatterns(updatedPatterns);
    
    return updatedPatterns;
  }
  
  findAndCreateProposals(): PendingRuleProposal | null {
    const patterns = this.store.getPatterns();
    const readyPatterns = findPatternsReadyForProposal(patterns);
    
    if (readyPatterns.length === 0) {
      return null;
    }
    
    const existingRules = this.store.getPreferenceRules();
    const existingProposal = this.store.getPendingProposal();
    
    const proposals = findProposalsFromPatterns(
      readyPatterns,
      existingProposal ? [existingProposal] : [],
      existingRules
    );
    
    if (proposals.length > 0) {
      // Take the first proposal (highest priority)
      this.store.setPendingProposal(proposals[0]);
      return proposals[0];
    }
    
    return null;
  }
  
  confirmRuleProposal(): PreferenceRule | null {
    const proposal = this.store.getPendingProposal();
    if (!proposal) {
      return null;
    }
    
    const existingRules = this.store.getPreferenceRules();
    const newRule = confirmProposal(proposal, existingRules);
    
    // Check if this is an update or new rule
    const existingRule = existingRules.find(r => r.situationKey === newRule.situationKey);
    if (existingRule) {
      this.store.updatePreferenceRule(newRule);
    } else {
      this.store.addPreferenceRule(newRule);
    }
    
    this.store.setPendingProposal(null);
    return newRule;
  }
  
  declineRuleProposal(): void {
    const proposal = this.store.getPendingProposal();
    if (!proposal) {
      return;
    }
    
    const declinedProposal = declineProposal(proposal);
    // Store declined proposal for future reference (to prevent re-proposing too soon)
    this.store.setPendingProposal(null);
  }
  
  toggleRule(ruleId: string, newStatus: 'active' | 'paused'): PreferenceRule | null {
    const rule = this.store.getRuleById(ruleId);
    if (!rule) {
      return null;
    }
    
    const updatedRule: PreferenceRule = {
      ...rule,
      status: newStatus,
      updatedAtIso: new Date().toISOString()
    };
    
    this.store.updatePreferenceRule(updatedRule);
    return updatedRule;
  }
  
  getLearningContext(situationKey: string, currentContext: ContextSnapshot): LearningContext {
    const activeRules = this.store.getActiveRules()
      .filter(r => r.situationKey === situationKey);
    
    const relevantPatterns = this.store.getPatterns()
      .filter(p => p.situationKey === situationKey);
    
    const recentOutcomes = this.store.getRecentOutcomeLogs(10);
    const recentDecisions = this.store.getRecentDecisionLogs(10);
    
    const anomalyFlags = detectAnomaly(currentContext, recentOutcomes, recentDecisions);
    
    return {
      activeRules,
      relevantPatterns,
      anomalyFlags,
      pendingProposal: this.store.getPendingProposal()
    };
  }
  
  shouldAutoApplyRule(rule: PreferenceRule, context: ContextSnapshot): boolean {
    const recentOutcomes = this.store.getRecentOutcomeLogs(10);
    const recentDecisions = this.store.getRecentDecisionLogs(10);
    
    const anomalyFlags = detectAnomaly(context, recentOutcomes, recentDecisions);
    
    if (shouldOverrideAutoApply(anomalyFlags, rule.confidence)) {
      return false;
    }
    
    return shouldAutoApply(rule.confidence, anomalyFlags.isAnomaly);
  }
  
  shouldAskConfirmation(rule: PreferenceRule, context: ContextSnapshot): boolean {
    const recentOutcomes = this.store.getRecentOutcomeLogs(10);
    const recentDecisions = this.store.getRecentDecisionLogs(10);
    
    const anomalyFlags = detectAnomaly(context, recentOutcomes, recentDecisions);
    
    return shouldAskConfirmation(rule.confidence, anomalyFlags.isAnomaly);
  }
  
  checkAndReactivatePausedRules(): PreferenceRule[] {
    const pausedRules = this.store.getPausedRules();
    const recentDecisions = this.store.getRecentDecisionLogs(20);
    
    const reactivated = checkReactivation(pausedRules, recentDecisions);
    
    for (const rule of reactivated) {
      this.store.updatePreferenceRule(rule);
    }
    
    return reactivated;
  }
  
  process(
    actionType: string,
    comparedItems: string[],
    userChoice: string,
    context: ContextSnapshot,
    plannedMinutes: number = 0,
    actualMinutes: number | null = null,
    feedback: 'ok' | 'too_slow' | 'wrong' | 'stress' | null = null
  ): LearningResult {
    // Collect decision if applicable
    this.collectDecision(actionType, comparedItems, userChoice, context);
    
    // Collect outcome if applicable
    if (shouldCollectOutcome(actionType)) {
      this.collectOutcome(actionType, true, plannedMinutes, actualMinutes, feedback);
    }
    
    // Detect patterns
    this.detectPatterns();
    
    // Check for reactivation of paused rules
    this.checkAndReactivatePausedRules();
    
    // Find proposals
    const proposal = this.findAndCreateProposals();
    
    // Build UI instructions
    const uiInstructions: LearningUIInstructions = {
      showRuleProposalModal: proposal !== null,
      refreshLearningPanel: true,
      message: proposal ? 'זוהה דפוס חדש' : null,
      messageType: proposal ? 'info' : null
    };
    
    // Get learning context for the situation
    const situationKey = this.store.getRecentDecisionLogs(1)[0]?.situationKey || '';
    const learningContext = situationKey 
      ? this.getLearningContext(situationKey, context)
      : null;
    
    return {
      state: this.store.getLearningState(),
      uiInstructions,
      learningContext
    };
  }
  
  getState(): LearningStoreState {
    return this.store.getLearningState();
  }
  
  reset(): void {
    this.store.resetLearningState();
  }
}
