const USER_ID = 'default-user';

export interface LearningEventPayload {
  userId?: string;
  taskId?: string;
  eventType:
    | 'task_created'
    | 'task_completed'
    | 'task_rescheduled'
    | 'task_deleted'
    | 'schedule_applied'
    | 'task_updated';
  source?: string;
  dateIso?: string;
  taskTitleSnapshot?: string;
  fromStatus?: string;
  toStatus?: string;
  fromStartTime?: string;
  toStartTime?: string;
  fromEndTime?: string;
  toEndTime?: string;
  metadata?: Record<string, unknown>;
}

export interface LearningEventRecord {
  id: string;
  userId: string;
  taskId?: string;
  eventType: string;
  source?: string;
  occurredAt: string;
  dateIso?: string;
  taskTitleSnapshot?: string;
  fromStatus?: string;
  toStatus?: string;
  fromStartTime?: string;
  toStartTime?: string;
  fromEndTime?: string;
  toEndTime?: string;
  metadata?: Record<string, unknown>;
}

/**
 * שומר learning event — fire-and-forget.
 * כישלון לא שובר שום פעולת משתמש.
 */
export function logLearningEvent(payload: LearningEventPayload): void {
  const body: LearningEventPayload = { userId: USER_ID, ...payload };

  fetch('/api/learning/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((e) => {
    console.warn('[learningClient] logLearningEvent failed (silent):', e);
  });
}

/**
 * מחזיר את ה-events האחרונים לצורך בדיקה בלבד.
 */
export async function getLearningEvents(
  userId = USER_ID,
  limit = 50
): Promise<LearningEventRecord[]> {
  try {
    const res = await fetch(`/api/learning/events?userId=${userId}&limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.events ?? [];
  } catch (e) {
    console.warn('[learningClient] getLearningEvents failed:', e);
    return [];
  }
}
