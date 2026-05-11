import type { AIProvider, AIProviderResponse, AIRequest } from './aiProvider.js';

export const mockAIProvider: AIProvider = {
  name: 'mock',

  async generateStructured<T>(request: AIRequest): Promise<AIProviderResponse<T>> {
    console.info(`[mockAI] generateStructured called for schema: ${request.schemaName}`);
    return {
      ok: false,
      provider: 'mock',
      error: 'mock_provider — no real output. Set SYNCO_AI_PROVIDER=openai and provide key.',
    };
  },
};
