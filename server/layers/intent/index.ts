// Layer 2: Intent & Context Engine
// Full implementation - analyzes intent, entities, commitment, cognitive load

import type { 
  InputType, 
  PrimaryIntent, 
  CommitmentLevel, 
  CognitiveLoad,
  ExtractedEntities,
  IntentAnalysis,
  ConstraintData,
  ConstraintType
} from '../types';
import type { NormalizedInput } from '../input';

// Input type detection patterns
const INPUT_TYPE_PATTERNS: Record<InputType, RegExp[]> = {
  command: [
    /^(צריך|חייב|רוצה|תעשה|תזכיר|תקבע|תוסיף|תמחק|בטל)/,
    /^(לקבוע|להוסיף|למחוק|לשנות|להזיז)/
  ],
  thought: [
    /(אני חושב|נראה לי|אולי|יכול להיות|לא בטוח)/,
    /(מה דעתך|איך זה נשמע)/
  ],
  question: [
    /^(מה|מתי|איפה|למה|איך|האם|כמה)/,
    /\?$/
  ],
  correction: [
    /(לא התכוונתי|טעות|תתקן|שינוי|בעצם לא)/,
    /(לא ככה|לא זה|אחרת)/
  ],
  emotional_dump: [
    /(נמאס|עייף|לחוץ|מותש|קורס|אין לי כוח)/,
    /(לא מסוגל|הכל נופל|עומס|מטורף|קשה לי)/,
    /(תקוע|אבוד|לא יודע מה לעשות)/
  ]
};

// Primary intent patterns
const INTENT_PATTERNS: Record<PrimaryIntent, RegExp[]> = {
  create_task: [
    /(צריך ל|חייב ל|לעשות|לקנות|לשלוח|לסיים|להתקשר)/,
    /(משימה|דבר לעשות)/
  ],
  create_event: [
    /(פגישה|תור|אירוע|מפגש|ישיבה)/,
    /(נפגש|להיפגש|קבענו|לקבוע)/
  ],
  reschedule: [
    /(להזיז|לדחות|להקדים|לשנות זמן)/,
    /(במקום|במקום ב|לא ב.*אלא ב)/
  ],
  inquire: [
    /(מה יש לי|מתי|איפה|כמה זמן)/,
    /(תראה לי|מה התוכנית|מה קורה)/
  ],
  cancel: [
    /(לבטל|למחוק|להוריד|לא צריך)/,
    /(בטל|מחק|הורד)/
  ],
  complete_task: [
    /(סיימתי|עשיתי|בוצע|נעשה|גמרתי)/
  ],
  decompose_task: [
    /(פרק לי|תפרק|תפרט|שלבים|צעדים)/
  ],
  journal_entry: [
    /(מרגיש|חושב על|עובר עלי|היה לי)/
  ],
  set_constraint: [
    /(חייב עד|לא יאוחר מ|רק ב|אל תשים|לפני|אחרי)/,
    /(בבוקר אני|בערב אין לי|צריך זמן נסיעה)/
  ],
  manage_day: [
    /(תכנן לי|סדר לי|ארגן לי|מה עושים היום)/,
    /(איך נראה היום|תוכנית ליום)/
  ],
  unknown: []
};

// Commitment level indicators
const COMMITMENT_INDICATORS = {
  high: [
    'חייב', 'מוכרח', 'בהכרח', 'קריטי', 'דחוף', 'עכשיו', 
    'היום', 'מיד', 'חשוב מאוד', 'לא יכול בלי'
  ],
  medium: [
    'צריך', 'רוצה', 'כדאי', 'אמור', 'מתוכנן', 'אולי היום'
  ],
  low: [
    'אולי', 'מתישהו', 'כשיהיה זמן', 'לא דחוף', 'בעתיד',
    'יכול לחכות', 'אם יהיה זמן'
  ]
};

