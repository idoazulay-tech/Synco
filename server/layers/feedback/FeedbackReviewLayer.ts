// Layer 7: Feedback & Review Layer - Main Orchestrator
// MA CORE: Closes the learning loop - what was understood -> decided -> executed -> happened -> learned

import type { 
  FeedbackMessage, 
  CheckInRequest,
  FeedbackContext,
  ReflectionInput,
  PostActionInput,
  AutomationFeedbackInput,
  DailyReviewData,
  FeedbackUIInstructions,
  StressLevel
} from './types/feedbackTypes.js';
import type { StoreState } from '../task/store/storeTypes.js';
import { getFeedbackStore, resetFeedbackStore } from './store/FeedbackStore.js';
import { generateReflection } from './generators/reflectionGenerator.js';
import { generatePostActionFeedback } from './generators/postActionGenerator.js';
import { generateDailyReview, createCompletionRateEntry } from './generators/dailyReviewGenerator.js';
import { generateMicroStep, determineSituation } from './generators/microStepGenerator.js';
import { analyzeGap, createPlannedVsActualEntry } from './analyzers/gapAnalyzer.js';
import { analyzeAutomationResult, countRecentFailures } from './analyzers/successFailureAnalyzer.js';
import { analyzeOverload, createStressSignalEntry, countRecentCancellations } from './analyzers/overloadAnalyzer.js';
import { determineTone } from './policies/tonePolicy.js';

export interface FeedbackLayerResult {
  feedbackMessage: FeedbackMessage | null;
  checkInRequest: CheckInRequest | null;
  uiInstructions: FeedbackUIInstructions;
  signalsForLearning: LearningSignal[];
}

export interface LearningSignal {
  type: 'duration_update' | 'pattern_detected' | 'confidence_adjustment';
  entityType: string;
  entityId?: string;
  data: Record<string, any>;
}

export class FeedbackReviewLayer {
  private currentContext: FeedbackContext;
  
  constructor() {
    this.currentContext = this.createDefaultContext();
  }
  
  private createDefaultContext(): FeedbackContext {
    const store = getFeedbackStore();
    return {
      cognitiveLoad: 'low',
      recentCancellations: 0,
      recentFailedJobs: 0,
      lastDailyReviewIso: store.getLastDailyReviewIso(),
      currentStressLevel: 'low'
    };
  }
  
  updateContext(
    cognitiveLoad: 'low' | 'medium' | 'high',
    recentActions: Array<{ action: string; tsIso: string }>,
    recentJobStatuses: Array<{ status: string; tsIso: string }>
  ): void {
    const store = getFeedbackStore();
    const recentCancellations = countRecentCancellations(recentActions);
    const recentFailedJobs = countRecentFailures(recentJobStatuses);
    
    const overloadResult = analyzeOverload(
      cognitiveLoad,
      recentCancellations,
      recentFailedJobs
    );
    
    this.currentContext = {
      cognitiveLoad,
      recentCancellations,
      recentFailedJobs,
      lastDailyReviewIso: store.getLastDailyReviewIso(),
      currentStressLevel: overloadResult.currentStressLevel
    };
    
    store.addStressSignal(createStressSignalEntry(overloadResult.currentStressLevel));
  }
  
  getContext(): FeedbackContext {
    return { ...this.currentContext };
  }
  
  processReflection(input: ReflectionInput): FeedbackLayerResult {
    const store = getFeedbackStore();
    
    const taskCount = 0;
    const mustLockCount = 0;
    const situation = determineSituation(this.currentContext, taskCount, mustLockCount);
    const microStepResult = generateMicroStep({ situation });
    
    const reflectionResult = generateReflection(
      input,
      this.currentContext,
      microStepResult.stepHebrew
    );
    
    if (reflectionResult.feedbackMessage) {
      store.addFeedback(reflectionResult.feedbackMessage);
    }
    
    return {
      feedbackMessage: reflectionResult.feedbackMessage,
      checkInRequest: null,
      uiInstructions: this.buildUIInstructions(
        reflectionResult.feedbackMessage,
        null,
        null
      ),
      signalsForLearning: []
    };
  }
  
