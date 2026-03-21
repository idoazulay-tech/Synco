// Confidence Updater - Updates rule confidence based on behavior

import type { PreferenceRule, DecisionLog } from '../types/learningTypes';
import { updateRuleConfidence, toggleRuleStatus } from '../models/PreferenceRule';
import { calculateEventDecay, calculateTimeDecay } from '../policies/decay';
import { LEARNING_THRESHOLDS } from '../policies/thresholds';

export interface ConfidenceUpdateResult {
  rule: PreferenceRule;
  wasUpdated: boolean;
  wasPaused: boolean;
  reason: string;
}

export function updateConfidenceFromDecision(
  rule: PreferenceRule,
  decision: DecisionLog,
  expectedChoice: string
): ConfidenceUpdateResult {
  const isMatch = decision.userChoice === expectedChoice;
  const decayResult = calculateEventDecay(rule.confidence, isMatch);
  
  let updatedRule = updateRuleConfidence(rule, decayResult.newConfidence);
  let wasPaused = false;
  
  if (decayResult.shouldPause) {
    updatedRule = toggleRuleStatus(updatedRule, 'paused');
    wasPaused = true;
  }
  
  return {
    rule: updatedRule,
    wasUpdated: true,
    wasPaused,
    reason: decayResult.reason
  };
}

export function applyTimeDecayToRules(
  rules: PreferenceRule[],
  currentDate: Date = new Date()
): ConfidenceUpdateResult[] {
  const results: ConfidenceUpdateResult[] = [];
  
  for (const rule of rules) {
    const lastUpdated = new Date(rule.updatedAtIso);
    const daysSinceUpdate = Math.floor(
      (currentDate.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceUpdate > 0) {
      const decayResult = calculateTimeDecay(rule.confidence, daysSinceUpdate);
      let updatedRule = updateRuleConfidence(rule, decayResult.newConfidence);
      let wasPaused = false;
      
      if (decayResult.shouldPause && rule.status === 'active') {
        updatedRule = toggleRuleStatus(updatedRule, 'paused');
        wasPaused = true;
      }
      
      results.push({
        rule: updatedRule,
        wasUpdated: true,
        wasPaused,
        reason: decayResult.reason
      });
    } else {
      results.push({
        rule,
        wasUpdated: false,
        wasPaused: false,
        reason: 'no_update_needed'
      });
    }
  }
  
  return results;
}

export function checkReactivation(
  pausedRules: PreferenceRule[],
  recentDecisions: DecisionLog[]
): PreferenceRule[] {
  const reactivated: PreferenceRule[] = [];
  
  for (const rule of pausedRules) {
    // Count recent matches for this situation
    const matchingDecisions = recentDecisions.filter(
      d => d.situationKey === rule.situationKey
    );
    
    if (matchingDecisions.length >= LEARNING_THRESHOLDS.REACTIVATE_RULE_MATCHES) {
      // Check if recent decisions match the rule's expected behavior
      const payload = rule.payload;
      let expectedChoice: string | null = null;
      
      if (payload.priorityOrder && payload.priorityOrder.length > 0) {
        expectedChoice = payload.priorityOrder[0];
      } else if (payload.preferredPlan) {
        expectedChoice = payload.preferredPlan;
      }
      
      if (expectedChoice) {
        const matches = matchingDecisions.filter(d => d.userChoice === expectedChoice);
        if (matches.length >= LEARNING_THRESHOLDS.REACTIVATE_RULE_MATCHES) {
          reactivated.push(toggleRuleStatus(rule, 'active'));
        }
      }
    }
  }
  
  return reactivated;
}

export function getExpectedChoiceFromRule(rule: PreferenceRule): string | null {
  const { payload } = rule;
  
  if (payload.priorityOrder && payload.priorityOrder.length > 0) {
    return payload.priorityOrder[0];
  }
  if (payload.preferredPlan) {
    return payload.preferredPlan;
  }
  if (payload.mustLockTaskTypes && payload.mustLockTaskTypes.length > 0) {
    return payload.mustLockTaskTypes[0];
  }
  
  return null;
}
