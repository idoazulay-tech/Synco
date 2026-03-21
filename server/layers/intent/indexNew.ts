// Layer 2: Intent & Context Engine
// Modular pipeline-based implementation with 10 steps

export * from './types';
export * from './pipeline';
export * from './rules';
export * from './memory';
export { IntentContextEngine, analyze } from './IntentContextEngine';

// READY FOR NEXT LAYER: Decision Engine