// Constraint patterns
const CONSTRAINT_PATTERNS: Record<ConstraintType, RegExp[]> = {
  deadline: [
    /(חייב עד|לא יאוחר מ|להגיש עד|לפני סוף)/
  ],
  must_be_at_place_by: [
    /(צריך להיות ב.*עד|חייב להגיע ל.*ב|להיות כבר ב)/
  ],
  allowed_window: [
    /(רק ב|רק אחרי|בין.*ל)/
  ],
  forbidden_window: [
    /(אל תשים.*ב|אחרי.*לא|לא אחרי)/
  ],
  precedence: [
    /(קודם.*ואז|רק אחרי ש|אל תשנה.*סדר)/
  ],
  energy_profile: [
    /(בבוקר אני|בערב אין לי|בצהריים אני)/
  ],
  travel_buffer: [
    /(צריך זמן נסיעה|זה רחוק|נסיעה של)/
  ],
  trigger_after_meal: [
    /(אחרי (ה)?אוכל|לפני (ה)?אוכל|כדור אחרי)/
  ],
  home_work_block: [
    /(כשאני מגיע הביתה|שעה שקטה בבית|מרחב עבודה)/
  ],
  reduced_load_day: [
    /(אין לי קיבולת|אני קורס|יום לא מתפקד)/
  ]
};

// Time patterns
const TIME_PATTERNS = [
  /ב-?(\d{1,2}):?(\d{2})?/,
  /בשעה\s*(\d{1,2}):?(\d{2})?/,
  /(בוקר|צהריים|ערב|לילה)/
];

// Date patterns
const DATE_PATTERNS = [
  /היום/,
  /מחר/,
  /מחרתיים/,
  /יום (ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)/,
  /בתאריך\s*(\d{1,2})[\/.-](\d{1,2})/
];

// Duration patterns
const DURATION_PATTERNS = [
  /(\d+)\s*(דקות|דק'|דק)/,
  /(\d+)\s*(שעות|שעה)/,
  /(רבע שעה|חצי שעה)/
];

// Location patterns
const LOCATION_PATTERNS = [
  /ב(בית|עבודה|משרד|קניון|מרפאה|בנק|סופר)/,
  /ל(בית|עבודה|משרד)/
];

// People patterns
const PEOPLE_PATTERNS = [
  /עם\s+([א-ת]+)/g,
  /ל([א-ת]+)\s+(להתקשר|לדבר|לשלוח)/
];

function detectInputType(text: string): InputType {
  for (const [type, patterns] of Object.entries(INPUT_TYPE_PATTERNS)) {
    if (patterns.some(p => p.test(text))) {
      return type as InputType;
    }
  }
  return 'command';
}

function detectPrimaryIntent(text: string): PrimaryIntent {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (intent === 'unknown') continue;
    if (patterns.some(p => p.test(text))) {
      return intent as PrimaryIntent;
    }
  }
  return 'unknown';
}

function detectCommitmentLevel(text: string): CommitmentLevel {
  for (const word of COMMITMENT_INDICATORS.high) {
    if (text.includes(word)) return 'high';
  }
  for (const word of COMMITMENT_INDICATORS.low) {
    if (text.includes(word)) return 'low';
  }
  return 'medium';
}

function detectCognitiveLoad(text: string, wordCount: number): CognitiveLoad {
  const hasRepetitions = /(.+)\1{2,}/.test(text);
  const hasLongSentences = wordCount > 20;
  const hasEmotionalWords = INPUT_TYPE_PATTERNS.emotional_dump.some(p => p.test(text));
  
  let score = 0;
  if (hasRepetitions) score += 2;
  if (hasLongSentences) score += 1;
  if (hasEmotionalWords) score += 2;
  if (wordCount > 30) score += 1;
  
  if (score >= 3) return 'high';
  if (score >= 1) return 'medium';
  return 'low';
}

function extractTime(text: string): string | undefined {
  for (const pattern of TIME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      if (match[1] && /\d/.test(match[1])) {
        const hour = match[1];
        const minutes = match[2] || '00';
        return `${hour.padStart(2, '0')}:${minutes}`;
      }
      if (match[0].includes('בוקר')) return '09:00';
      if (match[0].includes('צהריים')) return '12:00';
      if (match[0].includes('ערב')) return '18:00';
      if (match[0].includes('לילה')) return '21:00';
    }
  }
  return undefined;
}

function extractDate(text: string): string | undefined {
  const today = new Date();
  
  if (/היום/.test(text)) {
    return today.toISOString().split('T')[0];
  }
  if (/מחר/.test(text)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  if (/מחרתיים/.test(text)) {
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return dayAfter.toISOString().split('T')[0];
  }
  
  const dateMatch = text.match(/בתאריך\s*(\d{1,2})[\/.-](\d{1,2})/);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2].padStart(2, '0');
    const year = today.getFullYear();
    return `${year}-${month}-${day}`;
  }
  
  return undefined;
}

