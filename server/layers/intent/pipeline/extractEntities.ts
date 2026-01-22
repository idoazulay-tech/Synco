// Step 5: Entity extraction

import type { ExtractedEntities, ConstraintData, ConstraintType } from '../types';
import { 
  TIME_PATTERNS, 
  DATE_PATTERNS, 
  DURATION_PATTERNS,
  PEOPLE_PATTERNS,
  LOCATION_PATTERNS,
  CONSTRAINT_PATTERNS,
  HEBREW_NUMBERS
} from '../rules/patterns';
import { URGENCY_KEYWORDS, MUST_KEYWORDS, ACTION_VERBS } from '../rules/keywords';

function hebrewToNumber(word: string): number | null {
  return HEBREW_NUMBERS[word] ?? null;
}

function extractTime(text: string): { raw: string; normalized: string; confidence: number } {
  let match = text.match(TIME_PATTERNS.explicit);
  if (match) {
    const hour = parseInt(match[1]);
    const minute = match[2] ? match[2].substring(1) : '00';
    return { raw: match[0], normalized: `${hour.toString().padStart(2, '0')}:${minute}`, confidence: 0.95 };
  }
  
  match = text.match(TIME_PATTERNS.hebrewWords);
  if (match) {
    const num = hebrewToNumber(match[1]);
    if (num !== null) {
      const hour = num < 7 ? num + 12 : num;
      return { raw: match[0], normalized: `${hour.toString().padStart(2, '0')}:00`, confidence: 0.85 };
    }
  }
  
  match = text.match(TIME_PATTERNS.short);
  if (match) {
    const hour = parseInt(match[1]);
    const minute = match[2] ? match[2].substring(1) : '00';
    const adjustedHour = hour < 7 ? hour + 12 : hour;
    return { raw: match[0], normalized: `${adjustedHour.toString().padStart(2, '0')}:${minute}`, confidence: 0.8 };
  }
  
  return { raw: '', normalized: '', confidence: 0 };
}

function extractDate(text: string): { raw: string; normalized: string; confidence: number } {
  const today = new Date();
  
  if (DATE_PATTERNS.today.test(text)) {
    return { raw: 'היום', normalized: today.toISOString().split('T')[0], confidence: 0.95 };
  }
  
  if (DATE_PATTERNS.tomorrow.test(text)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { raw: 'מחר', normalized: tomorrow.toISOString().split('T')[0], confidence: 0.95 };
  }
  
  if (DATE_PATTERNS.dayAfter.test(text)) {
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return { raw: 'מחרתיים', normalized: dayAfter.toISOString().split('T')[0], confidence: 0.95 };
  }
  
  const dayMatch = text.match(DATE_PATTERNS.dayName);
  if (dayMatch) {
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const dayIndex = dayNames.findIndex(d => dayMatch[2] === d);
    if (dayIndex >= 0) {
      const currentDay = today.getDay();
      let daysToAdd = dayIndex - currentDay;
      if (daysToAdd <= 0 || dayMatch[4]) daysToAdd += 7;
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      return { raw: dayMatch[0], normalized: targetDate.toISOString().split('T')[0], confidence: 0.85 };
    }
  }
  
  return { raw: '', normalized: '', confidence: 0 };
}

function extractDuration(text: string): { raw: string; normalized: number; confidence: number } {
  if (DURATION_PATTERNS.halfHour.test(text)) {
    return { raw: 'חצי שעה', normalized: 30, confidence: 0.95 };
  }
  
  if (DURATION_PATTERNS.hourAndHalf.test(text)) {
    return { raw: 'שעה וחצי', normalized: 90, confidence: 0.95 };
  }
  
  if (DURATION_PATTERNS.quarterHour.test(text)) {
    return { raw: 'רבע שעה', normalized: 15, confidence: 0.95 };
  }
  
  let match = text.match(DURATION_PATTERNS.minutes);
  if (match) {
    return { raw: match[0], normalized: parseInt(match[1]), confidence: 0.9 };
  }
  
  match = text.match(DURATION_PATTERNS.hours);
  if (match) {
    return { raw: match[0], normalized: parseInt(match[1]) * 60, confidence: 0.9 };
  }
  
  return { raw: '', normalized: 0, confidence: 0 };
}

function extractPeople(text: string): { raw: string; normalized: string[]; confidence: number } {
  const people: string[] = [];
  let raw = '';
  
  const withMatch = text.match(PEOPLE_PATTERNS.withPerson);
  if (withMatch) {
    people.push(withMatch[1]);
    raw = withMatch[0];
  }
  
  return { raw, normalized: people, confidence: people.length > 0 ? 0.8 : 0 };
}

function extractLocation(text: string): { raw: string; normalized: string; confidence: number } {
  for (const [, pattern] of Object.entries(LOCATION_PATTERNS)) {
    const match = text.match(pattern);
    if (match) {
      return { raw: match[0], normalized: match[1] || match[0], confidence: 0.85 };
    }
  }
  
  return { raw: '', normalized: '', confidence: 0 };
}

