import { TaskPriority, TaskFlexibility, RecurringRule } from './task';

/**
 * PlanningDraftTask = משימה זמנית לפני אישור.
 * UserTask = משימה אמיתית שנשמרה ב-DB.
 * ScheduledTaskPreview = הצעת שיבוץ בלבד (מה-planner/schedule).
 *
 * Draft tasks:
 * - אינן מקבלות learningBoost אמיתי
 * - אינן נחשבות כהיסטוריה
 * - אינן נשמרות כ-UserTask עד לאישור מפורש
 */

export type DraftTaskSource = 'voice' | 'text' | 'ai_parse' | 'manual';
export type DraftTaskStatus = 'draft';

export interface PlanningDraftTask {
  id: string;
  title: string;
  description?: string;
  dateIso?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  priority: TaskPriority;
  flexibility: TaskFlexibility;
  status: DraftTaskStatus;
  source: DraftTaskSource;
  rawInput?: string;
  category?: string;
  projectId?: string;
  recurrence?: RecurringRule;
  notes?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export type PlanningDraftTaskPatch = Partial<Omit<PlanningDraftTask, 'id' | 'status' | 'createdAt'>>;

export interface CommitDraftSchedulePayload {
  userId: string;
  date: string;
  draftTasks: PlanningDraftTask[];
  scheduledItems: Array<{
    draftId: string;
    startTime: string;
    endTime: string;
  }>;
  timezoneOffsetMinutes: number;
  userTimeZone: string;
}

export interface CommitDraftScheduleResponse {
  ok: boolean;
  createdCount: number;
  createdTasks: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
  }>;
  draftToTaskMap: Record<string, string>;
  error?: string;
}
