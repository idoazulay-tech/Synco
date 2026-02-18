import { v4 as uuid } from "uuid";
import type { CuriosityItem } from "../types/index.js";

const curiosityQueues = new Map<string, CuriosityItem[]>();

export function scheduleCuriosityQuestions(
  userId: string,
  questions: string[]
): CuriosityItem[] {
  if (!curiosityQueues.has(userId)) {
    curiosityQueues.set(userId, []);
  }

  const queue = curiosityQueues.get(userId)!;
  const now = new Date();

  const newItems: CuriosityItem[] = questions.map((q, i) => ({
    id: uuid(),
    userId,
    question: q,
    priority: Math.max(0.5, 1 - i * 0.15),
    scheduledFor: new Date(now.getTime() + (i + 1) * 30 * 60 * 1000),
    status: 'pending' as const,
  }));

  const existing = new Set(queue.map(q => q.question.toLowerCase()));
  const unique = newItems.filter(q => !existing.has(q.question.toLowerCase()));

  queue.push(...unique);

  if (queue.length > 20) {
    queue.sort((a, b) => b.priority - a.priority);
    queue.length = 20;
  }

  return unique;
}

export function getNextCuriosityQuestion(userId: string): CuriosityItem | null {
  const queue = curiosityQueues.get(userId);
  if (!queue || queue.length === 0) return null;

  const now = new Date();
  const ready = queue
    .filter(q => q.status === 'pending' && q.scheduledFor <= now)
    .sort((a, b) => b.priority - a.priority);

  return ready[0] || null;
}

export function markCuriosityAnswered(userId: string, questionId: string): void {
  const queue = curiosityQueues.get(userId);
  if (!queue) return;

  const item = queue.find(q => q.id === questionId);
  if (item) {
    item.status = 'answered';
  }
}

export function getPendingCuriosity(userId: string): CuriosityItem[] {
  const queue = curiosityQueues.get(userId);
  if (!queue) return [];
  return queue.filter(q => q.status === 'pending');
}
