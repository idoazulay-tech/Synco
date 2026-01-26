/**
 * Hebrew Temporal Tokenizer
 * Tokenizes and normalizes Hebrew text for temporal parsing
 */

const PUNCTUATION = /[.,;:!?()\[\]{}"""''`]/g;
const MULTIPLE_SPACES = /\s+/g;

export function tokenize(text: string): string[] {
  let cleaned = text
    .replace(PUNCTUATION, ' ')
    .replace(MULTIPLE_SPACES, ' ')
    .trim();
  
  if (!cleaned) return [];
  
  return cleaned.split(' ').filter(t => t.length > 0);
}

export function normalizeTokens(tokens: string[]): string[] {
  const normalized: string[] = [];
  
  for (const token of tokens) {
    if (token.startsWith('ו') && token.length > 1) {
      const rest = token.slice(1);
      if (isHebrewNumber(rest) || isTimeWord(rest)) {
        normalized.push('ו');
        normalized.push(rest);
        continue;
      }
    }
    
    if (token.startsWith('ב') && token.length > 1) {
      const rest = token.slice(1);
      if (isHebrewNumber(rest) || isTimeWord(rest)) {
        normalized.push('ב');
        normalized.push(rest);
        continue;
      }
    }
    
    if (token.startsWith('ל') && token.length > 1) {
      const rest = token.slice(1);
      if (isHebrewNumber(rest)) {
        normalized.push('ל');
        normalized.push(rest);
        continue;
      }
    }
    
    if (token.startsWith('מ') && token.length > 1 && !token.startsWith('מחר')) {
      const rest = token.slice(1);
      if (isHebrewNumber(rest) || /^\d/.test(rest)) {
        normalized.push('מ');
        normalized.push(rest);
        continue;
      }
    }
    
    normalized.push(token);
  }
  
  return normalized;
}

function isHebrewNumber(word: string): boolean {
  const numbers = new Set([
    'אפס', 'אחת', 'אחד', 'שתיים', 'שניים', 'שני', 'שלוש', 'שלושה',
    'ארבע', 'ארבעה', 'חמש', 'חמישה', 'שש', 'שישה', 'שבע', 'שבעה',
    'שמונה', 'תשע', 'תשעה', 'עשר', 'עשרה', 'עשרים', 'שלושים',
    'ארבעים', 'חמישים'
  ]);
  return numbers.has(word);
}

function isTimeWord(word: string): boolean {
  const timeWords = new Set([
    'רבע', 'חצי', 'דקה', 'דקות', 'שעה', 'שעות', 'בוקר', 'ערב',
    'צהריים', 'לילה'
  ]);
  return timeWords.has(word);
}

export function extractDigitalTime(text: string): { hour: number; minute: number; matched: string } | null {
  const colonPattern = text.match(/(\d{1,2}):(\d{2})/);
  if (colonPattern) {
    const hour = parseInt(colonPattern[1], 10);
    const minute = parseInt(colonPattern[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute, matched: colonPattern[0] };
    }
  }
  
  const dotPattern = text.match(/(\d{1,2})\.(\d{2})/);
  if (dotPattern) {
    const hour = parseInt(dotPattern[1], 10);
    const minute = parseInt(dotPattern[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute, matched: dotPattern[0] };
    }
  }
  
  const ampmPattern = text.match(/(\d{1,2})\s*([ap]m)/i);
  if (ampmPattern) {
    let hour = parseInt(ampmPattern[1], 10);
    const ampm = ampmPattern[2].toLowerCase();
    
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    
    if (hour >= 0 && hour <= 23) {
      return { hour, minute: 0, matched: ampmPattern[0] };
    }
  }
  
  return null;
}

export function extractNumericHour(text: string): { hour: number; matched: string } | null {
  const match = text.match(/\b(\d{1,2})\b/);
  if (match) {
    const hour = parseInt(match[1], 10);
    if (hour >= 1 && hour <= 24) {
      return { hour: hour === 24 ? 0 : hour, matched: match[0] };
    }
  }
  return null;
}