function extractTaskName(text: string): { raw: string; normalized: string; confidence: number } {
  for (const verb of ACTION_VERBS) {
    const pattern = new RegExp(`${verb}\\s+([^,\\.]+)`, 'i');
    const match = text.match(pattern);
    if (match) {
      const taskName = `${verb} ${match[1]}`.trim();
      const words = taskName.split(' ').slice(0, 6);
      return { raw: match[0], normalized: words.join(' '), confidence: 0.85 };
    }
  }
  
  return { raw: '', normalized: '', confidence: 0 };
}

function extractUrgency(text: string): { raw: string; normalized: 'low' | 'medium' | 'high'; confidence: number } {
  for (const kw of URGENCY_KEYWORDS.high) {
    if (text.includes(kw)) {
      return { raw: kw, normalized: 'high', confidence: 0.9 };
    }
  }
  
  for (const kw of URGENCY_KEYWORDS.medium) {
    if (text.includes(kw)) {
      return { raw: kw, normalized: 'medium', confidence: 0.8 };
    }
  }
  
  for (const kw of URGENCY_KEYWORDS.low) {
    if (text.includes(kw)) {
      return { raw: kw, normalized: 'low', confidence: 0.8 };
    }
  }
  
  return { raw: '', normalized: 'low', confidence: 0 };
}

function extractMust(text: string): { raw: string; normalized: boolean; confidence: number } {
  for (const kw of MUST_KEYWORDS) {
    if (text.includes(kw)) {
      return { raw: kw, normalized: true, confidence: 0.9 };
    }
  }
  
  return { raw: '', normalized: false, confidence: 0 };
}

function extractConstraints(text: string): ConstraintData[] {
  const constraints: ConstraintData[] = [];
  
  const deadlineMatch = text.match(CONSTRAINT_PATTERNS.deadline);
  if (deadlineMatch) {
    constraints.push({
      type: 'deadline' as ConstraintType,
      details: { deadline_time: deadlineMatch[2], rawMatch: deadlineMatch[0] }
    });
  }
  
  const hebrewTimeNumbers: Record<string, string> = {
    'אחת': '13', 'שתיים': '14', 'שלוש': '15', 'ארבע': '16', 'חמש': '17',
    'שש': '18', 'שבע': '19', 'שמונה': '20', 'תשע': '21', 'עשר': '22'
  };
  
  const windowMatch = text.match(CONSTRAINT_PATTERNS.allowedWindow);
  if (windowMatch) {
    let startHour = windowMatch[2];
    if (hebrewTimeNumbers[startHour]) {
      startHour = hebrewTimeNumbers[startHour];
    }
    constraints.push({
      type: 'allowed_window' as ConstraintType,
      details: { start: startHour.padStart(2, '0') + ':00', end: null, rawMatch: windowMatch[0] }
    });
  }
  
  const forbiddenMatch = text.match(CONSTRAINT_PATTERNS.forbiddenWindow);
  if (forbiddenMatch) {
    constraints.push({
      type: 'forbidden_window' as ConstraintType,
      details: { period: forbiddenMatch[1] || forbiddenMatch[2], rawMatch: forbiddenMatch[0] }
    });
  }
  
  const energyMatch = text.match(CONSTRAINT_PATTERNS.energyProfile);
  if (energyMatch) {
    constraints.push({
      type: 'energy_profile' as ConstraintType,
      details: { rawMatch: energyMatch[0] }
    });
  }
  
  const reducedMatch = text.match(CONSTRAINT_PATTERNS.reducedLoad);
  if (reducedMatch) {
    constraints.push({
      type: 'reduced_load_day' as ConstraintType,
      details: { rawMatch: reducedMatch[0] }
    });
  }
  
  return constraints;
}

export function extractEntities(text: string): ExtractedEntities {
  const time = extractTime(text);
  const date = extractDate(text);
  const duration = extractDuration(text);
  const people = extractPeople(text);
  const location = extractLocation(text);
  const taskName = extractTaskName(text);
  const urgency = extractUrgency(text);
  const must = extractMust(text);
  const constraints = extractConstraints(text);
  
  return {
    time: { raw: time.raw, normalized: time.normalized, confidence: time.confidence },
    date: { raw: date.raw, normalized: date.normalized, confidence: date.confidence },
    duration: { raw: duration.raw, normalized: duration.normalized, confidence: duration.confidence },
    people: { raw: people.raw, normalized: people.normalized, confidence: people.confidence },
    location: { raw: location.raw, normalized: location.normalized, confidence: location.confidence },
    taskName: { raw: taskName.raw, normalized: taskName.normalized, confidence: taskName.confidence },
    urgency: { raw: urgency.raw, normalized: urgency.normalized, confidence: urgency.confidence },
    must: { raw: must.raw, normalized: must.normalized, confidence: must.confidence },
    constraints
  };
}
