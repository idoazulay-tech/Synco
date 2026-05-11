import OpenAI from 'openai';
import type { AIProvider, AIProviderResponse, AIRequest } from './aiProvider.js';
import { getOpenAIKey, getOpenAIBaseURL } from '../aiFeatureFlags.js';

let _client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const apiKey = getOpenAIKey();
  if (!apiKey) return null;
  if (!_client) {
    const baseURL = getOpenAIBaseURL();
    _client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  }
  return _client;
}

export const openAIProvider: AIProvider = {
  name: 'openai',

  async generateStructured<T>(request: AIRequest): Promise<AIProviderResponse<T>> {
    const client = getClient();
    if (!client) {
      return {
        ok: false,
        provider: 'openai',
        error: 'openai_key_missing — set AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY in Replit Secrets',
      };
    }

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user',   content: request.userPrompt   },
        ],
        temperature:          request.temperature      ?? 0.2,
        max_completion_tokens: request.maxOutputTokens ?? 2048,
        response_format:      { type: 'json_object' },
      });

      const rawText = response.choices[0]?.message?.content ?? '';
      const usage   = response.usage;

      let data: T;
      try {
        data = JSON.parse(rawText) as T;
      } catch {
        return {
          ok: false,
          provider: 'openai',
          rawText,
          error: 'json_parse_failed — AI returned non-JSON',
        };
      }

      return {
        ok: true,
        provider: 'openai',
        data,
        rawText,
        usage: {
          inputTokens:  usage?.prompt_tokens,
          outputTokens: usage?.completion_tokens,
          totalTokens:  usage?.total_tokens,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[openAIProvider] generateStructured error:', message);
      return {
        ok: false,
        provider: 'openai',
        error: `openai_error: ${message}`,
      };
    }
  },
};
