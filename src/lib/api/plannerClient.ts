import { Task } from '@/types/task';

export interface ScheduledTaskPreview {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  priority: string;
  reason: string;
  confidence: number;
}

export interface UnscheduledTaskPreview {
  id: string;
  title: string;
  reason: string;
}

export interface SchedulePreviewSummary {
  totalTasks: number;
  scheduledCount: number;
  unscheduledCount: number;
  dayLoadMinutes: number;
}

export interface SchedulePreviewResponse {
  ok: boolean;
  date: string;
  userId: string;
  scheduledTasks: ScheduledTaskPreview[];
  unscheduledTasks: UnscheduledTaskPreview[];
  warnings: string[];
  summary: SchedulePreviewSummary;
}

function taskToPayload(task: Task) {
  return {
    id: task.id,
    title: task.title,
    startTime: task.startTime.toISOString(),
    endTime: task.endTime.toISOString(),
    duration: task.duration,
    status: task.status,
    priority: task.priority ?? null,
    flexibility: task.flexibility ?? null,
  };
}

export async function scheduleDayPreview(
  dateIso: string,
  tasks: Task[],
  userId = 'default-user',
  dayStart = '08:00',
  dayEnd = '22:00'
): Promise<SchedulePreviewResponse> {
  const activeTasks = tasks.filter(
    t => t.status !== 'completed' && t.status !== 'standby'
  );

  const res = await fetch('/api/planner/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      date: dateIso,
      dayStart,
      dayEnd,
      tasks: activeTasks.map(taskToPayload),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}
