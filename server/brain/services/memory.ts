import { qdrant } from "../../lib/qdrant.js";
import { generateEmbedding } from "../utils/openai-client.js";
import type { BrainEvent, MemorySearchResult, BrainInsight, UserProfileEntry } from "../types/index.js";
import { createTextForEmbedding } from "./ingestion.js";
import { v5 as uuidv5 } from "uuid";

const COLLECTIONS = {
  events: "user_events",
  insights: "user_insights",
  profile: "user_profile",
  knowledge: "synco_knowledge",
} as const;

export async function storeEvent(event: BrainEvent): Promise<string> {
  if (!qdrant) {
    console.warn("Qdrant not available, skipping event storage");
    return event.id;
  }

  const text = createTextForEmbedding(event);
  const { vector } = await generateEmbedding(text);

  await qdrant.upsert(COLLECTIONS.events, {
    wait: true,
    points: [{
      id: event.id,
      vector,
      payload: {
        userId: event.userId,
        type: event.type,
        payload: JSON.stringify(event.payload),
        timestamp: event.timestamp.toISOString(),
        source: event.source,
        status: "active",
        importance: calculateImportance(event),
      },
    }],
  });

  return event.id;
}

export async function storeInsight(insight: BrainInsight): Promise<string> {
  if (!qdrant) return insight.id;

  const text = `${insight.title} | ${insight.description}`;
  const { vector } = await generateEmbedding(text);

  await qdrant.upsert(COLLECTIONS.insights, {
    wait: true,
    points: [{
      id: insight.id,
      vector,
      payload: {
        userId: insight.userId,
        insightType: insight.insightType,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        evidence: JSON.stringify(insight.evidence),
        createdAt: insight.createdAt.toISOString(),
        status: insight.status,
      },
    }],
  });

  return insight.id;
}

export async function storeProfileEntry(entry: UserProfileEntry): Promise<string> {
  if (!qdrant) return entry.id;

  const text = `${entry.category}:${entry.key} = ${entry.value}`;
  const { vector } = await generateEmbedding(text);

  await qdrant.upsert(COLLECTIONS.profile, {
    wait: true,
    points: [{
      id: entry.id,
      vector,
      payload: {
        userId: entry.userId,
        category: entry.category,
        key: entry.key,
        value: entry.value,
        confidence: entry.confidence,
        confirmedByUser: entry.confirmedByUser,
        lastUpdated: entry.lastUpdated.toISOString(),
      },
    }],
  });

  return entry.id;
}

const LEARNING_STATE_NS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

export async function storeLearningState(
  userId: string,
  state: Record<string, unknown>
): Promise<void> {
  if (!qdrant) return;

  const stateId = uuidv5(`learning-state-${userId}`, LEARNING_STATE_NS);
  const text = `learning_state user:${userId} trust:${state.trustLevel}`;
  const { vector } = await generateEmbedding(text);

  await qdrant.upsert(COLLECTIONS.profile, {
    wait: true,
    points: [{
      id: stateId,
      vector,
      payload: {
        userId,
        category: "learning_state",
        key: "brain_trust",
        value: JSON.stringify(state),
        confidence: 1.0,
        confirmedByUser: false,
        lastUpdated: new Date().toISOString(),
      },
    }],
  });
}

export async function loadLearningState(userId: string): Promise<Record<string, unknown> | null> {
  if (!qdrant) return null;

  try {
    const stateId = uuidv5(`learning-state-${userId}`, LEARNING_STATE_NS);
    const points = await qdrant.retrieve(COLLECTIONS.profile, {
      ids: [stateId],
      with_payload: true,
    });

    if (points.length > 0) {
      const value = points[0].payload?.value;
      if (typeof value === 'string') {
        return JSON.parse(value);
      }
    }
  } catch {
  }

  return null;
}

export async function searchMemory(
  query: string,
  userId: string,
  collection: keyof typeof COLLECTIONS,
  limit: number = 5,
  scoreThreshold: number = 0.3
): Promise<MemorySearchResult[]> {
  if (!qdrant) return [];

  const { vector } = await generateEmbedding(query);
  const collectionName = COLLECTIONS[collection];

  const results = await qdrant.search(collectionName, {
    vector,
    limit,
    score_threshold: scoreThreshold,
    filter: {
      must: [{ key: "userId", match: { value: userId } }],
    },
  });

  return results.map(r => ({
    id: typeof r.id === 'string' ? r.id : String(r.id),
    score: r.score,
    payload: r.payload as Record<string, unknown>,
    collection: collectionName,
  }));
}

export async function searchKnowledge(
  query: string,
  limit: number = 3
): Promise<MemorySearchResult[]> {
  if (!qdrant) return [];

  const { vector } = await generateEmbedding(query);

  const results = await qdrant.search(COLLECTIONS.knowledge, {
    vector,
    limit,
    score_threshold: 0.4,
  });

  return results.map(r => ({
    id: typeof r.id === 'string' ? r.id : String(r.id),
    score: r.score,
    payload: r.payload as Record<string, unknown>,
    collection: COLLECTIONS.knowledge,
  }));
}

export async function buildContext(
  query: string,
  userId: string
): Promise<{
  recentEvents: MemorySearchResult[];
  relevantInsights: MemorySearchResult[];
  userProfile: MemorySearchResult[];
  knowledgeHints: MemorySearchResult[];
}> {
  const [recentEvents, relevantInsights, userProfile, knowledgeHints] = await Promise.all([
    searchMemory(query, userId, "events", 5),
    searchMemory(query, userId, "insights", 3),
    searchMemory(query, userId, "profile", 5, 0.2),
    searchKnowledge(query, 3),
  ]);

  return { recentEvents, relevantInsights, userProfile, knowledgeHints };
}

function calculateImportance(event: BrainEvent): string {
  const highImportance = ['preference_expressed', 'feedback_given', 'task_completed'];
  const mediumImportance = ['task_created', 'schedule_changed', 'check_in_response'];

  if (highImportance.includes(event.type)) return 'high';
  if (mediumImportance.includes(event.type)) return 'medium';
  return 'low';
}
