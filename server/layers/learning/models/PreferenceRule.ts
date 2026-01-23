// PreferenceRule Model - User-confirmed behavioral rules

import type { PreferenceRule, RuleType, RulePayload, RuleStatus } from '../types/learningTypes';

export function createPreferenceRule(
  id: string,
  ruleType: RuleType,
  situationKey: string,
  payload: RulePayload,
  confidence: number
): PreferenceRule {
  const now = new Date().toISOString();
  return {
    id,
    ruleType,
    situationKey,
    payload,
    confidence: Math.min(1, Math.max(0, confidence)),
    createdAtIso: now,
    updatedAtIso: now,
    status: 'active'
  };
}

export function updateRuleConfidence(
  rule: PreferenceRule,
  newConfidence: number
): PreferenceRule {
  return {
    ...rule,
    confidence: Math.min(1, Math.max(0, newConfidence)),
    updatedAtIso: new Date().toISOString()
  };
}

export function toggleRuleStatus(
  rule: PreferenceRule,
  status: RuleStatus
): PreferenceRule {
  return {
    ...rule,
    status,
    updatedAtIso: new Date().toISOString()
  };
}

export function isRuleApplicable(rule: PreferenceRule, situationKey: string): boolean {
  return rule.status === 'active' && rule.situationKey === situationKey;
}

export function shouldPauseRule(rule: PreferenceRule, threshold: number): boolean {
  return rule.confidence < threshold && rule.status === 'active';
}
