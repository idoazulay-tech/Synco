import { QdrantClient } from "@qdrant/js-client-rest";

const url = process.env.QDRANT_URL;
const apiKey = process.env.QDRANT_API_KEY;

if (!url) {
  console.warn("QDRANT_URL is not set — Qdrant client will not be initialized");
}
if (!apiKey) {
  console.warn("QDRANT_API_KEY is not set — Qdrant client will not be initialized");
}

export const qdrant =
  url && apiKey
    ? new QdrantClient({ url, apiKey })
    : null;

console.log(
  qdrant
    ? "Qdrant client initialized"
    : "Qdrant client skipped (missing env vars)"
);

const VECTOR_SIZE = 1536; // אם אתה משתמש ב text-embedding-3-small

// =============================
// 1️⃣ יצירת קולקשנים אם לא קיימים
// =============================
export async function ensureCollections() {
  if (!qdrant) return;

  const collections = [
    "user_events",
    "user_insights",
    "user_profile",
    "synco_knowledge",
  ];

  const existing = await qdrant.getCollections();
  const existingNames = existing.collections.map((c) => c.name);

  for (const name of collections) {
    if (!existingNames.includes(name)) {
      await qdrant.createCollection(name, {
        vectors: {
          size: VECTOR_SIZE,
          distance: "Cosine",
        },
      });
      console.log(`Collection created: ${name}`);
    }
  }
}

// =============================
// 2️⃣ שמירת נקודה (Upsert)
// =============================
export async function upsertPoint(
  collection: string,
  id: string,
  vector: number[],
  payload: Record<string, any>
) {
  if (!qdrant) return;

  await qdrant.upsert(collection, {
    wait: true,
    points: [
      {
        id,
        vector,
        payload,
      },
    ],
  });
}

// =============================
// 3️⃣ חיפוש לפי משמעות
// =============================
export async function searchSimilar(
  collection: string,
  vector: number[],
  userId: string,
  limit = 8
) {
  if (!qdrant) return [];

  const result = await qdrant.search(collection, {
    vector,
    limit,
    with_payload: true,
    filter: {
      must: [
        {
          key: "userId",
          match: { value: userId },
        },
      ],
    },
  });

  return result;
}

// =============================
// 4️⃣ בדיקת חיבור
// =============================
export async function testQdrantConnection() {
  if (!qdrant) {
    console.warn("Qdrant client not available — skipping connection test");
    return;
  }

  try {
    const collections = await qdrant.getCollections();
    console.log("Qdrant connected successfully");
    console.log(collections);
  } catch (error) {
    console.error("Qdrant connection failed", error);
  }
}
