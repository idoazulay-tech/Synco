// ConfidenceModel - Manages confidence scores with decay

export interface ConfidenceUpdate {
  previousConfidence: number;
  newConfidence: number;
  delta: number;
  reason: string;
}

export function increaseConfidence(
  current: number,
  increment: number = 0.05
): ConfidenceUpdate {
  const newConfidence = Math.min(1, current + increment);
  return {
    previousConfidence: current,
    newConfidence,
    delta: newConfidence - current,
    reason: 'matching_behavior'
  };
}

export function decreaseConfidence(
  current: number,
  decrement: number = 0.1
): ConfidenceUpdate {
  const newConfidence = Math.max(0, current - decrement);
  return {
    previousConfidence: current,
    newConfidence,
    delta: newConfidence - current,
    reason: 'deviation_from_rule'
  };
}

export function applyTemporaryDecay(
  current: number,
  anomalyFactor: number = 0.8
): ConfidenceUpdate {
  const newConfidence = current * anomalyFactor;
  return {
    previousConfidence: current,
    newConfidence,
    delta: newConfidence - current,
    reason: 'anomaly_detected'
  };
}

export function applyTimeDecay(
  current: number,
  daysSinceLastUse: number,
  decayRate: number = 0.01
): ConfidenceUpdate {
  const decay = Math.min(current, daysSinceLastUse * decayRate);
  const newConfidence = Math.max(0, current - decay);
  return {
    previousConfidence: current,
    newConfidence,
    delta: newConfidence - current,
    reason: 'time_decay'
  };
}

export function shouldReactivateRule(
  pausedConfidence: number,
  recentMatchCount: number,
  reactivationThreshold: number = 3
): boolean {
  return recentMatchCount >= reactivationThreshold && pausedConfidence > 0.2;
}

export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}
