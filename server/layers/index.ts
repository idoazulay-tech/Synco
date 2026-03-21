// 7-Layer AI System - Main Entry Point

import { InputLayer, type RawInput, type NormalizedInput } from './input';
import { IntentEngine, analyzeIntent } from './intent';
import { DecisionEngine, type DecisionOutput } from './decision';
import { TaskEngine, decomposeTask, estimateTaskDuration, manageDayPlan } from './task';
import { LearningEngine, updateTimeStats, getPersonalTimeStats } from './learning';
import { AutomationLayer } from './automation';
import { FeedbackReviewLayer, getFeedbackLayer } from './feedback';
import type { IntentAnalysis as LegacyIntentAnalysis, DecisionResult } from './types';
import type { IntentAnalysis as ModularIntentAnalysis } from './intent/types/intentTypes';

export * from './types';
export * from './input';
export * from './intent';
export { 
  DecisionEngine, 
  buildActionPlan,
  THRESHOLDS,
  INTENT_RULES,
  QUESTION_TEMPLATES 
} from './decision';
export type { 
  DecisionOutput, 
  ActionPlan, 
  Question, 
  Reflection 
} from './decision';
export * from './task';
export * from './learning';
export * from './automation';
export * from './feedback';

// Orchestrator that connects all layers
export class AIOrchestrator {
  private inputLayer: InputLayer;
  private intentEngine: IntentEngine;
  private decisionEngine: DecisionEngine;
  private taskEngine: TaskEngine;
  private learningEngine: LearningEngine;
  private automationLayer: AutomationLayer;
  private feedbackLayer: FeedbackReviewLayer;

  constructor() {
    this.inputLayer = new InputLayer();
    this.intentEngine = new IntentEngine();
    this.decisionEngine = new DecisionEngine();
    this.taskEngine = new TaskEngine();
    this.learningEngine = new LearningEngine();
    this.automationLayer = new AutomationLayer();
    this.feedbackLayer = getFeedbackLayer();
  }

  async processInput(text: string, source: 'voice' | 'text' | 'quick_input' = 'text') {
    // Layer 1: Normalize input
    const rawInput: RawInput = { 
      text, 
      source, 
      timestamp: new Date() 
    };
    const normalizedInput = await this.inputLayer.process(rawInput);

    // Layer 2: Analyze intent
    const intentAnalysis = await this.intentEngine.process(normalizedInput);

    // Layer 3: Make decision (cast to modular type)
    const decision = this.decisionEngine.decide(intentAnalysis as unknown as ModularIntentAnalysis);

    // Layer 4: Get task decomposition if needed
    let decomposition = null;
    if (decision.decision === 'execute' && 
        (intentAnalysis.primaryIntent === 'create_task' || 
         intentAnalysis.primaryIntent === 'decompose_task')) {
      const personalStats = this.learningEngine.getStats();
      decomposition = await this.taskEngine.decompose(
        intentAnalysis, 
        false, 
        personalStats
      );
    }

    return {
      input: normalizedInput,
      intent: intentAnalysis,
      decision,
      decomposition,
      timestamp: new Date().toISOString()
    };
  }

  // Record task completion for learning
  async recordTaskCompletion(
    taskPattern: string, 
    plannedMinutes: number, 
    actualMinutes: number
  ) {
    this.learningEngine.updateTime(taskPattern, actualMinutes);
    return {
      pattern: taskPattern,
      planned: plannedMinutes,
      actual: actualMinutes,
      stats: this.learningEngine.getStats()
    };
  }

  // Get current personal stats
  getPersonalStats() {
    return this.learningEngine.getStats();
  }

  // Get learning insights
  getInsights() {
    return this.learningEngine.getInsights();
  }
}

// Singleton instance
let orchestratorInstance: AIOrchestrator | null = null;

export function getOrchestrator(): AIOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AIOrchestrator();
  }
  return orchestratorInstance;
}
