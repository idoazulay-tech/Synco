import { Router, Request, Response } from 'express';
import { AI_FEATURES, hasOpenAIKey } from '../ai/aiFeatureFlags.js';

const router = Router();

// GET /api/ai/status — returns AI feature flags and key presence (no key value ever exposed)
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    enabled:           AI_FEATURES.enabled,
    provider:          AI_FEATURES.provider,
    hasOpenAIKey:      hasOpenAIKey(),
    parseEnabled:      AI_FEATURES.parseEnabled,
    taskReportEnabled: AI_FEATURES.taskReportEnabled,
    breakdownEnabled:  AI_FEATURES.breakdownEnabled,
    dayCommandEnabled: AI_FEATURES.dayCommandEnabled,
    externalKnowledgeEnabled: AI_FEATURES.externalKnowledgeEnabled,
    note: AI_FEATURES.enabled
      ? 'AI is active. Set SYNCO_AI_* env vars to control features.'
      : 'AI is disabled. Set SYNCO_AI_ENABLED=true to enable.',
  });
});

export default router;
