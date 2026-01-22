// Main Intent & Context Engine - orchestrates the 10-step pipeline

import type { IntentAnalysis, ContextInfo } from './types';
import { ContextManager } from './memory/ContextManager';
import {
  normalizeText,
  detectLanguage,
  classifyInputType,
  detectIntents,
  extractEntities,
  detectCommitment,
  detectCognitiveLoad,
  detectMissingInfo,
  computeConfidence,
  createExplainabilityNotes
} from './pipeline';

export interface AnalysisOptions {
  sessionId?: string;
  preserveContext?: boolean;
}

export class IntentContextEngine {
  private contextManager: ContextManager;
  
  constructor(contextManager?: ContextManager) {
    this.contextManager = contextManager || new ContextManager();
  }
  
  analyze(inputText: string, options: AnalysisOptions = {}): IntentAnalysis {
    const turn = this.contextManager.startNewTurn(inputText);
    
    const normalized = normalizeText(inputText);
    
    const _language = detectLanguage(normalized.normalized);
    
    const inputTypeResult = classifyInputType(normalized.normalized);
    
    const intentResult = detectIntents(normalized.normalized);
    
    const entities = extractEntities(normalized.normalized);
    
    const commitmentResult = detectCommitment(normalized.normalized);
    
    const cognitiveLoadResult = detectCognitiveLoad(normalized.normalized);
    this.contextManager.updateCognitiveLoad(cognitiveLoadResult.level);
    
    const missingInfoResult = detectMissingInfo(intentResult.primary, entities);
    
    const contextSuggestion = this.contextManager.analyzeContext(normalized.normalized);
    
    const confidenceResult = computeConfidence(
      inputTypeResult.confidence,
      intentResult.confidence,
      intentResult.primary,
      entities,
      missingInfoResult.critical,
      contextSuggestion.isFollowUp
    );
    
    const internal = createExplainabilityNotes({
      inputType: inputTypeResult.type,
      inputTypePatterns: inputTypeResult.matchedPatterns,
      inputTypeKeywords: inputTypeResult.matchedKeywords,
      primaryIntent: intentResult.primary,
      intentPatterns: intentResult.matchedPatterns,
      entities,
      missingCritical: missingInfoResult.critical,
      commitmentKeywords: commitmentResult.matchedKeywords
    });
    
    const context: ContextInfo = {
      isFollowUp: contextSuggestion.isFollowUp,
      refersToPrevious: contextSuggestion.refersToPreviousTurn,
      previousTurnId: this.contextManager.getState().lastTurnId || '',
      topic: entities.taskName.normalized || '',
      assumptions: []
    };
    
    if (contextSuggestion.isCompletingMissingInfo && contextSuggestion.suggestedEntity) {
      context.assumptions.push(`Completing missing ${contextSuggestion.suggestedEntity}`);
    }
    
    const allMissing = [
      ...missingInfoResult.critical,
      ...missingInfoResult.recommended.slice(0, 2)
    ];
    
    const analysis: IntentAnalysis = {
      inputType: inputTypeResult.type,
      primaryIntent: intentResult.primary,
      secondaryIntents: intentResult.secondary,
      commitmentLevel: commitmentResult.level,
      entities,
      cognitiveLoad: cognitiveLoadResult.level,
      missingInfo: allMissing,
      confidenceScore: confidenceResult.score,
      context,
      internal,
      rawText: inputText
    };
    
    this.contextManager.updateTurnAnalysis(turn.turnId, analysis);
    
    return analysis;
  }
  
  getContextManager(): ContextManager {
    return this.contextManager;
  }
  
  reset(): void {
    this.contextManager.reset();
  }
}

export function analyze(inputText: string, contextManager?: ContextManager): IntentAnalysis {
  const engine = new IntentContextEngine(contextManager);
  return engine.analyze(inputText);
}
