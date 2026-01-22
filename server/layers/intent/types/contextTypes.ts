// Context and session state type definitions

import type { IntentAnalysis, PrimaryIntent, ExtractedEntities } from './intentTypes';

export interface SessionState {
  turnId: string;
  lastIntent: PrimaryIntent | null;
  lastEntities: Partial<ExtractedEntities> | null;
  lastMissingInfo: string[];
  lastUserChoice: string | null;
  lastTurnId: string | null;
  rollingCognitiveLoad: number[];
  conversationHistory: ConversationTurn[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationTurn {
  turnId: string;
  timestamp: Date;
  input: string;
  analysis: IntentAnalysis | null;
  userChoice: string | null;
}

export interface ContextSuggestion {
  isFollowUp: boolean;
  isCompletingMissingInfo: boolean;
  suggestedEntity: string | null;
  refersToPreviousTurn: boolean;
}

export interface ContextManagerConfig {
  maxHistoryLength: number;
  cognitiveLoadWindow: number;
}
