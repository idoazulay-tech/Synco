// MA Server API Client - Full implementation for mobile app

// Types matching server response structures

export interface IntentResult {
  primaryIntent: string;
  entities: {
    time?: string;
    date?: string;
    duration?: number;
    title?: string;
    [key: string]: unknown;
  };
  confidence: number;
  commitmentLevel: string;
  cognitiveLoad: string;
  missingInfo: string[];
  explainability: {
    rulesTriggered: string[];
    confidenceBreakdown: Record<string, number>;
    hebrewExplanation: string;
  };
}

export interface DecisionResult {
  decision: 'execute' | 'ask' | 'reflect' | 'stop';
  reason: string;
  confidence: number;
  actionPlan?: {
    actionType: string;
    payload: Record<string, unknown>;
  };
  question?: {
    shouldAsk: boolean;
    questionId: string;
    text: string;
    expectedAnswerType: 'choice' | 'free_text' | 'confirm';
    options: string[];
  };
  reflection?: {
    shouldReflect: boolean;
    text: string;
    microStep: string;
  };
}

export interface AnalyzeResponse {
  success: boolean;
  input?: {
    original: string;
    normalized: string;
  };
  intent?: IntentResult;
  decision?: DecisionResult;
  state?: TaskState;
  uiInstructions?: UIInstructions;
  timestamp?: string;
  error?: string;
}

export interface TaskState {
  tasks: Task[];
  events: Event[];
  scheduleBlocks: ScheduleBlock[];
  notes: Note[];
  lastQuestion: Question | null;
}

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'not_completed' | 'archived';
  priority: 'low' | 'medium' | 'high';
  estimatedDuration?: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  mustLock: boolean;
}

export interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: 'external' | 'internal';
}

export interface ScheduleBlock {
  id: string;
  entityType: 'task' | 'event';
  entityId: string;
  start: string;
  end: string;
  locked: boolean;
}

export interface Note {
  id: string;
  content: string;
  type: 'journal' | 'thought' | 'reminder';
  createdAt: string;
}

export interface Question {
  id: string;
  text: string;
  expectedAnswerType: 'choice' | 'free_text' | 'confirm';
  options: string[];
}

export interface UIInstructions {
  showQuestionModal: boolean;
  showReflectionCard: boolean;
  refreshTimeline: boolean;
  refreshTaskList: boolean;
  planOptions: PlanOption[] | null;
  message?: string;
  messageType?: 'info' | 'success' | 'warning' | 'error';
}

export interface PlanOption {
  planId: 'A' | 'B';
  titleHebrew: string;
  summaryHebrew: string;
  changes: PlanChange[];
}

export interface PlanChange {
  entityType: 'task' | 'event';
  entityId: string;
  change: 'shorten' | 'move' | 'cancel';
  details: {
    newDuration?: number;
    newStartTime?: string;
    reason?: string;
  };
}

export interface FeedbackMessage {
  id: string;
  tsIso: string;
  type: 'reflection' | 'post_action' | 'daily_review' | 'system';
  tone: 'neutral' | 'gentle' | 'direct';
  titleHebrew: string;
  bodyHebrew: string;
  microStepHebrew: string;
  related: {
    layer: string;
    entityType: string;
    entityId: string | null;
  };
  ui: {
    showAs: 'card' | 'toast' | 'modal';
    priority: 'low' | 'medium' | 'high';
  };
}

export interface CheckInRequest {
  id: string;
  tsIso: string;
  reason: 'duration_mismatch' | 'wrong_intent' | 'stress_signal' | 'automation_failed';
  questionHebrew: string;
  expectedAnswerType: 'choice' | 'free_text' | 'confirm';
  options: string[];
  relatedEntityId?: string;
}

export interface FeedbackStats {
  todayCompleted: number;
  todayTotal: number;
  weeklyAvgCompletion: number;
}

export interface FeedbackContext {
  currentStressLevel: 'low' | 'medium' | 'high';
  currentTone: 'neutral' | 'gentle' | 'direct';
}

