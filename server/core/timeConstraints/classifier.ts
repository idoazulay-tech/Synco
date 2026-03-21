/**
 * Time Constraint Classifier
 * מסווג משימות לפי סוג מגבלת הזמן שלהן
 */

import { TimeConstraintType, TimeConstraintClassification } from './types';

const HARD_LOCK_KEYWORDS = [
  'פגישה', 'תור', 'משחק', 'טיסה', 'ראיון', 'בית משפט', 'רופא',
  'רופאה', 'מרפאה', 'קליניקה', 'התחייבות', 'הופעה', 'כרטיס',
  'הזמנה', 'חתונה', 'בר מצווה', 'אירוע', 'מופע', 'הרצאה',
  'סדנה', 'קורס', 'שיעור', 'טיפול', 'פיזיותרפיה', 'zoom', 'זום',
  'ועידה', 'כנס', 'ישיבה', 'דיון', 'שמיעה'
];

const HUMAN_DEPENDENT_KEYWORDS = [
  'עם', 'שיחה', 'לקוח', 'זמן איכות', 'ילדים', 'בן זוג', 'אשתי',
  'בעלי', 'הורים', 'אמא', 'אבא', 'סבא', 'סבתא', 'חבר', 'חברה',
  'קולגה', 'צוות', 'לפגוש', 'להיפגש', 'לדבר עם', 'להתקשר ל',
  'לבקר את', 'ביקור אצל', 'ארוחה עם', 'קפה עם'
];

const FILL_GAPS_KEYWORDS = [
  'אם יהיה זמן', 'כשיהיה זמן', 'מתישהו', 'לקרוא', 'לסדר',
  'לארגן', 'לנקות', 'לצפות', 'סרט', 'פודקאסט', 'ספר',
  'לנוח', 'להירגע', 'תחביב', 'בזמן הפנוי', 'אם אספיק',
  'לא דחוף', 'לאט לאט', 'בלי לחץ', 'כשיש רגע'
];

const FLEX_WINDOW_KEYWORDS = [
  'היום', 'מחר', 'השבוע', 'בערב', 'בבוקר', 'אחה״צ', 'אחר הצהריים',
  'במהלך היום', 'לפני הצהריים', 'אחרי הצהריים', 'עד סוף היום',
  'עד סוף השבוע', 'בימים הקרובים', 'השבוע הזה', 'עד יום',
  'לא משנה מתי', 'גמיש', 'פלקסיבילי'
];

const EXACT_TIME_PATTERNS = [
  /ב-?\d{1,2}(:\d{2})?/,
  /בשעה\s*\d{1,2}/,
  /ב(אחת|שתיים|שלוש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר|אחת עשרה|שתים עשרה)\s*(בדיוק|בבוקר|בצהריים|בערב|בלילה)?/,
  /מ-?\d{1,2}(:\d{2})?\s*(עד|ל)\s*\d{1,2}/
];

export interface ParsedTimeData {
  hasExactTime?: boolean;
  hasTimeRange?: boolean;
  hasFlexWindow?: boolean;
  hasRelativeDate?: boolean;
  windowStart?: string;
  windowEnd?: string;
  confidence?: number;
}

export function classifyTaskTimeConstraint(
  taskText: string,
  parsedTimeData?: ParsedTimeData,
  participantsHint?: string[]
): TimeConstraintClassification {
  const normalizedText = taskText.toLowerCase().trim();
  
  let scores = {
    [TimeConstraintType.HARD_LOCK]: 0,
    [TimeConstraintType.HUMAN_DEPENDENT]: 0,
    [TimeConstraintType.FLEX_WINDOW]: 0,
    [TimeConstraintType.FILL_GAPS]: 0
  };
  
  let reasons: string[] = [];
  
  for (const keyword of HARD_LOCK_KEYWORDS) {
    if (normalizedText.includes(keyword)) {
      scores[TimeConstraintType.HARD_LOCK] += 30;
      reasons.push(`מילת מפתח נעולה: "${keyword}"`);
    }
  }
  
  for (const keyword of HUMAN_DEPENDENT_KEYWORDS) {
    if (normalizedText.includes(keyword)) {
      scores[TimeConstraintType.HUMAN_DEPENDENT] += 25;
      reasons.push(`תלות באדם: "${keyword}"`);
    }
  }
  
  for (const keyword of FILL_GAPS_KEYWORDS) {
    if (normalizedText.includes(keyword)) {
      scores[TimeConstraintType.FILL_GAPS] += 25;
      reasons.push(`משימת מילוי: "${keyword}"`);
    }
  }
  
  for (const keyword of FLEX_WINDOW_KEYWORDS) {
    if (normalizedText.includes(keyword)) {
      scores[TimeConstraintType.FLEX_WINDOW] += 20;
      reasons.push(`חלון גמיש: "${keyword}"`);
    }
  }
  
  if (parsedTimeData?.hasExactTime) {
    scores[TimeConstraintType.HARD_LOCK] += 40;
    reasons.push('זמן מדויק זוהה');
  }
  
  if (parsedTimeData?.hasTimeRange) {
    scores[TimeConstraintType.HARD_LOCK] += 35;
    reasons.push('טווח זמן מוגדר');
  }
  
  if (parsedTimeData?.hasFlexWindow) {
    scores[TimeConstraintType.FLEX_WINDOW] += 30;
    reasons.push('חלון זמן גמיש');
  }
  
  for (const pattern of EXACT_TIME_PATTERNS) {
    if (pattern.test(normalizedText)) {
      scores[TimeConstraintType.HARD_LOCK] += 25;
      reasons.push('תבנית זמן מדויק');
      break;
    }
  }
  
  if (participantsHint && participantsHint.length > 0) {
    scores[TimeConstraintType.HUMAN_DEPENDENT] += 35;
    reasons.push(`משתתפים: ${participantsHint.join(', ')}`);
  }
  
  const maxScore = Math.max(...Object.values(scores));
  
  if (maxScore === 0) {
    return {
      type: TimeConstraintType.FLEX_WINDOW,
      confidence: 0.5,
      reason: 'ברירת מחדל - לא זוהו מאפיינים ספציפיים',
      canReschedule: true
    };
  }
  
  let selectedType = TimeConstraintType.FLEX_WINDOW;
  for (const [type, score] of Object.entries(scores)) {
    if (score === maxScore) {
      selectedType = type as TimeConstraintType;
      break;
    }
  }
  
  const confidence = Math.min(0.95, maxScore / 100);
  
  const canReschedule = selectedType !== TimeConstraintType.HARD_LOCK;
  
  const requiresClarification = 
    selectedType === TimeConstraintType.HUMAN_DEPENDENT && confidence < 0.7;
  
  return {
    type: selectedType,
    confidence,
    reason: reasons.slice(0, 3).join('; '),
    canReschedule,
    requiresClarification,
    flexWindow: parsedTimeData?.hasFlexWindow ? {
      startDate: parsedTimeData.windowStart || new Date().toISOString().split('T')[0],
      endDate: parsedTimeData.windowEnd || new Date().toISOString().split('T')[0]
    } : undefined
  };
}

export function getConstraintLabel(type: TimeConstraintType): string {
  const labels: Record<TimeConstraintType, string> = {
    [TimeConstraintType.HARD_LOCK]: 'נעול 🔒',
    [TimeConstraintType.HUMAN_DEPENDENT]: 'תלוי באדם 👥',
    [TimeConstraintType.FLEX_WINDOW]: 'גמיש בחלון 📅',
    [TimeConstraintType.FILL_GAPS]: 'מילוי זמן ⏳'
  };
  return labels[type];
}