  processPostAction(input: PostActionInput, taskState?: StoreState): FeedbackLayerResult {
    const store = getFeedbackStore();
    const signals: LearningSignal[] = [];
    
    const postActionResult = generatePostActionFeedback(input, this.currentContext);
    
    if (postActionResult.feedbackMessage) {
      store.addFeedback(postActionResult.feedbackMessage);
    }
    
    if (postActionResult.updateStats && taskState) {
      const todayIso = new Date().toISOString().split('T')[0];
      const completed = taskState.tasks.filter(t => t.status === 'done').length;
      const total = taskState.tasks.length;
      store.addCompletionRate(createCompletionRateEntry(completed, total));
    }
    
    let checkInRequest: CheckInRequest | null = null;
    
    if (input.action === 'mark_done' && input.plannedMinutes && input.actualMinutes) {
      const gapResult = analyzeGap(
        input.plannedMinutes,
        input.actualMinutes,
        input.entityId,
        this.currentContext
      );
      
      if (gapResult.checkInRequest && !store.isCheckInOnCooldown('duration_mismatch')) {
        checkInRequest = gapResult.checkInRequest;
        store.setPendingCheckIn(checkInRequest);
      }
      
      if (gapResult.hasSignificantGap) {
        store.addPlannedVsActual(createPlannedVsActualEntry(
          new Date().toISOString().split('T')[0],
          input.plannedMinutes,
          input.actualMinutes
        ));
        
        signals.push({
          type: 'duration_update',
          entityType: input.entityType,
          entityId: input.entityId,
          data: {
            plannedMinutes: input.plannedMinutes,
            actualMinutes: input.actualMinutes,
            gapPercent: gapResult.gapPercent
          }
        });
      }
    }
    
    return {
      feedbackMessage: postActionResult.feedbackMessage,
      checkInRequest,
      uiInstructions: this.buildUIInstructions(
        postActionResult.feedbackMessage,
        checkInRequest,
        null
      ),
      signalsForLearning: signals
    };
  }
  
  processAutomationResult(input: AutomationFeedbackInput): FeedbackLayerResult {
    const store = getFeedbackStore();
    
    const automationResult = analyzeAutomationResult(input, this.currentContext);
    
    if (automationResult.feedbackMessage) {
      store.addFeedback(automationResult.feedbackMessage);
    }
    
    let checkInRequest = automationResult.checkInRequest;
    if (checkInRequest && !store.isCheckInOnCooldown('automation_failed')) {
      store.setPendingCheckIn(checkInRequest);
    } else {
      checkInRequest = null;
    }
    
    return {
      feedbackMessage: automationResult.feedbackMessage,
      checkInRequest,
      uiInstructions: this.buildUIInstructions(
        automationResult.feedbackMessage,
        checkInRequest,
        null
      ),
      signalsForLearning: []
    };
  }
  
  processDailyReview(taskState: StoreState, forceGenerate: boolean = false): FeedbackLayerResult {
    const store = getFeedbackStore();
    
    const completedToday = taskState.tasks.filter(t => t.status === 'done').length;
    const totalToday = taskState.tasks.length;
    const pendingTasks = taskState.tasks
      .filter(t => t.status === 'pending')
      .map(t => ({ id: t.id, title: t.title, mustLock: t.mustLock }));
    
    const reviewResult = generateDailyReview(
      {
        completedToday,
        totalToday,
        pendingTasks
      },
      this.currentContext,
      forceGenerate
    );
    
    if (reviewResult.feedbackMessage) {
      store.addFeedback(reviewResult.feedbackMessage);
      store.setLastDailyReviewIso(new Date().toISOString());
      this.currentContext.lastDailyReviewIso = new Date().toISOString();
    }
    
    return {
      feedbackMessage: reviewResult.feedbackMessage,
      checkInRequest: null,
      uiInstructions: this.buildUIInstructions(
        reviewResult.feedbackMessage,
        null,
        reviewResult.reviewData
      ),
      signalsForLearning: []
    };
  }
  
