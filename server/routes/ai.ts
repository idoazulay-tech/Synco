import { Router, Request, Response } from 'express';
import { AI_FEATURES, hasOpenAIKey } from '../ai/aiFeatureFlags.js';
import {
  analyzeTaskReportWithAI,
  buildTaskBreakdownWithAI,
  getTaskGuidanceWithAI,
} from '../ai/services/syncoAIReasoningService.js';

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

// POST /api/ai/analyze-task-report — AI analysis of a task report
// Preview only — no DB writes, scope=task_only enforced
router.post('/analyze-task-report', async (req: Request, res: Response) => {
  try {
    const { taskTitle, taskDescription, selectedOption, selectedLabel, freeText } = req.body;

    if (!taskTitle || typeof taskTitle !== 'string') {
      return res.status(400).json({ ok: false, error: 'taskTitle is required' });
    }
    if (!selectedOption || typeof selectedOption !== 'string') {
      return res.status(400).json({ ok: false, error: 'selectedOption is required' });
    }

    const result = await analyzeTaskReportWithAI({
      taskTitle: String(taskTitle),
      taskDescription: taskDescription ? String(taskDescription) : undefined,
      selectedOption: String(selectedOption),
      selectedLabel: selectedLabel ? String(selectedLabel) : String(selectedOption),
      freeText: freeText ? String(freeText) : undefined,
    });

    if (!result.ok) {
      return res.json({
        ok: false,
        reason: result.reason,
        message: result.reason === 'ai_disabled'
          ? 'AI כבוי. הפעל SYNCO_AI_ENABLED=true.'
          : result.reason === 'feature_disabled'
            ? 'תכונת ניתוח דיווחים כבויה.'
            : 'שגיאת AI — נסה שנית.',
      });
    }

    return res.json({
      ok: true,
      source: 'ai',
      scope: 'task_only',
      analysis: result,
    });
  } catch (error: any) {
    console.error('POST /api/ai/analyze-task-report error:', error);
    res.status(500).json({ ok: false, error: 'Failed to analyze task report', details: error.message });
  }
});

// POST /api/ai/breakdown — AI task breakdown
// Preview only — no DB writes
router.post('/breakdown', async (req: Request, res: Response) => {
  try {
    const { taskTitle, taskDescription, selectedOption, freeText } = req.body;

    if (!taskTitle || typeof taskTitle !== 'string') {
      return res.status(400).json({ ok: false, error: 'taskTitle is required' });
    }

    const result = await buildTaskBreakdownWithAI({
      taskTitle: String(taskTitle),
      taskDescription: taskDescription ? String(taskDescription) : undefined,
      selectedOption: selectedOption ? String(selectedOption) : undefined,
      freeText: freeText ? String(freeText) : undefined,
    });

    if (!result.ok) {
      return res.json({
        ok: false,
        reason: result.reason,
        message: result.reason === 'ai_disabled'
          ? 'AI כבוי.'
          : result.reason === 'feature_disabled'
            ? 'תכונת פירוק משימות כבויה.'
            : 'שגיאת AI — נסה שנית.',
      });
    }

    return res.json({
      ok: true,
      source: 'ai',
      breakdown: result,
    });
  } catch (error: any) {
    console.error('POST /api/ai/breakdown error:', error);
    res.status(500).json({ ok: false, error: 'Failed to build breakdown', details: error.message });
  }
});

// POST /api/ai/guidance — AI task guidance (why now / help me start)
// Preview only — no DB writes, no state changes
router.post('/guidance', async (req: Request, res: Response) => {
  try {
    const { taskTitle, taskDescription, startTime, nowIso } = req.body;

    if (!taskTitle || typeof taskTitle !== 'string') {
      return res.status(400).json({ ok: false, error: 'taskTitle is required' });
    }

    const result = await getTaskGuidanceWithAI({
      taskTitle: String(taskTitle),
      taskDescription: taskDescription ? String(taskDescription) : undefined,
      startTime: startTime ? String(startTime) : undefined,
      nowIso: nowIso ? String(nowIso) : new Date().toISOString(),
    });

    return res.json({
      ok: result.ok,
      source: result.source,
      explanation: result.explanation,
      firstStep: result.firstStep,
      confidence: result.confidence,
    });
  } catch (error: any) {
    console.error('POST /api/ai/guidance error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get guidance', details: error.message });
  }
});

export default router;
