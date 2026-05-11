import type { AIProvider, AIProviderResponse, AIRequest } from './aiProvider.js';

export const claudeProvider: AIProvider = {
  name: 'claude',

  async generateStructured<T>(_request: AIRequest): Promise<AIProviderResponse<T>> {
    return {
      ok: false,
      provider: 'claude',
      error: 'provider_not_implemented',
    };
  },
};
