import type { AIProvider } from './aiProvider.js';
import { mockAIProvider }   from './mockAIProvider.js';
import { openAIProvider }   from './openAIProvider.js';
import { geminiProvider }   from './geminiProvider.js';
import { claudeProvider }   from './claudeProvider.js';
import { AI_FEATURES }      from '../aiFeatureFlags.js';

export function getAIProvider(): AIProvider {
  if (!AI_FEATURES.enabled) return mockAIProvider;

  switch (AI_FEATURES.provider) {
    case 'openai': return openAIProvider;
    case 'gemini': return geminiProvider;
    case 'claude': return claudeProvider;
    default:       return mockAIProvider;
  }
}
