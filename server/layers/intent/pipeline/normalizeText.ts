// Step 1: Text normalization

import { FILLER_WORDS } from '../rules/keywords';

export interface NormalizedText {
  original: string;
  normalized: string;
  removedFillers: string[];
  wordCount: number;
}

export function normalizeText(input: string): NormalizedText {
  const original = input;
  let normalized = input.trim();
  const removedFillers: string[] = [];
  
  normalized = normalized.replace(/\s+/g, ' ');
  
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    if (regex.test(normalized)) {
      removedFillers.push(filler);
      normalized = normalized.replace(regex, '');
    }
  }
  
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  normalized = normalized.replace(/\s*([,.])\s*/g, '$1 ').trim();
  
  const wordCount = normalized.split(/\s+/).filter(w => w.length > 0).length;
  
  return {
    original,
    normalized,
    removedFillers,
    wordCount
  };
}
