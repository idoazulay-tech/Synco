export type AIProviderName = 'openai' | 'gemini' | 'claude' | 'mock';

export interface AIRequest {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  schema?: unknown;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AIProviderResponse<T = unknown> {
  ok: boolean;
  provider: AIProviderName;
  data?: T;
  rawText?: string;
  error?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProvider {
  name: AIProviderName;
  generateStructured<T>(request: AIRequest): Promise<AIProviderResponse<T>>;
}
