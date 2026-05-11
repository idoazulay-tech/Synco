import type { AIProvider, AIProviderResponse, AIRequest } from './aiProvider.js';

export const geminiProvider: AIProvider = {
  name: 'gemini',

  async generateStructured<T>(_request: AIRequest): Promise<AIProviderResponse<T>> {
    return {
      ok: false,
      provider: 'gemini',
      error: 'provider_not_implemented',
    };
  },
};
