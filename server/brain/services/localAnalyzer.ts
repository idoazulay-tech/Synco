import { prisma } from "../../lib/prisma.js";

export type FlagType =
  | "MISSING_INFO"
  | "REPEATED_POSTPONE"
  | "OVERLOAD_DAY"
  | "PRIORITY_UNCLEAR"
  | "PATTERN_SHIFT"
  | "SCHEDULING_CONFLICT";

export interface Flag {
  type: FlagType;
  severity: "low" | "medium" | "high";
  detail: string;
}

export interface LocalAnalysisResult {
  flags: Flag[];
  shouldTriggerAI: boolean;
  reason: string;
}

interface EventPayload {
  type: string;
  text: string;
  [key: string]: unknown;
}

const AI_COOLDOWN_MS = 10 * 60 * 1000;
const AI_EVENT_THRESHOLD = 5;
const OVERLOAD_THRESHOLD = 8;
const POSTPONE_ALARM = 3;

export async function analyzeEventLocal(
  userId: string,
  event: EventPayload
): Promise<LocalAnalysisResult> {
  const metrics = await getOrCreateMetrics(userId);
  const flags: Flag[] = [];

  detectMissingInfo(event, flags);
  detectRepeatedPostpone(event, metrics, flags);
  detectOverloadDay(event, metrics, flags);
  detectPriorityUnclear(event, flags);
  detectPatternShift(event, metrics, flags);

  const updatedMetrics = computeMetricsUpdate(event, metrics);
  await persistMetrics(userId, updatedMetrics);

  if (flags.length > 0) {
    await persistFlags(userId, flags);
  }

  const { shouldTrigger, reason } = evaluateAITrigger(flags, updatedMetrics);

  if (shouldTrigger) {
    console.log(`[LocalAnalyzer] flags: [${flags.map(f => f.type).join(", ")}] -> AI triggered (${reason})`);
  } else {
    console.log(`[LocalAnalyzer] flags: [${flags.map(f => f.type).join(", ") || "none"}] -> AI skipped`);
  }

  return { flags, shouldTriggerAI: shouldTrigger, reason };
}