export interface FeedbackResponse {
  feedbackFeed: FeedbackMessage[];
  pendingCheckIn: CheckInRequest | null;
  stats: FeedbackStats;
  context: FeedbackContext;
  timestamp: string;
}

export interface DailyReviewData {
  dateIso: string;
  completed: number;
  total: number;
  topBlocker?: string;
  topMust?: string;
  microStep: string;
}

export interface PendingPlanProposal {
  id: string;
  createdAtIso: string;
  reason: 'reshuffle';
  plans: PlanOption[];
  expiresAtIso: string;
}

class MAApiClient {
  private baseUrl: string;
  private static readonly STORAGE_KEY = 'ma_server_url';

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '';
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  isConfigured(): boolean {
    return this.baseUrl.length > 0;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!this.baseUrl) {
      throw new Error('Server URL not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  }

  // === Core Analysis ===

  async analyze(text: string, source: string = 'mobile'): Promise<AnalyzeResponse> {
    try {
      const result = await this.request<AnalyzeResponse>('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ text, source }),
      });
      return { success: true, ...result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async answer(answer: string, questionId: string): Promise<AnalyzeResponse> {
    try {
      const result = await this.request<AnalyzeResponse>('/api/answer', {
        method: 'POST',
        body: JSON.stringify({ answer, questionId }),
      });
      return { success: true, ...result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // === Task Actions ===

  async performAction(action: string, id?: string, entityType?: string, value?: unknown): Promise<AnalyzeResponse> {
    try {
      const result = await this.request<AnalyzeResponse>('/api/action', {
        method: 'POST',
        body: JSON.stringify({ action, id, entityType, value }),
      });
      return { success: true, ...result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async markDone(taskId: string): Promise<AnalyzeResponse> {
    return this.performAction('mark_done', taskId);
  }

  async cancelTask(taskId: string): Promise<AnalyzeResponse> {
    return this.performAction('cancel', taskId, 'task');
  }

  async toggleMustLock(taskId: string): Promise<AnalyzeResponse> {
    return this.performAction('toggle_must_lock', taskId);
  }

  async confirmPlan(planId: 'A' | 'B', plans: PlanOption[]): Promise<AnalyzeResponse> {
    return this.performAction('confirm_plan', undefined, undefined, planId);
  }

  // === State ===

  async getState(): Promise<{ state: TaskState; timestamp: string }> {
    return this.request('/api/state');
  }

  // === Feedback Layer ===

  async getFeedback(limit: number = 20): Promise<FeedbackResponse> {
    return this.request(`/api/feedback?limit=${limit}`);
  }

  async respondToCheckIn(response: string, checkInId: string): Promise<{
    success: boolean;
    feedbackMessage?: FeedbackMessage;
    uiInstructions?: unknown;
    signalsForLearning?: unknown;
  }> {
    return this.request('/api/feedback/checkin/respond', {
      method: 'POST',
      body: JSON.stringify({ response, checkInId }),
    });
  }

  async requestDailyReview(): Promise<{
    success: boolean;
    feedbackMessage?: FeedbackMessage;
    uiInstructions?: unknown;
  }> {
    return this.request('/api/feedback/daily-review/request', {
      method: 'POST',
    });
  }

  async sendReflection(decision: string, confidence?: number, missingInfo?: string[], actionType?: string, taskTitle?: string): Promise<{
    success: boolean;
    feedbackMessage?: FeedbackMessage;
    uiInstructions?: unknown;
  }> {
    return this.request('/api/feedback/reflection', {
      method: 'POST',
      body: JSON.stringify({ decision, confidence, missingInfo, actionType, taskTitle }),
    });
  }

  async getFeedbackStats(): Promise<{ stats: FeedbackStats; timestamp: string }> {
    return this.request('/api/feedback/stats');
  }

  // === Health Check ===

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.request<{ status: string }>('/api/health');
      return result.status === 'ok';
    } catch {
      return false;
    }
  }
}

export const apiClient = new MAApiClient();
export default apiClient;
