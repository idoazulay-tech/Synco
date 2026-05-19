import { AI_FEATURES } from '../aiFeatureFlags.js';
import { getAIProvider } from '../providers/getAIProvider.js';
import { enrichUserPromptWithMemory } from '../memory/syncoMemoryContext.js';
import {
  ParsedPlanningIntentSchema,
  TaskBreakdownSchema,
  DayCommandIntentSchema,
  TaskReportAIAnalysisSchema,
  type ParsedPlanningIntent,
  type TaskBreakdown,
  type DayCommandIntent,
  type TaskReportAIAnalysis,
} from '../schemas/syncoAISchemas.js';
import {
  PARSE_PLANNING_SYSTEM_PROMPT,
  DAY_COMMAND_SYSTEM_PROMPT,
  TASK_BREAKDOWN_SYSTEM_PROMPT,
  TASK_REPORT_SYSTEM_PROMPT,
  TASK_GUIDANCE_SYSTEM_PROMPT,
} from '../prompts/syncoSystemPrompts.js';
import {
  validateDayCommandIntent,
  validateParsedPlanningIntent,
  validateTaskBreakdown,
  type ExistingTaskRef,
} from '../validators/syncoAIOutputValidator.js';

export interface DisabledResult {
  ok: false;
  reason: 'ai_disabled' | 'feature_disabled' | 'key_missing' | 'ai_validation_failed' | 'ai_error';
  warnings?: string[];
  questions?: string[];
}

export type PlanningParseResult =
  | (ParsedPlanningIntent & { ok: true; parser: 'ai_structured'; aiWarnings?: string[] })
  | DisabledResult;

export type DayCommandResult =
  | (DayCommandIntent & { ok: true; validatorWarnings?: string[] })
  | (DisabledResult & { needsClarification?: boolean; questions?: string[] });

export type BreakdownResult =
  | (TaskBreakdown & { ok: true })
  | DisabledResult;

export type TaskReportResult =
  | (TaskReportAIAnalysis & { ok: true })
  | DisabledResult;

export interface TaskGuidanceResult {
  ok: boolean;
  explanation: string;
  firstStep: string;
  confidence: 'low' | 'medium' | 'high';
  source: 'ai' | 'fallback';
}

// ─── Parse planning input with AI ─────────────────────────────────────────────

export async function parsePlanningInputWithAI(params: {
  text: string;
  dateIso?: string;
  existingTasks?: ExistingTaskRef[];
}): Promise<PlanningParseResult> {
  if (!AI_FEATURES.enabled) return { ok: false, reason: 'ai_disabled' };
  if (!AI_FEATURES.parseEnabled) return { ok: false, reason: 'feature_disabled' };

  const provider = getAIProvider();
  const userPrompt = `היום: ${params.dateIso ?? new Date().toISOString().split('T')[0]}
${params.existingTasks?.length ? `משימות קיימות:\n${params.existingTasks.map((t) => `- ${t.id}: ${t.title}`).join('\n')}` : ''}

המשתמש אמר:
"${params.text}"

החזר JSON:`;

  // ── Synco Brain Memory enrichment ────────────────────────────────────────────
  // TODO: replace 'default-user' with authenticated user/session userId once
  //       auth is wired into this function's call-site.
  const enriched = await enrichUserPromptWithMemory({
    userId:        'default-user',
    text:          userPrompt,
    patternFamily: 'generic_planning',
    maxMemories:   5,
  });
  const finalUserPrompt = enriched.ok ? enriched.enrichedText : userPrompt;
  // ─────────────────────────────────────────────────────────────────────────────

  const response = await provider.generateStructured<unknown>({
    systemPrompt: PARSE_PLANNING_SYSTEM_PROMPT,
    userPrompt:   finalUserPrompt,
    schemaName: 'ParsedPlanningIntent',
    temperature: 0.2,
  });

  if (!response.ok) {
    return { ok: false, reason: 'ai_error' };
  }

  const parsed = ParsedPlanningIntentSchema.safeParse(response.data);
  if (!parsed.success) {
    console.warn('[parsePlanningInputWithAI] schema validation failed:', parsed.error.message);
    return { ok: false, reason: 'ai_validation_failed' };
  }

  const validation = validateParsedPlanningIntent(response.data);
  if (!validation.ok) {
    return { ok: false, reason: 'ai_validation_failed', warnings: validation.warnings };
  }

  return {
    ...parsed.data,
    ok: true,
    parser: 'ai_structured',
    aiWarnings: validation.warnings,
  };
}