async function getOrCreateMetrics(userId: string) {
  return prisma.userMetrics.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

function detectMissingInfo(event: EventPayload, flags: Flag[]) {
  if (event.type !== "message") return;
  const text = (event.text || "").toLowerCase();

  const hasTimeWord = /\d{1,2}[:.]\d{2}|\bב-?\d|\bבשעה|\bמ-?\d|\bעד\s?\d|\bבין\s?\d/.test(text);
  const hasDuration = /דקות|שעה|שעות|חצי שעה|רבע שעה/.test(text);

  const looksLikeTask = /צריך|חייב|לעשות|משימה|פגישה|תור|לקבוע|להספיק|לסיים|להגיש/.test(text);

  if (looksLikeTask && !hasTimeWord && !hasDuration) {
    flags.push({
      type: "MISSING_INFO",
      severity: "medium",
      detail: "נראה כמו משימה אבל חסר זמן או משך",
    });
  }
}

function detectRepeatedPostpone(
  event: EventPayload,
  metrics: { tasksPostponedCount: number },
  flags: Flag[]
) {
  const text = (event.text || "").toLowerCase();
  const isPostpone = /דוחה|נדחה|אחר כך|לא עכשיו|מחר|מאוחר יותר|לא הספקתי/.test(text);

  if (isPostpone && metrics.tasksPostponedCount >= POSTPONE_ALARM - 1) {
    flags.push({
      type: "REPEATED_POSTPONE",
      severity: "high",
      detail: `דחיות חוזרות (${metrics.tasksPostponedCount + 1} פעמים)`,
    });
  }
}

function detectOverloadDay(
  event: EventPayload,
  metrics: { tasksCreatedCount: number; eventsCount: number },
  flags: Flag[]
) {
  const text = (event.text || "").toLowerCase();
  const isTaskCreation = /צריך|חייב|לעשות|להוסיף|עוד משימה|גם/.test(text);

  if (isTaskCreation && metrics.eventsCount > OVERLOAD_THRESHOLD) {
    flags.push({
      type: "OVERLOAD_DAY",
      severity: "medium",
      detail: `הרבה אירועים היום (${metrics.eventsCount + 1})`,
    });
  }
}

function detectPriorityUnclear(event: EventPayload, flags: Flag[]) {
  const text = (event.text || "").toLowerCase();
  const urgentCount = (text.match(/דחוף|חשוב|קריטי|בהול|חייב עכשיו/g) || []).length;

  if (urgentCount >= 2) {
    flags.push({
      type: "PRIORITY_UNCLEAR",
      severity: "medium",
      detail: "הרבה דברים מסומנים כדחופים - קשה לתעדף",
    });
  }
}

function detectPatternShift(
  event: EventPayload,
  metrics: { eventsCount: number; tasksCompletedCount: number; tasksPostponedCount: number },
  flags: Flag[]
) {
  if (metrics.eventsCount < 10) return;

  const completionRate = metrics.tasksCompletedCount / Math.max(1, metrics.eventsCount);
  const postponeRate = metrics.tasksPostponedCount / Math.max(1, metrics.eventsCount);

  if (postponeRate > 0.5 && metrics.eventsCount > 15) {
    flags.push({
      type: "PATTERN_SHIFT",
      severity: "high",
      detail: `שיעור דחיות גבוה (${Math.round(postponeRate * 100)}%)`,
    });
  }

  if (completionRate < 0.2 && metrics.eventsCount > 15) {
    flags.push({
      type: "PATTERN_SHIFT",
      severity: "high",
      detail: `שיעור השלמה נמוך (${Math.round(completionRate * 100)}%)`,
    });
  }
}

function computeMetricsUpdate(event: EventPayload, current: {
  eventsCount: number;
  tasksCreatedCount: number;
  tasksCompletedCount: number;
  tasksPostponedCount: number;
  eventsSinceAnalysis: number;
  currentStreak: number;
  bestStreak: number;
}) {
  const text = (event.text || "").toLowerCase();
  const isTask = /צריך|חייב|לעשות|משימה|פגישה/.test(text);
  const isComplete = /סיימתי|עשיתי|הושלם|בוצע|גמרתי/.test(text);
  const isPostpone = /דוחה|נדחה|אחר כך|לא עכשיו|מאוחר יותר|לא הספקתי/.test(text);

  let newStreak = current.currentStreak;
  let bestStreak = current.bestStreak;
  if (isComplete) {
    newStreak += 1;
    bestStreak = Math.max(bestStreak, newStreak);
  } else if (isPostpone) {
    newStreak = 0;
  }

  return {
    eventsCount: current.eventsCount + 1,
    eventsSinceAnalysis: current.eventsSinceAnalysis + 1,
    tasksCreatedCount: current.tasksCreatedCount + (isTask ? 1 : 0),
    tasksCompletedCount: current.tasksCompletedCount + (isComplete ? 1 : 0),
    tasksPostponedCount: current.tasksPostponedCount + (isPostpone ? 1 : 0),
    currentStreak: newStreak,
    bestStreak,
  };
}

async function persistMetrics(
  userId: string,
  data: ReturnType<typeof computeMetricsUpdate>
) {
  await prisma.userMetrics.upsert({
    where: { userId },
    create: {
      userId,
      ...data,
      lastEventAt: new Date(),
    },
    update: {
      ...data,
      lastEventAt: new Date(),
    },
  });
}

async function persistFlags(userId: string, flags: Flag[]) {
  await prisma.brainFlag.createMany({
    data: flags.map((f) => ({
      userId,
      flagType: f.type,
      context: { severity: f.severity, detail: f.detail } as any,
    })),
  });
}

function evaluateAITrigger(
  flags: Flag[],
  metrics: { eventsSinceAnalysis: number; lastAIAnalysisAt?: Date | null }
): { shouldTrigger: boolean; reason: string } {
  const highFlags = flags.filter((f) => f.severity === "high");

  if (highFlags.length > 0) {
    const timeSinceLastAI = metrics.lastAIAnalysisAt
      ? Date.now() - new Date(metrics.lastAIAnalysisAt).getTime()
      : Infinity;

    if (timeSinceLastAI < AI_COOLDOWN_MS) {
      return { shouldTrigger: false, reason: `cooldown active (${Math.round((AI_COOLDOWN_MS - timeSinceLastAI) / 1000)}s left)` };
    }

    return {
      shouldTrigger: true,
      reason: `high severity flags: ${highFlags.map((f) => f.type).join(", ")}`,
    };
  }

  if (metrics.eventsSinceAnalysis >= AI_EVENT_THRESHOLD && flags.length > 0) {
    const timeSinceLastAI = metrics.lastAIAnalysisAt
      ? Date.now() - new Date(metrics.lastAIAnalysisAt).getTime()
      : Infinity;

    if (timeSinceLastAI < AI_COOLDOWN_MS) {
      return { shouldTrigger: false, reason: "cooldown active" };
    }

    return {
      shouldTrigger: true,
      reason: `${metrics.eventsSinceAnalysis} events since last analysis + flags present`,
    };
  }

  return { shouldTrigger: false, reason: "no significant flags" };
}

export async function markAIAnalysisDone(userId: string) {
  await prisma.userMetrics.update({
    where: { userId },
    data: {
      lastAIAnalysisAt: new Date(),
      eventsSinceAnalysis: 0,
    },
  });
}

export async function getUserMetrics(userId: string) {
  return prisma.userMetrics.findUnique({ where: { userId } });
}

export async function getUnresolvedFlags(userId: string) {
  return prisma.brainFlag.findMany({
    where: { userId, resolved: false },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}
