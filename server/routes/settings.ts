import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  PLANNING_CONFIG_DEFAULTS,
} from '../types/settingsTypes.js';
import type { PlanningConfig } from '../types/settingsTypes.js';

const router = Router();

const HH_MM = /^\d{2}:\d{2}$/;
const VALID_STYLES = ['gentle', 'balanced', 'aggressive'] as const;
const VALID_THEMES = ['system', 'light', 'dark'] as const;

function validatePlanningConfig(body: any): { error: string } | null {
  if (body.dayStart && !HH_MM.test(body.dayStart))
    return { error: 'dayStart חייב להיות בפורמט HH:MM' };
  if (body.dayEnd && !HH_MM.test(body.dayEnd))
    return { error: 'dayEnd חייב להיות בפורמט HH:MM' };
  if (body.dayStart && body.dayEnd && body.dayStart >= body.dayEnd)
    return { error: 'dayStart חייב להיות לפני dayEnd' };
  if (body.planningBufferMinutes !== undefined) {
    const v = Number(body.planningBufferMinutes);
    if (isNaN(v) || v < 0 || v > 60)
      return { error: 'planningBufferMinutes חייב להיות בין 0 ל-60' };
  }
  if (body.transitionBufferMinutes !== undefined) {
    const v = Number(body.transitionBufferMinutes);
    if (isNaN(v) || v < 0 || v > 60)
      return { error: 'transitionBufferMinutes חייב להיות בין 0 ל-60' };
  }
  if (body.planningStyle && !(VALID_STYLES as readonly string[]).includes(body.planningStyle))
    return { error: `planningStyle חייב להיות: ${VALID_STYLES.join(' / ')}` };
  if (body.themePreference && !(VALID_THEMES as readonly string[]).includes(body.themePreference))
    return { error: `themePreference חייב להיות: ${VALID_THEMES.join(' / ')}` };
  if (body.timezone !== undefined && (!body.timezone || typeof body.timezone !== 'string'))
    return { error: 'timezone לא יכול להיות ריק' };
  return null;
}

function mergePlanningConfig(stored: unknown): PlanningConfig {
  const raw = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  return {
    displayName:             (raw.displayName             as string)  ?? PLANNING_CONFIG_DEFAULTS.displayName,
    timezone:                (raw.timezone                as string)  ?? PLANNING_CONFIG_DEFAULTS.timezone,
    dayStart:                (raw.dayStart                as string)  ?? PLANNING_CONFIG_DEFAULTS.dayStart,
    dayEnd:                  (raw.dayEnd                  as string)  ?? PLANNING_CONFIG_DEFAULTS.dayEnd,
    planningBufferMinutes:   (raw.planningBufferMinutes   as number)  ?? PLANNING_CONFIG_DEFAULTS.planningBufferMinutes,
    transitionBufferMinutes: (raw.transitionBufferMinutes as number)  ?? PLANNING_CONFIG_DEFAULTS.transitionBufferMinutes,
    planningStyle:           (raw.planningStyle           as PlanningConfig['planningStyle'])  ?? PLANNING_CONFIG_DEFAULTS.planningStyle,
    themePreference:         (raw.themePreference         as PlanningConfig['themePreference']) ?? PLANNING_CONFIG_DEFAULTS.themePreference,
  };
}

// ── GET /api/settings?userId=default-user ──────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'default-user';
    let record = await prisma.userSettings.findFirst();
    if (!record) {
      record = await prisma.userSettings.create({
        data: { language: 'he', insightsMode: 'hidden' },
      });
    }
    const settings = mergePlanningConfig(record.planningConfig);
    res.json({ ok: true, settings: { userId, ...settings } });
  } catch (error) {
    console.error('[settings] GET error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ── PUT /api/settings ──────────────────────────────────────────────────────
router.put('/', async (req: Request, res: Response) => {
  try {
    const { userId = 'default-user', ...body } = req.body;
    const validationError = validatePlanningConfig(body);
    if (validationError) {
      return res.status(400).json({ ok: false, error: validationError.error });
    }

    let record = await prisma.userSettings.findFirst();
    const existing = mergePlanningConfig(record?.planningConfig);
    const updated: PlanningConfig = {
      displayName:             body.displayName             ?? existing.displayName,
      timezone:                body.timezone                ?? existing.timezone,
      dayStart:                body.dayStart                ?? existing.dayStart,
      dayEnd:                  body.dayEnd                  ?? existing.dayEnd,
      planningBufferMinutes:   body.planningBufferMinutes   !== undefined
                                 ? Number(body.planningBufferMinutes)
                                 : existing.planningBufferMinutes,
      transitionBufferMinutes: body.transitionBufferMinutes !== undefined
                                 ? Number(body.transitionBufferMinutes)
                                 : existing.transitionBufferMinutes,
      planningStyle:           body.planningStyle           ?? existing.planningStyle,
      themePreference:         body.themePreference         ?? existing.themePreference,
    };

    if (record) {
      await prisma.userSettings.update({
        where: { id: record.id },
        data: { planningConfig: updated as any },
      });
    } else {
      await prisma.userSettings.create({
        data: { language: 'he', insightsMode: 'hidden', planningConfig: updated as any },
      });
    }

    res.json({ ok: true, settings: { userId, ...updated } });
  } catch (error) {
    console.error('[settings] PUT error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ── POST /api/settings/reset-learning-data ────────────────────────────────
router.post('/reset-learning-data', async (req: Request, res: Response) => {
  try {
    const { userId = 'default-user', confirm } = req.body;
    if (confirm !== 'RESET_LEARNING_DATA') {
      return res.status(400).json({ ok: false, error: 'confirm חייב להיות RESET_LEARNING_DATA' });
    }
    const result = await prisma.learningEvent.deleteMany({ where: { userId } });
    res.json({ ok: true, deletedCount: result.count });
  } catch (error) {
    console.error('[settings] reset-learning-data error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ── POST /api/settings (legacy — backward compat) ─────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { language, insightsMode, regulationProfile } = req.body;
    let record = await prisma.userSettings.findFirst();
    if (record) {
      record = await prisma.userSettings.update({
        where: { id: record.id },
        data: { language, insightsMode, regulationProfile },
      });
    } else {
      record = await prisma.userSettings.create({
        data: { language: language || 'he', insightsMode: insightsMode || 'hidden', regulationProfile },
      });
    }
    res.json(record);
  } catch (error) {
    console.error('[settings] POST legacy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