// ─── Interpret day command with AI ────────────────────────────────────────────

export async function interpretDayCommandWithAI(params: {
  userId: string;
  dateIso: string;
  text: string;
  nowIso?: string;
  settings?: Record<string, unknown>;
  existingTasks: ExistingTaskRef[];
  selectedTaskIds?: string[];
}): Promise<DayCommandResult> {
  if (!AI_FEATURES.enabled) return { ok: false, reason: 'ai_disabled' };
  if (!AI_FEATURES.dayCommandEnabled) return { ok: false, reason: 'feature_disabled' };

  const provider = getAIProvider();

  const tasksJson = JSON.stringify(
    params.existingTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      startTime: t.startTime ?? null,
      endTime: t.endTime ?? null,
    })),
    null,
    2
  );

  const selectedNote =
    params.selectedTaskIds?.length
      ? `\nמשימות שנבחרו ע"י המשתמש: ${params.selectedTaskIds.join(', ')}`
      : '';

  const userPrompt = `תאריך: ${params.dateIso}
עכשיו: ${params.nowIso ?? new Date().toISOString()}${selectedNote}

משימות קיימות ביום:
${tasksJson}

הוראת המשתמש:
"${params.text}"

החזר JSON:`;

  const enriched = await enrichUserPromptWithMemory({
    userId:        params.userId,
    text:          userPrompt,
    patternFamily: 'day_modification',
    maxMemories:   5,
  });
  const finalUserPrompt = enriched.ok ? enriched.enrichedText : userPrompt;

  const response = await provider.generateStructured<unknown>({
    systemPrompt: DAY_COMMAND_SYSTEM_PROMPT,
    userPrompt:   finalUserPrompt,
    schemaName: 'DayCommandIntent',
    temperature: 0.15,
  });

  if (!response.ok) {
    return { ok: false, reason: 'ai_error' };
  }

  const parsed = DayCommandIntentSchema.safeParse(response.data);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    console.warn('[interpretDayCommandWithAI] schema validation failed:', issues);
    return {
      ok: false,
      reason: 'ai_validation_failed',
      warnings: issues,
      questions: ['לא הצלחתי לנתח את הפקודה בצורה מדויקת. אנא נסה לנסח מחדש.'],
    };
  }

  // Ensure all operations have unique operationIds (AI may return duplicates or 'op_unknown')
  const fixedData = {
    ...parsed.data,
    operations: parsed.data.operations.map((op, idx) => ({
      ...op,
      operationId: op.operationId === 'op_unknown' || !op.operationId
        ? `op_${idx + 1}`
        : op.operationId,
    })),
  };

  const validation = validateDayCommandIntent(fixedData, params.existingTasks, params.nowIso);
  if (!validation.ok) {
    return { ok: false, reason: 'ai_validation_failed', warnings: validation.warnings };
  }

  const sanitized = validation.sanitized!;

  // Treat ambiguous/low-confidence as clarification needed
  if (sanitized.commandType === 'ask_clarification' || sanitized.questions.length > 0) {
    return {
      ...sanitized,
      ok: true,
      needsClarification: true,
      validatorWarnings: validation.warnings,
    } as DayCommandIntent & { ok: true; needsClarification: true; validatorWarnings?: string[] };
  }

  return { ...sanitized, ok: true, validatorWarnings: validation.warnings };
}

// ─── Build task breakdown with AI ─────────────────────────────────────────────

