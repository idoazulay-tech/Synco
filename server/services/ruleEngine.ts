export type Intent = 
  | 'CREATE_TASK'
  | 'FREE_TEXT'
  | 'MOVE_TASK'
  | 'SCHEDULE_TASK'
  | 'COMPLETE_TASK'
  | 'DEFER_TASK'
  | 'UNKNOWN';

export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskType = 'meeting' | 'appointment' | 'errand' | 'task' | 'reminder';

export interface ExtractedData {
  title?: string;
  dueAt?: Date;
  urgency?: Urgency;
  entities?: string[];
  duration?: number;
  taskType?: TaskType;
  location?: string;
  participants?: string[];
  allDay?: boolean;
  confidence?: 'high' | 'medium' | 'low';
}

export interface LearningLog {
  new_time_phrases: string[];
  new_date_phrases: string[];
  new_location_phrases: string[];
  new_task_phrases: string[];
  unclassified_phrases: string[];
}

export interface InterpretResult {
  intent: Intent;
  extracted: ExtractedData;
  autoAction: boolean;
  needsApproval: boolean;
  needs_clarification: boolean;
  clarifying_question: string | null;
  questions?: string[];
  insights: {
    summary: string;
    detected: Record<string, unknown>;
  };
  learning_log: LearningLog;
}

interface UserContext {
  currentTaskId?: string;
  lastActivity?: Date;
  preferences?: Record<string, unknown>;
}

const TASK_PATTERNS = [
  /תכניס\s*לי\s*משימה/,
  /אני\s*צריך/,
  /תזכיר\s*לי/,
  /צריך\s*ל/,
  /חייב\s*ל/,
  /לעשות/,
  /משימה[:\s]/,
  /תוסיף/,
  /להוסיף/,
];

const CRITICAL_PATTERNS = [
  /דחוף/,
  /חייב\s*עכשיו/,
  /קריטי/,
  /מיידי/,
  /אורגנטי/,
  /בוער/,
  /חירום/,
];

const HIGH_PATTERNS = [
  /חשוב/,
  /מהר/,
  /בהקדם/,
  /היום/,
];

const COMPLETE_PATTERNS = [
  /סיימתי/,
  /עשיתי/,
  /בוצע/,
  /הושלם/,
  /גמרתי/,
];

const DEFER_PATTERNS = [
  /דחה/,
  /תעביר/,
  /לא עכשיו/,
  /אחר\s*כך/,
  /מאוחר\s*יותר/,
];

const SCHEDULE_PATTERNS = [
  /תקבע/,
  /לתזמן/,
  /בשעה/,
  /ביום/,
  /מחר/,
  /מחרתיים/,
];

const TYPE_HINTS: Record<TaskType, RegExp[]> = {
  meeting: [/פגישה/, /ישיבה/, /שיחה/, /זום/, /וידאו/, /ראיון/, /ועידה/],
  appointment: [/תור/, /רופא/, /בדיקה/, /מרפאה/, /קליניקה/, /טיפול/, /בנק/, /עירייה/],
  errand: [/לקנות/, /לאסוף/, /להביא/, /להחזיר/, /למסור/, /דואר/, /סופר/, /קניות/, /סידור/, /מוסך/],
  task: [/לעשות/, /לסיים/, /להתחיל/, /לטפל/, /להכין/, /לשלוח/, /להתקשר/, /לסדר/, /לארגן/],
  reminder: [/תזכיר לי/, /לא לשכוח/, /תזכורת/, /אל תשכח/]
};

const LOCATION_PATTERNS = [
  /ב(כתובת|מיקום|משרד|סניף|חנות|קניון|פארק|רחוב|שדרות)\s+([^,\.]+)/,
  /אצל\s+(ה)?([^,\.]+)/,
  /(ליד|מול|על יד)\s+([^,\.]+)/,
];

const PARTICIPANT_PATTERNS = [
  /עם\s+([א-ת]+(?:\s+[א-ת]+)?)/,
  /פגישה\s+עם\s+([א-ת]+(?:\s+[א-ת]+)?)/,
  /שיחה\s+עם\s+([א-ת]+(?:\s+[א-ת]+)?)/,
];

const FILLER_WORDS = ['אממ', 'אה', 'כאילו', 'טוב', 'רגע', 'רק', 'פשוט', 'בעצם', 'כזה', 'זה'];

const hebrewDays: Record<string, number> = {
  'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3,
  'חמישי': 4, 'שישי': 5, 'שבת': 6
};

