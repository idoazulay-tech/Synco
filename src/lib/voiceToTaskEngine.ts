import { startOfDay, addDays, addWeeks, addMonths, setHours, setMinutes, getDay, nextDay } from 'date-fns';

export interface VoiceTaskResult {
  title: string;
  start_date: string | null;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  all_day: boolean;
  location: string | null;
  participants: string[];
  type: 'meeting' | 'appointment' | 'errand' | 'task' | 'reminder';
  notes: string | null;
  source: 'voice';
  confidence: 'high' | 'medium' | 'low';
  needs_clarification: boolean;
  clarifying_question: string | null;
  learning_log: {
    new_time_phrases: string[];
    new_date_phrases: string[];
    new_location_phrases: string[];
    new_task_phrases: string[];
    unclassified_phrases: string[];
  };
}

const TIME_SIGNALS = [
  'בשעה', 'ב-', 'שעה', 'בשעות', 'בסביבות', 'בערך', 'אזור', 'פלוס מינוס',
  'לפני', 'אחרי', 'בבוקר', 'בצהריים', 'אחהצ', 'אחר הצהריים', 'בערב', 'בלילה',
  'לפנות בוקר', 'בסוף היום'
];

const TIME_EXPRESSIONS: Record<string, number> = {
  'אחת': 1, 'שתיים': 2, 'שלוש': 3, 'ארבע': 4, 'חמש': 5, 'שש': 6,
  'שבע': 7, 'שמונה': 8, 'תשע': 9, 'עשר': 10, 'אחת עשרה': 11, 'שתים עשרה': 12
};

const TIME_MODIFIERS: Record<string, number> = {
  'וחצי': 30, 'ורבע': 15, 'רבע ל': -15, 'חמש דקות': 5, 'עשר דקות': 10,
  'עשרים': 20, 'עשרה': 10
};

const DAY_MAP: Record<string, number> = {
  'ראשון': 0, 'יום ראשון': 0, "א'": 0,
  'שני': 1, 'יום שני': 1, "ב'": 1,
  'שלישי': 2, 'יום שלישי': 2, "ג'": 2,
  'רביעי': 3, 'יום רביעי': 3, "ד'": 3,
  'חמישי': 4, 'יום חמישי': 4, "ה'": 4,
  'שישי': 5, 'יום שישי': 5, "ו'": 5,
  'שבת': 6
};

const LOCATION_SIGNALS = [
  'בכתובת', 'כתובת', 'מיקום', 'נפגשים ב', 'פגישה ב', 'תתקיים ב', 'מתקיים ב',
  'אצל', 'אצל ה', 'במשרד', 'בסניף', 'בחנות', 'בקניון', 'בפארק', 'ברחוב',
  'בשדרות', 'בדרך', 'ליד', 'מול', 'על יד', 'קומה', 'דירה'
];

const LOCATION_TOKENS = [
  'רחוב', "רח'", 'שדרות', 'דרך', 'מספר', "מס'", 'קניון', 'מרכז', 'סניף',
  'תל אביב', 'ירושלים', 'חיפה', 'נתניה', 'באר שבע', 'אשדוד', 'אילת',
  'רמת גן', 'גבעתיים', 'חולון', 'בת ים', 'הרצליה', 'כפר סבא', 'רעננה'
];

const PARTICIPANT_SIGNALS = ['עם', 'מול', 'פגישה עם', 'שיחה עם', 'נפגש עם', 'לקבוע עם'];

const TYPE_HINTS: Record<string, string[]> = {
  meeting: ['פגישה', 'ישיבה', 'שיחה', 'זום', 'וידאו', 'ראיון', 'ועידה'],
  appointment: ['תור', 'רופא', 'בדיקה', 'מרפאה', 'קליניקה', 'טיפול', 'בנק', 'עירייה'],
  errand: ['לקנות', 'לאסוף', 'להביא', 'להחזיר', 'למסור', 'דואר', 'סופר', 'קניות', 'סידור', 'מוסך'],
  task: ['לעשות', 'לסיים', 'להתחיל', 'לטפל', 'להכין', 'לשלוח', 'להתקשר', 'לסדר', 'לארגן'],
  reminder: ['תזכיר לי', 'לא לשכוח', 'תזכורת', 'אל תשכח']
};

