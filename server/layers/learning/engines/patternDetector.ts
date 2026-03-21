// Pattern Detector - Identifies patterns from decision logs

import type { DecisionLog, Pattern, RuleType, PatternStats } from '../types/learningTypes';
import { createPattern, updatePattern, isPatternReadyForRule } from '../models/Pattern';
import { LEARNING_THRESHOLDS } from '../policies/thresholds';

let patternIdCounter = 0;

function generatePatternId(): string {
  return `pat_${Date.now()}_${++patternIdCounter}`;
}

export function detectPatternType(situationKey: string): RuleType {
  if (situationKey.startsWith('reshuffle:')) return 'reshuffle';
  if (situationKey.includes('mustLock') || situationKey.includes('lock')) return 'mustLock';
  if (situationKey.includes('time') || situationKey.includes('schedule')) return 'schedule';
  return 'priority';
}

export function updatePatternStats(
  existingStats: PatternStats[],
  decisionLog: DecisionLog
): PatternStats[] {
  const stats = [...existingStats];
  const existingIndex = stats.findIndex(s => s.situationKey === decisionLog.situationKey);
  
  if (existingIndex >= 0) {
    const existing = stats[existingIndex];
    const newChoiceCounts = { ...existing.choiceCounts };
    newChoiceCounts[decisionLog.userChoice] = (newChoiceCounts[decisionLog.userChoice] || 0) + 1;
    
    stats[existingIndex] = {
      ...existing,
      totalOccurrences: existing.totalOccurrences + 1,
      choiceCounts: newChoiceCounts,
      lastUpdatedIso: new Date().toISOString()
    };
  } else {
    stats.push({
      situationKey: decisionLog.situationKey,
      totalOccurrences: 1,
      choiceCounts: { [decisionLog.userChoice]: 1 },
      lastUpdatedIso: new Date().toISOString()
    });
  }
  
  return stats;
}

export function detectPatterns(
  decisionLogs: DecisionLog[],
  existingPatterns: Pattern[]
): Pattern[] {
  const patterns = [...existingPatterns];
  const patternMap = new Map(patterns.map(p => [p.situationKey, p]));
  
  for (const log of decisionLogs) {
    const existing = patternMap.get(log.situationKey);
    
    if (existing) {
      const updated = updatePattern(existing, log.userChoice);
      patternMap.set(log.situationKey, updated);
    } else {
      const patternType = detectPatternType(log.situationKey);
      const newPattern = createPattern(
        generatePatternId(),
        log.situationKey,
        patternType,
        log.userChoice
      );
      patternMap.set(log.situationKey, newPattern);
    }
  }
  
  return Array.from(patternMap.values());
}

export function findPatternsReadyForProposal(patterns: Pattern[]): Pattern[] {
  return patterns.filter(p => isPatternReadyForRule(
    p,
    LEARNING_THRESHOLDS.MIN_OBSERVATIONS_FOR_PATTERN,
    LEARNING_THRESHOLDS.MIN_CONFIDENCE_FOR_PROPOSAL
  ));
}

export function getPatternBySituationKey(
  patterns: Pattern[],
  situationKey: string
): Pattern | undefined {
  return patterns.find(p => p.situationKey === situationKey);
}

export function categorizePatterns(patterns: Pattern[]): Record<RuleType, Pattern[]> {
  const categorized: Record<RuleType, Pattern[]> = {
    priority: [],
    schedule: [],
    reshuffle: [],
    mustLock: []
  };
  
  for (const pattern of patterns) {
    categorized[pattern.patternType].push(pattern);
  }
  
  return categorized;
}
