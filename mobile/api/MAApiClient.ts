// MA API Client for connecting to the server
// Handles all communication with the MA backend

export interface AnalyzeRequest {
  text: string;
}

export interface AnalyzeResponse {
  success: boolean;
  analysis?: {
    inputType: string;
    primaryIntent: string;
    entities: Record<string, unknown>;
    confidence: number;
  };
  decision?: {
    action: 'execute' | 'ask' | 'reflect' | 'stop';
    reason: string;
    question?: string;
    questionId?: string;
  };
  error?: string;
}

export interface AnswerRequest {
  questionId: string;
  answer: string;
}

export interface AnswerResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface FeedbackData {
  feed: FeedbackMessage[];
  pendingCheckIns: CheckInRequest[];
  stats: FeedbackStats;
}

export interface FeedbackMessage {
  id: string;
  tsIso: string;
  type: 'reflection' | 'post_action' | 'daily_review' | 'micro_step' | 'overload_warning';
  priority: 'low' | 'medium' | 'high';
  textHebrew: string;
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

class MAApiClient {
  private baseUrl: string;
  private static readonly STORAGE_KEY = 'ma_server_url';

  constructor(baseUrl?: string) {
    // Default to empty - user must configure in Settings
    // In production, this would be loaded from AsyncStorage on init
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
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async analyze(text: string): Promise<AnalyzeResponse> {
    return this.request<AnalyzeResponse>('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async answer(questionId: string, answer: string): Promise<AnswerResponse> {
    return this.request<AnswerResponse>('/api/answer', {
      method: 'POST',
      body: JSON.stringify({ questionId, answer }),
    });
  }

  async getFeedback(): Promise<FeedbackData> {
    return this.request<FeedbackData>('/api/feedback');
  }

  async respondToCheckIn(checkInId: string, response: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/feedback/checkin/respond', {
      method: 'POST',
      body: JSON.stringify({ checkInId, response }),
    });
  }

  async getState(): Promise<unknown> {
    return this.request<unknown>('/api/state');
  }
}

export const apiClient = new MAApiClient();
export default apiClient;