function extractDate(text: string): Date | undefined {
  const now = new Date();
  
  if (/היום/.test(text)) {
    return now;
  }
  
  if (/מחרתיים/.test(text)) {
    const date = new Date(now);
    date.setDate(date.getDate() + 2);
    return date;
  }
  
  if (/מחר/.test(text)) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return date;
  }
  
  const dayMatch = text.match(/יום\s+(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)/);
  if (dayMatch) {
    const targetDay = hebrewDays[dayMatch[1]];
    const currentDay = now.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7;
    const date = new Date(now);
    date.setDate(date.getDate() + daysToAdd);
    return date;
  }
  
  const timeMatch = text.match(/(?:בשעה\s*|ב-?)(\d{1,2})(?::(\d{2}))?/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const date = new Date(now);
    date.setHours(hours, minutes, 0, 0);
    if (date < now) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  }
  
  return undefined;
}

function extractUrgency(text: string): Urgency {
  if (CRITICAL_PATTERNS.some(p => p.test(text))) return 'CRITICAL';
  if (HIGH_PATTERNS.some(p => p.test(text))) return 'HIGH';
  return 'MEDIUM';
}

function extractTaskType(text: string): TaskType {
  for (const [type, patterns] of Object.entries(TYPE_HINTS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return type as TaskType;
      }
    }
  }
  return 'task';
}

function extractLocation(text: string): string | undefined {
  for (const pattern of LOCATION_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      const location = match[match.length - 1]?.trim();
      if (location && location.length > 1) {
        return location;
      }
    }
  }
  return undefined;
}

function extractParticipants(text: string): string[] {
  const participants: string[] = [];
  for (const pattern of PARTICIPANT_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      const participant = match[1]?.trim();
      if (participant && participant.length > 1) {
        participants.push(participant);
      }
    }
  }
  return participants;
}

