import { v4 as uuid } from "uuid";
import type { BrainEvent } from "../types/index.js";

export interface RawInput {
  userId: string;
  text?: string;
  type: BrainEvent['type'];
  payload?: Record<string, unknown>;
  source?: BrainEvent['source'];
}

function normalizeHebrewText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[״"]/g, '"')
    .replace(/[׳']/g, "'")
    .trim();
}

function extractMetadata(input: RawInput): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    ...input.payload,
    originalText: input.text,
  };

  if (input.text) {
    meta.textLength = input.text.length;
    meta.hasHebrew = /[\u0590-\u05FF]/.test(input.text);
    meta.wordCount = input.text.split(/\s+/).filter(Boolean).length;
  }

  return meta;
}

export function ingestEvent(input: RawInput): BrainEvent {
  const normalizedText = input.text ? normalizeHebrewText(input.text) : undefined;

  const event: BrainEvent = {
    id: uuid(),
    userId: input.userId,
    type: input.type,
    payload: {
      ...extractMetadata(input),
      ...(normalizedText ? { normalizedText } : {}),
    },
    timestamp: new Date(),
    source: input.source ?? 'user',
  };

  return event;
}

export function createTextForEmbedding(event: BrainEvent): string {
  const parts: string[] = [];

  parts.push(`type:${event.type}`);

  const text = event.payload.normalizedText || event.payload.originalText;
  if (typeof text === 'string') {
    parts.push(text);
  }

  if (event.payload.taskName && typeof event.payload.taskName === 'string') {
    parts.push(`task:${event.payload.taskName}`);
  }

  if (event.payload.category && typeof event.payload.category === 'string') {
    parts.push(`category:${event.payload.category}`);
  }

  return parts.join(' | ');
}
