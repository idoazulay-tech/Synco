// Layer 5: Learning Engine - Main exports

export { LearningEngine } from './LearningEngine.js';
export type { LearningResult } from './LearningEngine.js';

export { LearningStore, getLearningStore, resetLearningStore } from './store/LearningStore.js';
export type { ILearningStore, LearningStoreState } from './store/learningStoreTypes.js';

export * from './types/learningTypes.js';

export { collectDecision, shouldCollectDecision } from './collectors/decisionCollector.js';
export { collectOutcome, shouldCollectOutcome } from './collectors/outcomeCollector.js';

export { detectPatterns, findPatternsReadyForProposal } from './engines/patternDetector.js';
export { createProposal, confirmProposal, declineProposal } from './engines/ruleProposer.js';
export { updateConfidenceFromDecision, checkReactivation } from './engines/confidenceUpdater.js';
export { detectAnomaly, shouldOverrideAutoApply } from './engines/anomalyDetector.js';

export { LEARNING_THRESHOLDS, shouldAutoApply, shouldAskConfirmation } from './policies/thresholds.js';
export { calculateEventDecay, calculateTimeDecay, calculateAnomalyDecay } from './policies/decay.js';

// READY FOR NEXT LAYER: Automation Layer
