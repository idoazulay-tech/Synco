import { Router, Request, Response } from "express";
import { qdrant } from "../lib/qdrant.js";
import { generateEmbedding } from "../brain/utils/openai-client.js";

const router = Router();

function validateUserId(req: Request, res: Response): string | null {
  const userId = req.body?.userId;
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    res.status(400).json({ error: "userId is required and must be a non-empty string" });
    return null;
  }
  return userId.trim();
}

router.post("/debug/search", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Debug endpoint disabled in production" });
  }

  const userId = validateUserId(req, res);
  if (!userId) return;

  const { text, collection } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text is required" });
  }

  const validCollections = ["user_events", "user_insights", "user_profile", "synco_knowledge"];
  const targetCollection = validCollections.includes(collection) ? collection : "user_events";

  if (!qdrant) {
    return res.status(503).json({ error: "Qdrant client not available" });
  }

  try {
    const { vector } = await generateEmbedding(text);

    const isPersonalCollection = targetCollection !== "synco_knowledge";

    const results = await qdrant.search(targetCollection, {
      vector,
      limit: 5,
      with_payload: true,
      ...(isPersonalCollection
        ? {
            filter: {
              must: [{ key: "userId", match: { value: userId } }],
            },
          }
        : {}),
    });

    res.json({
      collection: targetCollection,
      filteredByUserId: isPersonalCollection ? userId : "N/A (shared knowledge)",
      resultsCount: results.length,
      results: results.map((r) => ({
        id: r.id,
        score: r.score,
        payload: r.payload,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { validateUserId };
export default router;