  respondToCheckIn(response: string, checkInId: string): FeedbackLayerResult {
    const store = getFeedbackStore();
    const pendingCheckIn = store.getPendingCheckIn();
    const signals: LearningSignal[] = [];
    
    if (!pendingCheckIn || pendingCheckIn.id !== checkInId) {
      return {
        feedbackMessage: null,
        checkInRequest: null,
        uiInstructions: this.buildUIInstructions(null, null, null),
        signalsForLearning: []
      };
    }
    
    const isPositive = response === 'כן' || response === 'כן, נסה שוב' || response === 'כן, להפחית';
    
    if (isPositive) {
      if (pendingCheckIn.reason === 'duration_mismatch' && pendingCheckIn.relatedEntityId) {
        signals.push({
          type: 'duration_update',
          entityType: 'task',
          entityId: pendingCheckIn.relatedEntityId,
          data: { confirmed: true }
        });
      }
    } else {
      const cooldownUntil = new Date();
      cooldownUntil.setHours(cooldownUntil.getHours() + 24);
      store.setCheckInCooldown(pendingCheckIn.reason, cooldownUntil.toISOString());
    }
    
    store.setPendingCheckIn(null);
    
    const feedbackMessage: FeedbackMessage = {
      id: `checkin-response-${Date.now()}`,
      tsIso: new Date().toISOString(),
      type: 'system',
      tone: 'neutral',
      titleHebrew: isPositive ? 'עודכן' : 'הבנתי',
      bodyHebrew: isPositive ? 'השינוי נשמר.' : 'לא נשאל שוב היום.',
      microStepHebrew: '',
      related: {
        layer: 'learning',
        entityType: 'none',
        entityId: null
      },
      ui: {
        showAs: 'toast',
        priority: 'low'
      }
    };
    
    store.addFeedback(feedbackMessage);
    
    return {
      feedbackMessage,
      checkInRequest: null,
      uiInstructions: this.buildUIInstructions(feedbackMessage, null, null),
      signalsForLearning: signals
    };
  }
  
  getFeedbackFeed(limit: number = 20): FeedbackMessage[] {
    return getFeedbackStore().getFeedbackFeed(limit);
  }
  
  getPendingCheckIn(): CheckInRequest | null {
    return getFeedbackStore().getPendingCheckIn();
  }
  
  getStats() {
    return getFeedbackStore().getState().stats;
  }
  
  private buildUIInstructions(
    feedbackMessage: FeedbackMessage | null,
    checkInRequest: CheckInRequest | null,
    dailyReviewData: DailyReviewData | null
  ): FeedbackUIInstructions {
    return {
      showFeedbackCard: feedbackMessage !== null && feedbackMessage.ui.showAs === 'card',
      feedbackMessage,
      showCheckInModal: checkInRequest !== null,
      checkInRequest,
      showDailyReview: dailyReviewData !== null,
      dailyReviewData
    };
  }
  
  reset(): void {
    resetFeedbackStore();
    this.currentContext = this.createDefaultContext();
  }
}

let feedbackLayerInstance: FeedbackReviewLayer | null = null;

export function getFeedbackLayer(): FeedbackReviewLayer {
  if (!feedbackLayerInstance) {
    feedbackLayerInstance = new FeedbackReviewLayer();
  }
  return feedbackLayerInstance;
}

export function resetFeedbackLayer(): void {
  if (feedbackLayerInstance) {
    feedbackLayerInstance.reset();
  }
  feedbackLayerInstance = null;
}