export async function buildTaskBreakdownWithAI(params: {
  taskTitle: string;
  taskDescription?: string;
  selectedOption?: string;
  freeText?: string;
}): Promise<BreakdownResult> {
  if (!AI_FEATURES.enabled) return { ok: false, reason: 'ai_disabled' };
  if (!AI_FEATURES.breakdownEnabled) return { ok: false, reason: 'feature_disabled' };

  const provider = getAIProvider();
  const userPrompt = `משימה: "${params.taskTitle}"${params.taskDescription ? `\nתיאור: ${params.taskDescription}` : ''}${params.selectedOption ? `\nהמשתמש דיווח: ${params.selectedOption}` : ''}${params.freeText ? `\nפרטים נוספים: "${params.freeText}"` : ''}

פרק את המשימה לצעדים פעולתיים. החזר JSON:`;

  const response = await provider.generateStructured<unknown>({
    systemPrompt: TASK_BREAKDOWN_SYSTEM_PROMPT,
    userPrompt,
    schemaName: 'TaskBreakdown',
    temperature: 0.2,
  });

  if (!response.ok) return { ok: false, reason: 'ai_error' };

  const parsed = TaskBreakdownSchema.safeParse(response.data);
  if (!parsed.success) {
    return { ok: false, reason: 'ai_validation_failed' };
  }

  const validation = validateTaskBreakdown(response.data);
  if (!validation.ok) return { ok: false, reason: 'ai_validation_failed' };

  return { ...parsed.data, ok: true };
}

// ─── Analyze task report with AI ──────────────────────────────────────────────

export async function analyzeTaskReportWithAI(params: {
  taskTitle: string;
  taskDescription?: string;
  selectedOption: string;
  selectedLabel: string;
  freeText?: string;
}): Promise<TaskReportResult> {
  if (!AI_FEATURES.enabled) return { ok: false, reason: 'ai_disabled' };
  if (!AI_FEATURES.taskReportEnabled) return { ok: false, reason: 'feature_disabled' };

  const provider = getAIProvider();
  const userPrompt = `משימה: "${params.taskTitle}"${params.taskDescription ? `\nתיאור: ${params.taskDescription}` : ''}
אפשרות שנבחרה: "${params.selectedLabel}" (id: ${params.selectedOption})${params.freeText ? `\nהמשתמש הסביר: "${params.freeText}"` : ''}

נתח את הדיווח. scope=task_only. החזר JSON:`;

  const response = await provider.generateStructured<unknown>({
    systemPrompt: TASK_REPORT_SYSTEM_PROMPT,
    userPrompt,
    schemaName: 'TaskReportAIAnalysis',
    temperature: 0.2,
  });

  if (!response.ok) return { ok: false, reason: 'ai_error' };

  const parsed = TaskReportAIAnalysisSchema.safeParse(response.data);
  if (!parsed.success) {
    console.warn('[analyzeTaskReportWithAI] schema validation failed:', parsed.error.message);
    return { ok: false, reason: 'ai_validation_failed' };
  }

  // Enforce scope=task_only — never allow scope to widen
  const data = { ...parsed.data, scope: 'task_only' as const };

  return { ...data, ok: true };
}

// ─── Get task guidance with AI (why now / help me start) ──────────────────────

export async function getTaskGuidanceWithAI(params: {
  taskTitle: string;
  taskDescription?: string;
  startTime?: string;
  nowIso?: string;
}): Promise<TaskGuidanceResult> {
  if (!AI_FEATURES.enabled || !AI_FEATURES.taskReportEnabled) {
    return {
      ok: false,
      explanation: '',
      firstStep: '',
      confidence: 'low',
      source: 'fallback',
    };
  }

  const provider = getAIProvider();
  const userPrompt = `משימה: "${params.taskTitle}"${params.taskDescription ? `\nתיאור: ${params.taskDescription}` : ''}${params.startTime ? `\nשעת התחלה: ${params.startTime}` : ''}${params.nowIso ? `\nעכשיו: ${params.nowIso}` : ''}

תן הסבר קצר למה כדאי להתחיל עכשיו, וצעד ראשון קונקרטי. החזר JSON:`;

  try {
    const response = await provider.generateStructured<unknown>({
      systemPrompt: TASK_GUIDANCE_SYSTEM_PROMPT,
      userPrompt,
      schemaName: 'TaskGuidance',
      temperature: 0.3,
    });

    if (!response.ok) throw new Error('ai_error');

    const data = response.data as any;
    return {
      ok: true,
      explanation: typeof data?.explanation === 'string' ? data.explanation : '',
      firstStep: typeof data?.firstStep === 'string' ? data.firstStep : '',
      confidence: ['low', 'medium', 'high'].includes(data?.confidence) ? data.confidence : 'medium',
      source: 'ai',
    };
  } catch {
    return {
      ok: false,
      explanation: '',
      firstStep: '',
      confidence: 'low',
      source: 'fallback',
    };
  }
}
