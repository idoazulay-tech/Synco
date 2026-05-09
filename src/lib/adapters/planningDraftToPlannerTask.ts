import { PlanningDraftTask } from '@/types/planningDraft';

/**
 * ממיר PlanningDraftTask לפורמט שה-planner/schedule API מצפה לו.
 *
 * חשוב:
 * - Draft tasks לא מקבלות learningBoost
 * - Draft tasks לא נמצאות ב-DB (אין להן userId אמיתי)
 * - startTime/endTime הם ISO זמניים בלבד לצורך Schedule Preview
 */
export function draftTaskToPlannerPayload(draft: PlanningDraftTask, dateIso: string) {
  const startIso = buildStartTimeIso(draft, dateIso);
  const endIso = buildEndTimeIso(draft, dateIso, startIso);

  return {
    id: draft.id,
    title: draft.title,
    startTime: startIso,
    endTime: endIso,
    duration: draft.durationMinutes,
    status: 'pending',
    priority: draft.priority,
    flexibility: draft.flexibility,
  };
}

function buildStartTimeIso(draft: PlanningDraftTask, dateIso: string): string {
  if (draft.startTime) {
    return `${dateIso}T${draft.startTime}:00.000Z`;
  }
  return `${dateIso}T08:00:00.000Z`;
}

function buildEndTimeIso(draft: PlanningDraftTask, dateIso: string, startIso: string): string {
  if (draft.endTime) {
    return `${dateIso}T${draft.endTime}:00.000Z`;
  }
  const startMs = new Date(startIso).getTime();
  const endMs = startMs + draft.durationMinutes * 60 * 1000;
  return new Date(endMs).toISOString();
}

export function draftsForDate(drafts: PlanningDraftTask[], dateIso: string): PlanningDraftTask[] {
  return drafts.filter(d => d.dateIso === dateIso || !d.dateIso);
}

export function hasMissingDates(drafts: PlanningDraftTask[]): boolean {
  return drafts.some(d => !d.dateIso);
}

export function allSameDate(drafts: PlanningDraftTask[]): boolean {
  const datesWithValue = drafts.filter(d => d.dateIso).map(d => d.dateIso);
  if (datesWithValue.length === 0) return true;
  return new Set(datesWithValue).size === 1;
}
