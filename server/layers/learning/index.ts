// Layer 5: Learning Engine
// Stores decisions, patterns, and personal time stats

import type { 
  LearningEntry, 
  PersonalTimeStat,
  InputType,
  PrimaryIntent,
  DecisionAction
} from '../types';

// In-memory storage (will be replaced with DB)
let learningEntries: LearningEntry[] = [];
let personalTimeStats: PersonalTimeStat[] = [];

export function recordLearningEntry(entry: LearningEntry): void {
  learningEntries.push(entry);
  
  // Keep only last 1000 entries
  if (learningEntries.length > 1000) {
    learningEntries = learningEntries.slice(-1000);
  }
}

export function updateTimeStats(
  pattern: string, 
  actualMinutes: number
): PersonalTimeStat {
  const existing = personalTimeStats.find(s => s.pattern === pattern);
  
  if (existing) {
    // Update running average
    const newAvg = (existing.avgMinutes * existing.samples + actualMinutes) / (existing.samples + 1);
    existing.avgMinutes = Math.round(newAvg);
    existing.samples += 1;
    return existing;
  } else {
    // Create new stat
    const newStat: PersonalTimeStat = {
      pattern,
      avgMinutes: actualMinutes,
      samples: 1,
      notes: null
    };
    personalTimeStats.push(newStat);
    return newStat;
  }
}

export function getPersonalTimeStats(): PersonalTimeStat[] {
  return [...personalTimeStats];
}

export function getLearningEntries(limit: number = 100): LearningEntry[] {
  return learningEntries.slice(-limit);
}

export function getPatternInsights(): {
  mostCommonIntents: { intent: PrimaryIntent; count: number }[];
  successRate: number;
  avgCognitiveLoadByTime: { hour: number; avgLoad: string }[];
} {
  const intentCounts: Record<string, number> = {};
  let successCount = 0;
  
  for (const entry of learningEntries) {
    intentCounts[entry.intent] = (intentCounts[entry.intent] || 0) + 1;
    if (entry.outcome === 'success') successCount++;
  }
  
  const mostCommonIntents = Object.entries(intentCounts)
    .map(([intent, count]) => ({ intent: intent as PrimaryIntent, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  const successRate = learningEntries.length > 0 
    ? successCount / learningEntries.length 
    : 0;
  
  return {
    mostCommonIntents,
    successRate,
    avgCognitiveLoadByTime: [] // Placeholder
  };
}

export class LearningEngine {
  record(entry: LearningEntry): void {
    recordLearningEntry(entry);
  }

  updateTime(pattern: string, actualMinutes: number): PersonalTimeStat {
    return updateTimeStats(pattern, actualMinutes);
  }

  getStats(): PersonalTimeStat[] {
    return getPersonalTimeStats();
  }

  getInsights() {
    return getPatternInsights();
  }
}

// READY FOR NEXT LAYER: Automation Layer
