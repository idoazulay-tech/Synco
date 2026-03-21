// Layer 2: Intent & Context Engine
// Modular pipeline-based implementation with 10 steps
// Maintains backward compatibility with legacy IntentEngine

import type { IntentAnalysis as LegacyIntentAnalysis } from '../types';
import type { NormalizedInput } from '../input';
import { IntentContextEngine } from './IntentContextEngine';
import type { IntentAnalysis } from './types';

export * from './types';
export * from './pipeline';
export * from './rules';
export * from './memory';
export { IntentContextEngine, analyze } from './IntentContextEngine';
export { analyzeIntent } from './legacyIntent';

const defaultEngine = new IntentContextEngine();

export function analyzeIntentModular(text: string): IntentAnalysis {
  return defaultEngine.analyze(text);
}

export class IntentEngine {
  private engine: IntentContextEngine;
  
  constructor() {
    this.engine = new IntentContextEngine();
  }
  
  async process(input: NormalizedInput): Promise<LegacyIntentAnalysis> {
    const result = this.engine.analyze(input.cleanedText);
    
    return {
      inputType: result.inputType,
      primaryIntent: result.primaryIntent,
      commitmentLevel: result.commitmentLevel,
      entities: {
        time: result.entities.time.normalized || undefined,
        date: result.entities.date.normalized || undefined,
        duration: result.entities.duration.normalized || undefined,
        people: result.entities.people.normalized,
        location: result.entities.location.normalized || undefined,
        task_name: result.entities.taskName.normalized || undefined,
        constraints: result.entities.constraints
      },
      cognitiveLoad: result.cognitiveLoad,
      missingInfo: result.missingInfo,
      confidenceScore: result.confidenceScore,
      rawText: result.rawText
    };
  }
}

// READY FOR NEXT LAYER: Decision Engine
