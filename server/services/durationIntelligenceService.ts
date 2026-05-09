/**
 * durationIntelligenceService.ts
 * Stage 3ד — Duration Intelligence בסיסי.
 * Read-only — לא כותב שום דבר ל-DB.
 *
 * קורא LearningEvents מסוג task_execution_completed כדי להציע משך
 * זמן מדויק יותר למשימות דומות בשיבוץ הבא.
 */

import { prisma } from '../lib/prisma.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_LOOKBACK_DAYS = 14;
const EXCLUDED_SOURCES = ['test', 'seed', 'debug', 'manual_test'];
const MIN_DURATION_MINUTES = 1;
const MIN_DELTA_MINUTES = 5;

// מילות עצירה בעברית — מוסרות מהשוואת כותרות
const STOP_WORDS_HE = new Set([
  'את', 'של', 'עם', 'על', 'לפני', 'אחרי',
  'ל', 'ב', 'ה', 'ו', 'מ', 'כ', 'אל', 'מן',
  'זה', 'זו', 'כי', 'הוא', 'היא', 'הם', 'הן',
  'אני', 'אתה', 'את', 'אנחנו', 'אתם', 'אתן',
  'לא', 'כן', 'רק', 'גם', 'אבל', 'אם', 'כך',
  'עוד', 'כבר', 'עכשיו', 'היום', 'מחר', 'אמש',
]);

// ── Types ─────────────────────────────────────────────────────────────────────
export type DurationConfidence = 'low' | 'medium' | 'high';

export interface DurationSuggestion {
  taskId: string;
  title: string;
  currentDurationMinutes: number;
  suggestedDurationMinutes: number;
  confidence: DurationConfidence;
  sampleSize: number;
  averageActualDurationMinutes: number;
  averageDeltaMinutes: number;
  reason: string;
}

export interface DurationSuggestionContext {
  enabled: boolean;
  lookbackDays: number;
  suggestions: DurationSuggestion[];
  warnings: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** מסיר מילות עצירה ומחזיר מילים משמעותיות בלבד */
function normalizeTitle(title: string): string[] {
  return title
    .replace(/[^\u0590-\u05FF\s]/g, '')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1 && !STOP_WORDS_HE.has(w));
}

/**
 * בודק דמיון כותרות — שמרני.
 * דורש לפחות 2 מילים משמעותיות משותפות + Jaccard >= 0.6.
 */
function isTitleMatch(titleA: string, titleB: string): boolean {
  const wordsA = new Set(normalizeTitle(titleA));
  const wordsB = new Set(normalizeTitle(titleB));

  if (wordsA.size < 2 || wordsB.size < 2) return false;

  let shared = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) shared++;
  }

  if (shared < 2) return false;

  const union = new Set([...wordsA, ...wordsB]).size;
  const jaccard = shared / union;
  return jaccard >= 0.6;
}

/** עיגול ל-5 הדקות הקרובות */
function roundToNearest5(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

function getConfidence(sampleSize: number): DurationConfidence {
  if (sampleSize >= 5) return 'high';
  if (sampleSize >= 3) return 'medium';
  return 'low';
}

// ── Main service function ─────────────────────────────────────────────────────

/**
 * buildDurationSuggestionContext
 * מחשב הצעות משך זמן לכל משימה בקלט לפי היסטוריית ביצוע.
 */
export async function buildDurationSuggestionContext(
  userId: string,
  tasks: any[],
  options?: { lookbackDays?: number; dateIso?: string }
): Promise<DurationSuggestionContext> {
  const lookbackDays = options?.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const warnings: string[] = [];

  // ── Query: task_execution_completed events in lookback window ────────────────
  const toDate   = new Date();
  const fromDate = new Date(toDate.getTime() - lookbackDays * 86_400_000);

  const rawEvents = await prisma.learningEvent.findMany({
    where: {
      userId,
      eventType: 'task_execution_completed',
      occurredAt: { gte: fromDate, lte: toDate },
      OR: [
        { source: null },
        { NOT: { source: { in: EXCLUDED_SOURCES } } },
      ],
    },
    orderBy: { occurredAt: 'asc' },
  });

  // ── Filter: only events with valid actualDurationMinutes ─────────────────────
  const validEvents = rawEvents.filter(e => {
    const meta = e.metadata as Record<string, unknown> | null;
    return meta && typeof meta['actualDurationMinutes'] === 'number';
  });

  if (validEvents.length === 0) {
    return { enabled: true, lookbackDays, suggestions: [], warnings };
  }

  // ── Build lookup: taskId → list of actualDurationMinutes ─────────────────────
  // Also store title for title-based matching
  interface ExecRecord {
    taskId: string | null;
    title: string | null;
    actualDurationMinutes: number;
    plannedDurationMinutes: number | null;
  }

  const execRecords: ExecRecord[] = validEvents.map(e => {
    const meta = e.metadata as Record<string, unknown>;
    return {
      taskId: e.taskId ?? null,
      title:  e.taskTitleSnapshot ?? null,
      actualDurationMinutes: meta['actualDurationMinutes'] as number,
      plannedDurationMinutes:
        typeof meta['plannedDurationMinutes'] === 'number'
          ? (meta['plannedDurationMinutes'] as number)
          : null,
    };
  });

  // ── For each input task, find matching exec records ───────────────────────────
  const suggestions: DurationSuggestion[] = [];

  for (const task of tasks) {
    const taskId: string | undefined = task.id;
    const taskTitle: string | undefined = task.title;
    const currentDuration: number | undefined =
      task.durationMinutes ?? task.duration;

    // אם אין duration מוגדר — אין מה להציע
    if (!currentDuration || currentDuration <= 0) continue;

    // מצא אירועי התאמה
    const matches: number[] = [];

    for (const rec of execRecords) {
      let matched = false;

      // 1. התאמת taskId חזקה
      if (taskId && rec.taskId && rec.taskId === taskId) {
        matched = true;
      }

      // 2. התאמת כותרת שמרנית (רק אם אין taskId match)
      if (!matched && taskTitle && rec.title) {
        matched = isTitleMatch(taskTitle, rec.title);
      }

      if (matched) {
        matches.push(rec.actualDurationMinutes);
      }
    }

    if (matches.length === 0) continue;

    // ── חישוב ממוצע ──────────────────────────────────────────────────────────
    const avgActual = matches.reduce((s, v) => s + v, 0) / matches.length;
    const avgActualRounded = Math.round(avgActual);
    const suggestedDurationMinutes = roundToNearest5(avgActualRounded);

    const avgDelta = avgActualRounded - currentDuration;

    // ── תנאי סינון ───────────────────────────────────────────────────────────
    if (suggestedDurationMinutes < MIN_DURATION_MINUTES) continue;
    if (Math.abs(avgDelta) < MIN_DELTA_MINUTES) continue;

    suggestions.push({
      taskId: taskId ?? '',
      title: taskTitle ?? '',
      currentDurationMinutes: currentDuration,
      suggestedDurationMinutes,
      confidence: getConfidence(matches.length),
      sampleSize: matches.length,
      averageActualDurationMinutes: avgActualRounded,
      averageDeltaMinutes: Math.round(avgDelta),
      reason:
        avgDelta > 0
          ? 'משימות דומות לקחו לך בפועל יותר זמן מהמתוכנן'
          : 'משימות דומות סיימת מהר יותר מהמתוכנן',
    });
  }

  return { enabled: true, lookbackDays, suggestions, warnings };
}
