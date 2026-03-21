/**
 * Outcome Anchor Law - חוק סף ליצירת OutcomeAnchor
 * 
 * OutcomeAnchor נוצר רק אם מתקיימים לפחות 2 מהתנאים:
 * - דדליין חד-משמעי
 * - השלכה ממשית אם מפספסים
 * - לא גמיש לפי המשתמש
 * - שפת מחויבות ("חייב", "מתחיל ב", "נסגר ב", "לא מחכה")
 */

import { 
  OutcomeThresholdCondition, 
  COMMITMENT_KEYWORDS_HE,
  OperationalConsequence,
  OutcomeAtRiskDecision
} from './types';
import { detectOutcomeFromText } from '../outcomes/detector';

export interface OutcomeThresholdResult {
  meetsThreshold: boolean;
  metConditions: OutcomeThresholdCondition[];
  conditionCount: number;
  confidence: number;
}

export function checkOutcomeThreshold(
  text: string,
  context?: {
    hasExplicitDeadline?: boolean;
    hasStatedConsequences?: boolean;
    userMarkedAsFixed?: boolean;
  }
): OutcomeThresholdResult {
  const metConditions: OutcomeThresholdCondition[] = [];
  
  const detection = detectOutcomeFromText(text);
  if (detection.isOutcome && detection.deadlineTime) {
    metConditions.push('hasUnambiguousDeadline');
  } else if (context?.hasExplicitDeadline) {
    metConditions.push('hasUnambiguousDeadline');
  }
  
  if (hasRealConsequences(text) || context?.hasStatedConsequences) {
    metConditions.push('hasRealConsequences');
  }
  
  if (context?.userMarkedAsFixed || hasNonFlexibleIndicator(text)) {
    metConditions.push('notFlexibleByUser');
  }
  
  if (hasCommitmentLanguage(text)) {
    metConditions.push('hasCommitmentLanguage');
  }
  
  const meetsThreshold = metConditions.length >= 2;
  const confidence = metConditions.length / 4;
  
  return {
    meetsThreshold,
    metConditions,
    conditionCount: metConditions.length,
    confidence
  };
}

function hasRealConsequences(text: string): boolean {
  const consequencePatterns = [
    /אם לא.*אז/,
    /אחרת/,
    /יגרום/,
    /יפספס/,
    /יאחר/,
    /יפגע/,
    /עבודה/,
    /פגישה/,
    /טיסה/,
    /רכבת/,
    /אוטובוס/,
    /תור/,
    /ראיון/
  ];
  
  return consequencePatterns.some(pattern => pattern.test(text));
}

function hasNonFlexibleIndicator(text: string): boolean {
  const nonFlexPatterns = [
    /לא גמיש/,
    /קבוע/,
    /לא ניתן לשנות/,
    /בדיוק ב/,
    /חד-משמעי/
  ];
  
  return nonFlexPatterns.some(pattern => pattern.test(text));
}

function hasCommitmentLanguage(text: string): boolean {
  return COMMITMENT_KEYWORDS_HE.some(keyword => text.includes(keyword));
}

export function calculateEffectiveBuffer(
  defaultBuffer: number,
  learnedBuffer?: number
): number {
  if (!learnedBuffer) return defaultBuffer;
  return Math.max(defaultBuffer, learnedBuffer);
}

export function buildOperationalConsequences(
  missingMinutes: number,
  outcomeTitle: string,
  originalDeadline: Date,
  projectedArrival: Date
): OperationalConsequence {
  const facts: string[] = [];
  const requiredActions: string[] = [];
  
  facts.push(`חסרות ${missingMinutes} דקות`);
  
  const originalTime = formatTime(originalDeadline);
  const projectedTime = formatTime(projectedArrival);
  facts.push(`יציאה ב-${projectedTime} במקום ${originalTime}`);
  
  if (outcomeTitle.includes('עבודה') || outcomeTitle.includes('פגישה')) {
    facts.push('הגעה באיחור');
  }
  
  requiredActions.push('לקצר משימות');
  requiredActions.push('לדלג על משימה');
  requiredActions.push('לעדכן גורם רלוונטי');
  
  return {
    type: 'operational',
    facts,
    requiredActions
  };
}

export function buildOutcomeAtRiskDecision(
  outcomeId: string,
  outcomeTitle: string,
  missingMinutes: number,
  originalDeadline: Date,
  projectedArrival: Date
): OutcomeAtRiskDecision {
  return {
    type: 'OUTCOME_AT_RISK',
    outcomeId,
    outcomeTitle,
    missingMinutes,
    originalDeadline,
    projectedArrival,
    consequences: buildOperationalConsequences(
      missingMinutes,
      outcomeTitle,
      originalDeadline,
      projectedArrival
    ),
    availableChoices: ['SHORTEN_DURATIONS', 'DROP_TASK', 'ACCEPT_DELAY']
  };
}

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
