// Step 10: Explainability notes generation

import type { InputType, PrimaryIntent, InternalNotes, ExtractedEntities } from '../types';

export interface ExplainabilityInput {
  inputType: InputType;
  inputTypePatterns: string[];
  inputTypeKeywords: string[];
  primaryIntent: PrimaryIntent;
  intentPatterns: string[];
  entities: ExtractedEntities;
  missingCritical: string[];
  commitmentKeywords: string[];
}

export function createExplainabilityNotes(input: ExplainabilityInput): InternalNotes {
  const notes: string[] = [];
  const keywordsMatched: string[] = [];
  const patternsMatched: string[] = [];
  
  notes.push(`Detected input type '${input.inputType}'`);
  if (input.inputTypeKeywords.length > 0) {
    notes.push(`Input type keywords: ${input.inputTypeKeywords.join(', ')}`);
    keywordsMatched.push(...input.inputTypeKeywords);
  }
  if (input.inputTypePatterns.length > 0) {
    patternsMatched.push(...input.inputTypePatterns);
  }
  
  notes.push(`Primary intent: ${input.primaryIntent}`);
  if (input.intentPatterns.length > 0) {
    patternsMatched.push(...input.intentPatterns);
  }
  
  if (input.entities.time.confidence > 0) {
    notes.push(`Time extracted: ${input.entities.time.normalized}`);
  }
  if (input.entities.date.confidence > 0) {
    notes.push(`Date extracted: ${input.entities.date.normalized}`);
  }
  if (input.entities.taskName.confidence > 0) {
    notes.push(`Task name: ${input.entities.taskName.normalized}`);
  }
  if (input.entities.people.normalized.length > 0) {
    notes.push(`People: ${input.entities.people.normalized.join(', ')}`);
  }
  
  if (input.missingCritical.length > 0) {
    notes.push(`Missing critical: ${input.missingCritical.join(', ')}`);
  }
  
  if (input.commitmentKeywords.length > 0) {
    notes.push(`Commitment indicators: ${input.commitmentKeywords.join(', ')}`);
    keywordsMatched.push(...input.commitmentKeywords);
  }
  
  return {
    notes,
    signals: {
      keywordsMatched: [...new Set(keywordsMatched)],
      patternsMatched: [...new Set(patternsMatched)]
    }
  };
}
