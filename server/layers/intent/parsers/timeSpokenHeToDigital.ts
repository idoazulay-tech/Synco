/**
 * TIME_SPOKEN_HE_IL_TO_DIGITAL
 * Converts spoken Hebrew time expressions to digital H:MM format
 */

// Hebrew number dictionaries
const HEBREW_UNITS: Record<string, number> = {
  'אפס': 0,
  'אחת': 1, 'אחד': 1,
  'שתיים': 2, 'שניים': 2,
  'שלוש': 3,
  'ארבע': 4,
  'חמש': 5,
  'שש': 6,
  'שבע': 7,
  'שמונה': 8,
  'תשע': 9,
};

const HEBREW_TEENS: Record<string, number> = {
  'עשר': 10,
  'אחת עשרה': 11, 'אחד עשרה': 11,
  'שתים עשרה': 12, 'שנים עשרה': 12,
  'שלוש עשרה': 13,
  'ארבע עשרה': 14,
  'חמש עשרה': 15,
  'שש עשרה': 16,
  'שבע עשרה': 17,
  'שמונה עשרה': 18,
  'תשע עשרה': 19,
};

const HEBREW_TENS: Record<string, number> = {
  'עשרים': 20,
  'שלושים': 30,
  'ארבעים': 40,
  'חמישים': 50,
};

const HEBREW_HOURS: Record<string, number> = {
  ...HEBREW_UNITS,
  'עשר': 10,
  'אחת עשרה': 11, 'אחד עשרה': 11,
  'שתים עשרה': 12, 'שנים עשרה': 12,
};

const ROUND_HOUR_MARKERS = ['בדיוק', 'עגול', 'על הדקה', 'אפס אפס', 'אפס'];

export interface SpokenTimeResult {
  hour: number;
  minute: number;
  confidence: number;
  reason: string;
  formatted: string;
  needsClarification?: boolean;
}

/**
 * Tokenizes Hebrew text into clean tokens
 * Handles punctuation, normalizes whitespace, splits on spaces
 */