const FILLER_WORDS = ['אממ', 'אה', 'כאילו', 'טוב', 'רגע', 'רק', 'פשוט', 'בעצם', 'כזה', 'זה'];

const DEFAULT_TITLES: Record<string, string> = {
  meeting: 'פגישה',
  appointment: 'תור',
  errand: 'סידור',
  task: 'משימה',
  reminder: 'תזכורת'
};

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(hours: number, minutes: number = 0): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseVoiceToTask(transcript: string): VoiceTaskResult {
  const now = new Date();
  const learningLog = {
    new_time_phrases: [] as string[],
    new_date_phrases: [] as string[],
    new_location_phrases: [] as string[],
    new_task_phrases: [] as string[],
    unclassified_phrases: [] as string[]
  };

  let workingText = transcript.trim();
  let extractedDate: Date | null = null;
  let extractedTime: { hours: number; minutes: number } | null = null;
  let extractedLocation: string | null = null;
  let extractedParticipants: string[] = [];
  type TaskType = 'meeting' | 'appointment' | 'errand' | 'task' | 'reminder';
  let taskType: TaskType = 'task';
  let confidence: 'high' | 'medium' | 'low' = 'high';
  let needsClarification = false;
  let clarifyingQuestion: string | null = null;

  outer: for (const [type, hints] of Object.entries(TYPE_HINTS)) {
    for (const hint of hints) {
      if (workingText.includes(hint)) {
        taskType = type as TaskType;
        break outer;
      }
    }
  }

  if (workingText.includes('היום')) {
    extractedDate = startOfDay(now);
    workingText = workingText.replace(/היום/g, '');
  } else if (workingText.includes('מחרתיים')) {
    extractedDate = addDays(startOfDay(now), 2);
    workingText = workingText.replace(/מחרתיים/g, '');
  } else if (workingText.includes('מחר')) {
    extractedDate = addDays(startOfDay(now), 1);
    workingText = workingText.replace(/מחר/g, '');
  } else if (workingText.includes('שבוע הבא')) {
    extractedDate = addWeeks(startOfDay(now), 1);
    workingText = workingText.replace(/שבוע הבא/g, '');
  } else if (workingText.includes('חודש הבא')) {
    extractedDate = addMonths(startOfDay(now), 1);
    workingText = workingText.replace(/חודש הבא/g, '');
  }

  const dayNextPattern = /(יום\s*)?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)\s*(הבא|הקרוב)?/g;
  const dayMatch = dayNextPattern.exec(workingText);
  if (dayMatch) {
    const dayName = dayMatch[2];
    const targetDay = DAY_MAP[dayName];
    if (targetDay !== undefined) {
      const currentDay = getDay(now);
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      extractedDate = addDays(startOfDay(now), daysToAdd);
      workingText = workingText.replace(dayMatch[0], '');
    }
  }

  const inDaysPattern = /בעוד\s+(\d+)\s*(ימים?|שבועות?|חודשים?)/;
  const inDaysMatch = inDaysPattern.exec(workingText);
  if (inDaysMatch) {
    const amount = parseInt(inDaysMatch[1], 10);
    const unit = inDaysMatch[2];
    if (unit.startsWith('יום') || unit.startsWith('ימ')) {
      extractedDate = addDays(startOfDay(now), amount);
    } else if (unit.startsWith('שבוע')) {
      extractedDate = addWeeks(startOfDay(now), amount);
    } else if (unit.startsWith('חודש')) {
      extractedDate = addMonths(startOfDay(now), amount);
    }
    workingText = workingText.replace(inDaysMatch[0], '');
  }

  const numericTimePattern = /ב-?(\d{1,2}):?(\d{2})?\s*(בבוקר|בצהריים|בערב|בלילה)?/;
  const numericTimeMatch = numericTimePattern.exec(workingText);
  if (numericTimeMatch) {
    let hours = parseInt(numericTimeMatch[1], 10);
    const minutes = numericTimeMatch[2] ? parseInt(numericTimeMatch[2], 10) : 0;
    const period = numericTimeMatch[3];
    
    if (period) {
      if ((period === 'בערב' || period === 'בלילה') && hours < 12) {
        hours += 12;
      } else if (period === 'בבוקר' && hours === 12) {
        hours = 0;
      }
    } else if (hours >= 1 && hours <= 6) {
      hours += 12;
    }
    
    extractedTime = { hours, minutes };
    workingText = workingText.replace(numericTimeMatch[0], '');
  }

  if (!extractedTime) {
    for (const [word, hour] of Object.entries(TIME_EXPRESSIONS)) {
      const pattern = new RegExp(`בשעה\\s*${word}|ב-?${word}(?:\\s+(?:וחצי|ורבע))?`, 'g');
      const match = pattern.exec(workingText);
      if (match) {
        let hours = hour;
        let minutes = 0;
        
        if (match[0].includes('וחצי')) {
          minutes = 30;
        } else if (match[0].includes('ורבע')) {
          minutes = 15;
        }
        
        if (hours >= 1 && hours <= 6) {
          hours += 12;
        }
        
        extractedTime = { hours, minutes };
        workingText = workingText.replace(match[0], '');
        break;
      }
    }
  }

  for (const signal of LOCATION_SIGNALS) {
    const pattern = new RegExp(`${signal}\\s+([^,\\.]+)`, 'i');
    const match = pattern.exec(workingText);
    if (match) {
      extractedLocation = match[1].trim();
      workingText = workingText.replace(match[0], '');
      break;
    }
  }

  for (const signal of PARTICIPANT_SIGNALS) {
    const pattern = new RegExp(`${signal}\\s+([א-ת]+(?:\\s+[א-ת]+)?)`, 'i');
    const match = pattern.exec(workingText);
    if (match) {
      extractedParticipants.push(match[1].trim());
      workingText = workingText.replace(match[0], '');
    }
  }

  for (const filler of FILLER_WORDS) {
    workingText = workingText.replace(new RegExp(`\\b${filler}\\b`, 'g'), '');
  }

  for (const signal of TIME_SIGNALS) {
    workingText = workingText.replace(new RegExp(signal, 'g'), '');
  }

  workingText = workingText.replace(/\s+/g, ' ').trim();

  let title = workingText;
  if (!title || title.length < 2) {
    title = DEFAULT_TITLES[taskType];
    if (extractedParticipants.length > 0) {
      title += ` עם ${extractedParticipants[0]}`;
    }
  }

  if ((taskType === 'meeting' || taskType === 'appointment') && !extractedTime) {
    confidence = 'low';
    needsClarification = true;
    clarifyingQuestion = 'באיזו שעה?';
  } else if (!extractedDate) {
    confidence = 'medium';
    extractedDate = startOfDay(now);
  }

  let endTime: string | null = null;
  if (extractedTime) {
    const endHour = extractedTime.hours + 1;
    endTime = formatTime(endHour, extractedTime.minutes);
  }

  return {
    title,
    start_date: extractedDate ? formatDate(extractedDate) : null,
    start_time: extractedTime ? formatTime(extractedTime.hours, extractedTime.minutes) : null,
    end_date: extractedDate ? formatDate(extractedDate) : null,
    end_time: endTime,
    all_day: !extractedTime,
    location: extractedLocation,
    participants: extractedParticipants,
    type: taskType,
    notes: null,
    source: 'voice',
    confidence,
    needs_clarification: needsClarification,
    clarifying_question: clarifyingQuestion,
    learning_log: learningLog
  };
}

export function voiceResultToTask(result: VoiceTaskResult) {
  const now = new Date();
  
  let startTime: Date;
  if (result.start_date && result.start_time) {
    const [year, month, day] = result.start_date.split('-').map(Number);
    const [hours, minutes] = result.start_time.split(':').map(Number);
    startTime = new Date(year, month - 1, day, hours, minutes);
  } else if (result.start_date) {
    const [year, month, day] = result.start_date.split('-').map(Number);
    startTime = new Date(year, month - 1, day, 9, 0);
  } else {
    startTime = now;
  }

  let endTime: Date;
  if (result.end_date && result.end_time) {
    const [year, month, day] = result.end_date.split('-').map(Number);
    const [hours, minutes] = result.end_time.split(':').map(Number);
    endTime = new Date(year, month - 1, day, hours, minutes);
  } else {
    endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
  }

  return {
    id: crypto.randomUUID(),
    title: result.title,
    startTime,
    endTime,
    status: startTime <= now ? 'in_progress' : 'pending' as const,
    tags: [],
    location: result.location || undefined,
    history: [{
      id: crypto.randomUUID(),
      timestamp: now,
      action: 'created' as const,
      details: 'נוצר מקלט קולי'
    }]
  };
}
