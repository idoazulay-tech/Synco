// Context manager for session state and follow-up detection

import type { 
  SessionState, 
  ConversationTurn, 
  ContextSuggestion,
  ContextManagerConfig,
  IntentAnalysis,
  PrimaryIntent,
  ExtractedEntities
} from '../types';
import { createInitialState, generateTurnId, createConversationTurn } from './ContextState';
import { FOLLOW_UP_KEYWORDS } from '../rules/keywords';

const DEFAULT_CONFIG: ContextManagerConfig = {
  maxHistoryLength: 10,
  cognitiveLoadWindow: 5
};

export class ContextManager {
  private state: SessionState;
  private config: ContextManagerConfig;
  
  constructor(config: Partial<ContextManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = createInitialState();
  }
  
  getState(): SessionState {
    return { ...this.state };
  }
  
  startNewTurn(input: string): ConversationTurn {
    const turn = createConversationTurn(input);
    
    if (this.state.conversationHistory.length > 0) {
      this.state.lastTurnId = this.state.conversationHistory[
        this.state.conversationHistory.length - 1
      ].turnId;
    }
    
    this.state.conversationHistory.push(turn);
    
    if (this.state.conversationHistory.length > this.config.maxHistoryLength) {
      this.state.conversationHistory.shift();
    }
    
    this.state.turnId = turn.turnId;
    this.state.updatedAt = new Date();
    
    return turn;
  }
  
  updateTurnAnalysis(turnId: string, analysis: IntentAnalysis): void {
    const turn = this.state.conversationHistory.find(t => t.turnId === turnId);
    if (turn) {
      turn.analysis = analysis;
      this.state.lastIntent = analysis.primaryIntent;
      this.state.lastEntities = analysis.entities;
      this.state.lastMissingInfo = analysis.missingInfo;
      this.state.updatedAt = new Date();
    }
  }
  
  recordUserChoice(choice: string): void {
    this.state.lastUserChoice = choice;
    this.state.updatedAt = new Date();
  }
  
  updateCognitiveLoad(level: 'low' | 'medium' | 'high'): void {
    const numericLevel = level === 'low' ? 1 : level === 'medium' ? 2 : 3;
    this.state.rollingCognitiveLoad.push(numericLevel);
    
    if (this.state.rollingCognitiveLoad.length > this.config.cognitiveLoadWindow) {
      this.state.rollingCognitiveLoad.shift();
    }
  }
  
  getAverageCognitiveLoad(): 'low' | 'medium' | 'high' {
    if (this.state.rollingCognitiveLoad.length === 0) return 'low';
    
    const avg = this.state.rollingCognitiveLoad.reduce((a, b) => a + b, 0) / 
                this.state.rollingCognitiveLoad.length;
    
    if (avg < 1.5) return 'low';
    if (avg < 2.5) return 'medium';
    return 'high';
  }
  
  analyzeContext(input: string): ContextSuggestion {
    const normalizedInput = input.trim().toLowerCase();
    
    const isFollowUp = this.detectFollowUp(normalizedInput);
    const isCompletingMissingInfo = this.detectMissingInfoCompletion(normalizedInput);
    const suggestedEntity = isCompletingMissingInfo ? this.guessMissingEntity(normalizedInput) : null;
    const refersToPreviousTurn = isFollowUp || isCompletingMissingInfo;
    
    return {
      isFollowUp,
      isCompletingMissingInfo,
      suggestedEntity,
      refersToPreviousTurn
    };
  }
  
  private detectFollowUp(input: string): boolean {
    for (const kw of FOLLOW_UP_KEYWORDS) {
      if (input === kw || input.startsWith(kw + ' ')) {
        return true;
      }
    }
    
    if (input.length < 20 && this.state.lastMissingInfo.length > 0) {
      return true;
    }
    
    return false;
  }
  
  private detectMissingInfoCompletion(input: string): boolean {
    if (this.state.lastMissingInfo.length === 0) return false;
    
    if (this.state.lastMissingInfo.includes('time')) {
      if (/\d{1,2}(:\d{2})?|בשעה|ב-/.test(input)) return true;
    }
    
    if (this.state.lastMissingInfo.includes('date')) {
      if (/היום|מחר|יום\s+\S+/.test(input)) return true;
    }
    
    return false;
  }
  
  private guessMissingEntity(input: string): string | null {
    for (const missing of this.state.lastMissingInfo) {
      if (missing === 'time' && /\d{1,2}/.test(input)) return 'time';
      if (missing === 'date' && /היום|מחר|יום/.test(input)) return 'date';
      if (missing === 'taskName' && input.length > 3) return 'taskName';
    }
    return null;
  }
  
  getLastIntent(): PrimaryIntent | null {
    return this.state.lastIntent;
  }
  
  getLastEntities(): Partial<ExtractedEntities> | null {
    return this.state.lastEntities;
  }
  
  getLastMissingInfo(): string[] {
    return [...this.state.lastMissingInfo];
  }
  
  reset(): void {
    this.state = createInitialState();
  }
}
