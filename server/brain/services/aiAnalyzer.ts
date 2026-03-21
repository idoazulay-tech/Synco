import { chatCompletion } from "../utils/openai-client.js";
import { storeInsight } from "./memory.js";
import { markAIAnalysisDone, type Flag } from "./localAnalyzer.js";
import { v4 as uuid } from "uuid";
import type { BrainInsight } from "../types/index.js";

const AI_PROMPT = `אתה מנתח התנהגות של משתמש ADHD במערכת ניהול זמן.
קיבלת דגלים (flags) שזוהו במערכת המקומית.
תפקידך: להחזיר תובנה אחת קצרה או שאלה אחת למשתמש.

כללים:
- עברית פשוטה ותומכת
- מקסימום משפט אחד לתובנה ומשפט אחד לשאלה
- אל תשפוט, תעזור
- התמקד בפתרון מעשי

החזר JSON:
{
  "type": "insight" | "question",
  "content": "התוכן",
  "confidence": 0.0-1.0
}`;

export interface AIAnalysisResult {
  type: "insight" | "question";
  content: string;
  confidence: number;
}

export async function runAIAnalysis(
  userId: string,
  flags: Flag[],
  recentText: string
): Promise<AIAnalysisResult | null> {
  const flagsSummary = flags
    .map((f) => `${f.type} (${f.severity}): ${f.detail}`)
    .join("\n");

  const userMessage = `דגלים שזוהו:\n${flagsSummary}\n\nהודעה אחרונה של המשתמש:\n"${recentText}"`;

  try {
    const raw = await chatCompletion(AI_PROMPT, userMessage, {
      temperature: 0.3,
      maxTokens: 256,
      jsonMode: true,
    });

    const parsed = JSON.parse(raw);
    const resultType = parsed.type === "question" ? "question" : "insight";
    const content = String(parsed.content || "");
    const confidence = typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5;

    if (!content) return null;

    if (resultType === "insight") {
      const insight: BrainInsight = {
        id: uuid(),
        userId,
        insightType: "pattern",
        title: flags[0]?.type || "observation",
        description: content,
        confidence,
        evidence: flags.map((f) => f.detail),
        createdAt: new Date(),
        status: "active",
      };
      await storeInsight(insight);
      console.log(`[AIAnalyzer] stored insight for user ${userId}: "${content.substring(0, 60)}"`);
    } else {
      console.log(`[AIAnalyzer] generated question for user ${userId}: "${content.substring(0, 60)}"`);
    }

    await markAIAnalysisDone(userId);

    return { type: resultType, content, confidence };
  } catch (error: any) {
    console.error(`[AIAnalyzer] failed for user ${userId}:`, error.message);
    return null;
  }
}