function extractDuration(text: string): number | undefined {
  for (const pattern of DURATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].includes('רבע שעה')) return 15;
      if (match[0].includes('חצי שעה')) return 30;
      
      const num = parseInt(match[1]);
      if (match[2]?.includes('שע')) return num * 60;
      return num;
    }
  }
  return undefined;
}

function extractLocation(text: string): string | undefined {
  for (const pattern of LOCATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return undefined;
}

function extractPeople(text: string): string[] {
  const people: string[] = [];
  const withMatch = text.matchAll(/עם\s+([א-ת]+)/g);
  for (const match of withMatch) {
    if (match[1] && match[1].length > 1) {
      people.push(match[1]);
    }
  }
  return people;
}

function extractTaskName(text: string, intent: PrimaryIntent): string | undefined {
  let cleaned = text
    .replace(/היום|מחר|מחרתיים/g, '')
    .replace(/ב-?\d{1,2}:\d{2}/g, '')
    .replace(/בשעה\s*\d{1,2}/g, '')
    .replace(/צריך ל|חייב ל|רוצה ל/g, '')
    .trim();
  
  const words = cleaned.split(' ').filter(w => w.length > 1);
  if (words.length > 0 && words.length <= 6) {
    return words.join(' ');
  }
  if (words.length > 6) {
    return words.slice(0, 6).join(' ');
  }
  return undefined;
}

function extractConstraints(text: string): ConstraintData[] {
  const constraints: ConstraintData[] = [];
  
  for (const [type, patterns] of Object.entries(CONSTRAINT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        constraints.push({
          type: type as ConstraintType,
          details: { rawMatch: text.match(pattern)?.[0] }
        });
        break;
      }
    }
  }
  
  return constraints;
}

function detectMissingInfo(
  intent: PrimaryIntent, 
  entities: ExtractedEntities
): string[] {
  const missing: string[] = [];
  
  if (intent === 'create_event' || intent === 'create_task') {
    if (!entities.date && !entities.time) {
      missing.push('time_or_date');
    }
    if (!entities.task_name) {
      missing.push('task_name');
    }
  }
  
  if (intent === 'create_event') {
    if (!entities.duration) {
      missing.push('duration');
    }
  }
  
  if (intent === 'reschedule') {
    if (!entities.date && !entities.time) {
      missing.push('new_time');
    }
  }
  
  return missing;
}

function calculateConfidence(
  inputType: InputType,
  intent: PrimaryIntent,
  entities: ExtractedEntities,
  missingInfo: string[]
): number {
  let score = 0.5;
  
  if (intent !== 'unknown') score += 0.2;
  if (entities.date || entities.time) score += 0.1;
  if (entities.task_name) score += 0.1;
  if (missingInfo.length === 0) score += 0.1;
  if (inputType === 'command') score += 0.05;
  
  return Math.min(score, 1.0);
}

export function analyzeIntent(input: NormalizedInput): IntentAnalysis {
  const text = input.cleanedText;
  
  const inputType = detectInputType(text);
  const primaryIntent = detectPrimaryIntent(text);
  const commitmentLevel = detectCommitmentLevel(text);
  const cognitiveLoad = detectCognitiveLoad(text, input.wordCount);
  
  const entities: ExtractedEntities = {
    time: extractTime(text),
    date: extractDate(text),
    duration: extractDuration(text),
    people: extractPeople(text),
    location: extractLocation(text),
    task_name: extractTaskName(text, primaryIntent),
    constraints: extractConstraints(text)
  };
  
  const missingInfo = detectMissingInfo(primaryIntent, entities);
  const confidenceScore = calculateConfidence(inputType, primaryIntent, entities, missingInfo);
  
  return {
    inputType,
    primaryIntent,
    commitmentLevel,
    entities,
    cognitiveLoad,
    missingInfo,
    confidenceScore,
    rawText: input.text
  };
}

export class IntentEngine {
  async process(input: NormalizedInput): Promise<IntentAnalysis> {
    return analyzeIntent(input);
  }
}

// READY FOR NEXT LAYER: Decision Engine
