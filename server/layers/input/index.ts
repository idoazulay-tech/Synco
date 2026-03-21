// Layer 1: Input Layer
// Receives and normalizes user input

export interface RawInput {
  text: string;
  source: 'voice' | 'text' | 'quick_input';
  timestamp: Date;
  userId?: string;
}

export interface NormalizedInput {
  text: string;
  cleanedText: string;
  source: 'voice' | 'text' | 'quick_input';
  timestamp: Date;
  userId?: string;
  wordCount: number;
  hasHebrewNumbers: boolean;
}

const FILLER_WORDS = [
  'אממ', 'אהה', 'כאילו', 'נו', 'אז', 'טוב', 'בעצם', 'סתם', 'ככה', 'יאללה'
];

const HEBREW_NUMBERS: Record<string, number> = {
  'אחת': 1, 'שתיים': 2, 'שלוש': 3, 'ארבע': 4, 'חמש': 5,
  'שש': 6, 'שבע': 7, 'שמונה': 8, 'תשע': 9, 'עשר': 10,
  'אחד עשרה': 11, 'שתים עשרה': 12, 'רבע': 0.25, 'חצי': 0.5
};

function cleanFillerWords(text: string): string {
  let cleaned = text;
  for (const filler of FILLER_WORDS) {
    cleaned = cleaned.replace(new RegExp(`\\b${filler}\\b`, 'gi'), '');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

function hasHebrewNumbers(text: string): boolean {
  return Object.keys(HEBREW_NUMBERS).some(num => text.includes(num));
}

export function normalizeInput(raw: RawInput): NormalizedInput {
  const cleanedText = cleanFillerWords(raw.text.trim());
  
  return {
    text: raw.text.trim(),
    cleanedText,
    source: raw.source,
    timestamp: raw.timestamp,
    userId: raw.userId,
    wordCount: cleanedText.split(' ').filter(w => w.length > 0).length,
    hasHebrewNumbers: hasHebrewNumbers(cleanedText)
  };
}

export class InputLayer {
  async process(raw: RawInput): Promise<NormalizedInput> {
    return normalizeInput(raw);
  }
}
