// Rule Schemas Policy - Defines valid rule structures

import type { RuleType, RulePayload } from '../types/learningTypes';

export interface RuleSchema {
  ruleType: RuleType;
  requiredFields: string[];
  optionalFields: string[];
  validate: (payload: RulePayload) => boolean;
}

export const RULE_SCHEMAS: Record<RuleType, RuleSchema> = {
  priority: {
    ruleType: 'priority',
    requiredFields: ['priorityOrder'],
    optionalFields: [],
    validate: (payload) => {
      return Array.isArray(payload.priorityOrder) && payload.priorityOrder.length >= 1;
    }
  },
  schedule: {
    ruleType: 'schedule',
    requiredFields: ['preferredTimeWindow'],
    optionalFields: [],
    validate: (payload) => {
      const window = payload.preferredTimeWindow;
      return window !== undefined && 
             typeof window.startHour === 'number' && 
             typeof window.endHour === 'number' &&
             window.startHour >= 0 && window.startHour <= 23 &&
             window.endHour >= 0 && window.endHour <= 23;
    }
  },
  reshuffle: {
    ruleType: 'reshuffle',
    requiredFields: ['preferredPlan'],
    optionalFields: [],
    validate: (payload) => {
      return payload.preferredPlan === 'A' || payload.preferredPlan === 'B';
    }
  },
  mustLock: {
    ruleType: 'mustLock',
    requiredFields: ['mustLockTaskTypes'],
    optionalFields: [],
    validate: (payload) => {
      return Array.isArray(payload.mustLockTaskTypes) && payload.mustLockTaskTypes.length > 0;
    }
  }
};

export function validateRulePayload(ruleType: RuleType, payload: RulePayload): boolean {
  const schema = RULE_SCHEMAS[ruleType];
  if (!schema) return false;
  return schema.validate(payload);
}

export function getQuestionTextForRuleType(ruleType: RuleType, context: string): string {
  const templates: Record<RuleType, string> = {
    priority: `המערכת זיהתה שאתה בדרך כלל בוחר ${context}. להפוך את זה לכלל קבוע?`,
    schedule: `המערכת זיהתה שאתה מעדיף לקבוע ${context}. להפוך את זה לכלל קבוע?`,
    reshuffle: `המערכת זיהתה שבמצבי דחוף אתה מעדיף ${context}. להפוך את זה לכלל קבוע?`,
    mustLock: `המערכת זיהתה שאתה תמיד נועל ${context}. להפוך את זה לכלל קבוע?`
  };
  return templates[ruleType];
}