export function tokenizeHebrew(text: string): string[] {
  const cleaned = text
    .replace(/[.,!?;:'"״׳]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Split and filter empty tokens
  const tokens = cleaned.split(' ').filter(t => t.length > 0);
  
  return tokens;
}

/**
 * Normalizes tokens - handles "ו" prefix separation
 * "וחמש" => ["ו", "חמש"], "ו חמש" stays as is
 */
export function normalizeTokens(tokens: string[]): string[] {
  const normalized: string[] = [];
  
  for (const token of tokens) {
    // Check if token starts with ו and the rest is a known number
    if (token.startsWith('ו') && token.length > 1) {
      const rest = token.slice(1);
      if (HEBREW_UNITS[rest] !== undefined || HEBREW_TEENS[rest] !== undefined) {
        normalized.push('ו');
        normalized.push(rest);
        continue;
      }
    }
    normalized.push(token);
  }
  
  return normalized;
}

/**
 * Converts Hebrew number tokens to integer
 * Handles: units (0-9), teens (10-19), tens (20-50), and tens+units combinations
 */
export function heNumberToInt(tokens: string[]): number | null {
  if (tokens.length === 0) return null;
  
  // Join for multi-word number matching (e.g., "אחת עשרה")
  const joined = tokens.join(' ');
  
  // Check teens first (two-word numbers like "אחת עשרה")
  for (const [word, value] of Object.entries(HEBREW_TEENS)) {
    if (joined === word || joined.startsWith(word + ' ')) {
      return value;
    }
  }
  
  // Check for tens + ו + unit pattern (e.g., ["חמישים", "ו", "תשע"] = 59)
  let tensValue = 0;
  let unitsValue = 0;
  let foundTens = false;
  let foundVav = false;
  let foundUnit = false;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (HEBREW_TENS[token] !== undefined && !foundTens) {
      tensValue = HEBREW_TENS[token];
      foundTens = true;
      continue;
    }
    
    if (token === 'ו' && foundTens && !foundVav) {
      foundVav = true;
      continue;
    }
    
    if (HEBREW_UNITS[token] !== undefined && !foundUnit) {
      unitsValue = HEBREW_UNITS[token];
      foundUnit = true;
      continue;
    }
  }
  
  if (foundTens) {
    return tensValue + unitsValue;
  }
  
  // Check single unit
  if (tokens.length === 1 && HEBREW_UNITS[tokens[0]] !== undefined) {
    return HEBREW_UNITS[tokens[0]];
  }
  
  // Check for "עשר" as 10
  if (tokens.length === 1 && tokens[0] === 'עשר') {
    return 10;
  }
  
  return null;
}

/**
 * Parses hour from Hebrew tokens
 */
function parseHourFromTokens(tokens: string[]): { hour: number; consumedCount: number } | null {
  // Try multi-word hours first (e.g., "אחת עשרה")
  if (tokens.length >= 2) {
    const twoWord = tokens.slice(0, 2).join(' ');
    if (HEBREW_HOURS[twoWord] !== undefined) {
      return { hour: HEBREW_HOURS[twoWord], consumedCount: 2 };
    }
  }
  
  // Try single word
  if (tokens.length >= 1 && HEBREW_HOURS[tokens[0]] !== undefined) {
    return { hour: HEBREW_HOURS[tokens[0]], consumedCount: 1 };
  }
  
  return null;
}

/**
 * Checks if remaining tokens indicate round hour
 */
function isRoundHour(tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  
  const joined = tokens.join(' ');
  
  for (const marker of ROUND_HOUR_MARKERS) {
    if (joined.includes(marker)) return true;
  }
  
  // Special case: just "אפס" after hour
  if (tokens.length === 1 && tokens[0] === 'אפס') return true;
  
  // Special case: "אפס אפס" 
  if (tokens.length === 2 && tokens[0] === 'אפס' && tokens[1] === 'אפס') return true;
  
  return false;
}

/**
 * Main parser: converts spoken Hebrew time to structured result
 * Scans through tokens to find hour word at any position
 */
export function parseSpokenTimeHe(text: string): SpokenTimeResult {
  const tokens = tokenizeHebrew(text);
  const normalized = normalizeTokens(tokens);
  
  // Scan through tokens to find an hour word
  for (let startIdx = 0; startIdx < normalized.length; startIdx++) {
    const scanTokens = normalized.slice(startIdx);
    const hourResult = parseHourFromTokens(scanTokens);
    
    if (!hourResult) continue;
    
    const { hour, consumedCount } = hourResult;
    const remainingTokens = scanTokens.slice(consumedCount);
    
    // Check for round hour markers
    if (remainingTokens.length === 0 || isRoundHour(remainingTokens)) {
      return {
        hour,
        minute: 0,
        confidence: 0.95,
        reason: 'round_hour',
        formatted: formatTime(hour, 0)
      };
    }
    
    // Parse minutes from remaining tokens
    const minuteTokens = normalizeTokens(remainingTokens);
    const minutes = heNumberToInt(minuteTokens);
    
    if (minutes === null) {
      // Continue searching from next position if minutes parsing failed
      continue;
    }
    
    // Validate minutes range
    if (minutes < 0 || minutes > 59) {
      return {
        hour,
        minute: minutes,
        confidence: 0.2,
        reason: 'minutes_out_of_range',
        formatted: '',
        needsClarification: true
      };
    }
    
    return {
      hour,
      minute: minutes,
      confidence: 0.95,
      reason: 'spoken_time_parsed',
      formatted: formatTime(hour, minutes)
    };
  }
  
  // No valid time found
  return {
    hour: -1,
    minute: -1,
    confidence: 0,
    reason: 'no_hour_found',
    formatted: '',
    needsClarification: true
  };
}

/**
 * Formats hour and minute to H:MM string
 */
export function formatTime(hour: number, minute: number): string {
  const minuteStr = minute.toString().padStart(2, '0');
  return `${hour}:${minuteStr}`;
}

/**
 * High-level function for integration with MA pipeline
 */
export function convertSpokenHebrewTime(text: string): {
  success: boolean;
  time?: string;
  hour?: number;
  minute?: number;
  confidence: number;
  reason: string;
  needsClarification?: boolean;
} {
  const result = parseSpokenTimeHe(text);
  
  if (result.needsClarification || result.confidence < 0.5) {
    return {
      success: false,
      confidence: result.confidence,
      reason: result.reason,
      needsClarification: true
    };
  }
  
  return {
    success: true,
    time: result.formatted,
    hour: result.hour,
    minute: result.minute,
    confidence: result.confidence,
    reason: result.reason
  };
}