function cleanFillerWords(text: string): string {
  let cleaned = text;
  for (const filler of FILLER_WORDS) {
    cleaned = cleaned.replace(new RegExp(`\\b${filler}\\b`, 'g'), '');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

function extractTitle(text: string, taskType?: TaskType, participants?: string[]): string {
  let title = text;
  
  const prefixes = [
    /^תכניס\s*לי\s*משימה\s*/,
    /^אני\s*צריך\s*/,
    /^תזכיר\s*לי\s*/,
    /^צריך\s*ל/,
    /^חייב\s*ל/,
    /^תוסיף\s*/,
    /^להוסיף\s*/,
    /^משימה[:\s]*/,
  ];
  
  for (const prefix of prefixes) {
    title = title.replace(prefix, '');
  }
  
  title = title
    .replace(/\s*(מחר|מחרתיים|היום)\s*/g, ' ')
    .replace(/\s*בשעה\s*\d{1,2}(:\d{2})?\s*/g, ' ')
    .replace(/\s*ב-?\d{1,2}(:\d{2})?\s*/g, ' ')
    .replace(/\s*(דחוף|קריטי|חשוב|מיידי)\s*/g, ' ')
    .replace(/\s*(יום\s*)?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)\s*(הבא|הקרוב)?\s*/g, ' ')
    .replace(/\s*בעוד\s+\d+\s*(ימים?|שבועות?|חודשים?)\s*/g, ' ')
    .replace(/\s*(בבוקר|בצהריים|בערב|בלילה)\s*/g, ' ')
    .replace(/\s*ב(כתובת|מיקום|משרד|סניף|חנות|קניון|פארק|רחוב|שדרות)\s+[^,\.]+/g, ' ')
    .replace(/\s*אצל\s+(ה)?[^,\.]+/g, ' ')
    .replace(/\s*(ליד|מול|על יד)\s+[^,\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!title || title.length < 2) {
    const defaultTitles: Record<TaskType, string> = {
      meeting: 'פגישה',
      appointment: 'תור',
      errand: 'סידור',
      task: 'משימה',
      reminder: 'תזכורת'
    };
    title = defaultTitles[taskType || 'task'];
    if (participants && participants.length > 0) {
      title += ` עם ${participants[0]}`;
    }
  }
  
  return title;
}

function detectIntent(text: string): Intent {
  if (COMPLETE_PATTERNS.some(p => p.test(text))) return 'COMPLETE_TASK';
  if (DEFER_PATTERNS.some(p => p.test(text))) return 'DEFER_TASK';
  if (SCHEDULE_PATTERNS.some(p => p.test(text))) return 'SCHEDULE_TASK';
  if (TASK_PATTERNS.some(p => p.test(text))) return 'CREATE_TASK';
  
  const hasActionableWords = /צריך|חייב|לעשות|להכין|לשלוח|להתקשר|לקנות|לבדוק/.test(text);
  if (hasActionableWords) return 'CREATE_TASK';
  
  return 'FREE_TEXT';
}

function generateQuestions(intent: Intent, extracted: ExtractedData): string[] {
  const questions: string[] = [];
  
  if (intent === 'CREATE_TASK') {
    if (!extracted.dueAt) {
      questions.push('מתי תרצה לבצע את המשימה?');
    }
    if (!extracted.title || extracted.title.length < 5) {
      questions.push('תוכל לפרט יותר מה המשימה?');
    }
  }
  
  if (intent === 'FREE_TEXT') {
    questions.push('האם זו משימה שצריך לבצע?');
    questions.push('או שזו מחשבה שרצית לשמור?');
  }
  
  return questions;
}

function generateSummary(intent: Intent, extracted: ExtractedData, text: string): string {
  switch (intent) {
    case 'CREATE_TASK':
      if (extracted.dueAt) {
        return `זיהיתי משימה: "${extracted.title}" לביצוע ב-${extracted.dueAt.toLocaleDateString('he-IL')}`;
      }
      return `זיהיתי משימה: "${extracted.title}"`;
    
    case 'COMPLETE_TASK':
      return 'הבנתי שסיימת משימה';
    
    case 'DEFER_TASK':
      return 'הבנתי שרוצה לדחות משימה';
    
    case 'SCHEDULE_TASK':
      return 'הבנתי שרוצה לתזמן משימה';
    
    case 'FREE_TEXT':
      return `קיבלתי את המחשבה: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`;
    
    default:
      return 'לא הצלחתי להבין לגמרי, אפשר לפרט?';
  }
}

export function interpretInput(text: string, userContext?: UserContext): InterpretResult {
  const normalizedText = cleanFillerWords(text.trim());
  
  const intent = detectIntent(normalizedText);
  const urgency = extractUrgency(normalizedText);
  const dueAt = extractDate(normalizedText);
  const taskType = extractTaskType(normalizedText);
  const location = extractLocation(normalizedText);
  const participants = extractParticipants(normalizedText);
  const title = extractTitle(normalizedText, taskType, participants);
  
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if ((taskType === 'meeting' || taskType === 'appointment') && !dueAt) {
    confidence = 'low';
  } else if (!dueAt) {
    confidence = 'medium';
  }
  
  const extracted: ExtractedData = {
    title,
    dueAt,
    urgency,
    taskType,
    location,
    participants: participants.length > 0 ? participants : undefined,
    allDay: !(/\d{1,2}:\d{2}/.test(normalizedText) || /בשעה/.test(normalizedText)),
    confidence,
  };
  
  const questions = generateQuestions(intent, extracted);
  const summary = generateSummary(intent, extracted, normalizedText);
  
  const autoAction = intent === 'CREATE_TASK' && !!dueAt && urgency !== 'CRITICAL';
  const needsApproval = intent === 'CREATE_TASK' && !dueAt;
  
  let needs_clarification = false;
  let clarifying_question: string | null = null;
  
  if ((taskType === 'meeting' || taskType === 'appointment') && !dueAt) {
    needs_clarification = true;
    clarifying_question = 'מתי תרצה לקבוע את זה?';
  } else if (intent === 'CREATE_TASK' && !dueAt && !title) {
    needs_clarification = true;
    clarifying_question = 'מה המשימה שצריך לעשות?';
  }
  
  const learning_log: LearningLog = {
    new_time_phrases: [],
    new_date_phrases: [],
    new_location_phrases: [],
    new_task_phrases: [],
    unclassified_phrases: []
  };
  
  return {
    intent,
    extracted,
    autoAction,
    needsApproval,
    needs_clarification,
    clarifying_question,
    questions: questions.length > 0 ? questions : undefined,
    insights: {
      summary,
      detected: {
        originalText: normalizedText,
        detectedIntent: intent,
        detectedUrgency: urgency,
        detectedTaskType: taskType,
        hasDate: !!dueAt,
        hasTime: /\d{1,2}:\d{2}/.test(normalizedText),
        hasLocation: !!location,
        hasParticipants: participants.length > 0,
        wordCount: normalizedText.split(/\s+/).length,
        timestamp: new Date().toISOString(),
      }
    },
    learning_log
  };
}
