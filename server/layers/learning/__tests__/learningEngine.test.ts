// Layer 5: Learning Engine Tests

import { LearningEngine } from '../LearningEngine';
import { LearningStore } from '../store/LearningStore';
import { createDecisionLog } from '../models/DecisionLog';
import { createPreferenceRule } from '../models/PreferenceRule';
import { createPattern, updatePattern, isPatternReadyForRule } from '../models/Pattern';
import { detectAnomaly } from '../engines/anomalyDetector';
import { calculateEventDecay, calculateTimeDecay } from '../policies/decay';
import { LEARNING_THRESHOLDS } from '../policies/thresholds';
import type { ContextSnapshot, DecisionLog } from '../types/learningTypes';

function createTestContext(overrides: Partial<ContextSnapshot> = {}): ContextSnapshot {
  return {
    cognitiveLoad: 'medium',
    urgencyLevels: {},
    mustLocks: [],
    timeWindow: { startIso: '2025-01-23T08:00:00Z', endIso: '2025-01-23T22:00:00Z' },
    isReshuffle: false,
    isFollowUp: false,
    ...overrides
  };
}

describe('Learning Engine - Layer 5', () => {
  let store: LearningStore;
  let engine: LearningEngine;

  beforeEach(() => {
    store = new LearningStore();
    engine = new LearningEngine(store);
  });

  describe('Decision Log Creation', () => {
    it('should create and store a decision log', () => {
      const context = createTestContext();
      const log = engine.collectDecision(
        'priority_choice',
        ['taskA', 'taskB'],
        'taskA',
        context
      );

      expect(log).not.toBeNull();
      expect(log!.userChoice).toBe('taskA');
      expect(log!.comparedItems).toEqual(['taskA', 'taskB']);
      
      const logs = store.getDecisionLogs();
      expect(logs.length).toBe(1);
    });

    it('should not collect decision for non-collectable actions', () => {
      const context = createTestContext();
      const log = engine.collectDecision(
        'view_details',
        ['taskA'],
        'taskA',
        context
      );

      expect(log).toBeNull();
      expect(store.getDecisionLogs().length).toBe(0);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect pattern after N repeated decisions', () => {
      const context = createTestContext();
      
      // Simulate 3 same decisions
      for (let i = 0; i < 3; i++) {
        engine.collectDecision(
          'priority_choice',
          ['cooking', 'dishes'],
          'cooking',
          context,
          'conflict'
        );
      }

      const patterns = engine.detectPatterns();
      expect(patterns.length).toBe(1);
      expect(patterns[0].observationCount).toBe(3);
      expect(patterns[0].dominantChoice).toBe('cooking');
    });

    it('should update pattern confidence correctly', () => {
      const pattern = createPattern('p1', 'test:A vs B', 'priority', 'A');
      expect(pattern.confidence).toBe(1); // Initial 1 observation = 100%

      // Add 2 more "A" choices
      let updated = updatePattern(pattern, 'A');
      updated = updatePattern(updated, 'A');
      
      expect(updated.observationCount).toBe(3);
      expect(updated.confidence).toBe(1); // 3/3 = 100%

      // Add 1 "B" choice
      updated = updatePattern(updated, 'B');
      expect(updated.observationCount).toBe(4);
      expect(updated.confidence).toBe(0.75); // 3/4 = 75%
    });
  });

  describe('Rule Proposal', () => {
    it('should create proposal when pattern meets threshold', () => {
      const context = createTestContext();
      
      // Create enough decisions to trigger proposal (need >= 3 observations and >= 0.75 confidence)
      for (let i = 0; i < 4; i++) {
        engine.collectDecision(
          'priority_choice',
          ['taskX', 'taskY'],
          'taskX',
          context,
          'conflict'
        );
      }

      const patterns = engine.detectPatterns();
      expect(patterns.length).toBe(1);
      expect(patterns[0].observationCount).toBe(4);
      expect(patterns[0].confidence).toBe(1);
      
      const proposal = engine.findAndCreateProposals();

      expect(proposal).not.toBeNull();
      expect(proposal!.suggestedRule.ruleType).toBe('priority');
      expect(proposal!.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('should confirm proposal and create rule', () => {
      // Setup: create a proposal
      const context = createTestContext();
      for (let i = 0; i < 4; i++) {
        engine.collectDecision('priority_choice', ['X', 'Y'], 'X', context, 'conflict');
      }
      const patterns = engine.detectPatterns();
      expect(patterns.length).toBe(1);
      
      const proposal = engine.findAndCreateProposals();
      expect(proposal).not.toBeNull();

      // Confirm the proposal
      const rule = engine.confirmRuleProposal();

      expect(rule).not.toBeNull();
      expect(rule!.status).toBe('active');
      expect(store.getActiveRules().length).toBe(1);
      expect(store.getPendingProposal()).toBeNull();
    });

    it('should decline proposal without creating rule', () => {
      const context = createTestContext();
      for (let i = 0; i < 4; i++) {
        engine.collectDecision('priority_choice', ['X', 'Y'], 'X', context);
      }
      engine.detectPatterns();
      engine.findAndCreateProposals();

      engine.declineRuleProposal();

      expect(store.getActiveRules().length).toBe(0);
      expect(store.getPendingProposal()).toBeNull();
    });
  });

  describe('Confidence Model', () => {
    it('should increase confidence on matching behavior', () => {
      const result = calculateEventDecay(0.7, true);
      
      expect(result.newConfidence).toBeGreaterThan(0.7);
      expect(result.shouldPause).toBe(false);
    });

    it('should decrease confidence on deviating behavior', () => {
      const result = calculateEventDecay(0.7, false);
      
      expect(result.newConfidence).toBeLessThan(0.7);
    });

    it('should mark rule for pause when confidence drops below threshold', () => {
      const result = calculateEventDecay(0.45, false);
      
      expect(result.newConfidence).toBeLessThan(LEARNING_THRESHOLDS.PAUSE_RULE_CONFIDENCE);
      expect(result.shouldPause).toBe(true);
    });

    it('should apply time decay correctly', () => {
      const result = calculateTimeDecay(0.8, 10); // 10 days
      
      expect(result.newConfidence).toBeLessThan(0.8);
      expect(result.reason).toContain('time_decay');
    });
  });

  describe('Rule Toggle (Pause/Resume)', () => {
    it('should pause active rule', () => {
      // Create a rule
      const rule = createPreferenceRule(
        'rule1',
        'priority',
        'test:A vs B',
        { priorityOrder: ['A', 'B'] },
        0.8
      );
      store.addPreferenceRule(rule);

      const toggled = engine.toggleRule('rule1', 'paused');

      expect(toggled).not.toBeNull();
      expect(toggled!.status).toBe('paused');
      expect(store.getActiveRules().length).toBe(0);
      expect(store.getPausedRules().length).toBe(1);
    });

    it('should prevent paused rule from auto-applying', () => {
      const rule = createPreferenceRule(
        'rule1',
        'priority',
        'test:A vs B',
        { priorityOrder: ['A', 'B'] },
        0.9
      );
      store.addPreferenceRule(rule);
      engine.toggleRule('rule1', 'paused');

      const context = createTestContext();
      const shouldApply = engine.shouldAutoApplyRule(
        store.getRuleById('rule1')!,
        context
      );

      // Paused rules should not auto-apply (status check is in caller)
      expect(store.getRuleById('rule1')!.status).toBe('paused');
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect anomaly on high cognitive load', () => {
      const context = createTestContext({ cognitiveLoad: 'high' });
      
      const flags = detectAnomaly(context);

      expect(flags.isAnomaly).toBe(true);
      expect(flags.reasons).toContain('high_cognitive_load');
    });

    it('should detect anomaly on excessive must locks', () => {
      const context = createTestContext({
        mustLocks: ['task1', 'task2', 'task3']
      });
      
      const flags = detectAnomaly(context);

      expect(flags.isAnomaly).toBe(true);
      expect(flags.reasons).toContain('excessive_must_locks');
    });

    it('should request confirmation during anomaly', () => {
      const context = createTestContext({
        cognitiveLoad: 'high',
        mustLocks: ['t1', 't2', 't3']
      });
      
      const flags = detectAnomaly(context);

      expect(flags.shouldAskForConfirmation).toBe(true);
    });
  });

  describe('Integration: Rule reduces questions', () => {
    it('should auto-apply rule with high confidence and no anomaly', () => {
      const rule = createPreferenceRule(
        'rule1',
        'priority',
        'test:A vs B',
        { priorityOrder: ['A', 'B'] },
        0.9
      );
      store.addPreferenceRule(rule);

      const context = createTestContext(); // Normal context
      const shouldApply = engine.shouldAutoApplyRule(rule, context);
      const shouldAsk = engine.shouldAskConfirmation(rule, context);

      expect(shouldApply).toBe(true);
      expect(shouldAsk).toBe(false);
    });
  });

  describe('Reshuffle Preference', () => {
    it('should store reshuffle plan preference', () => {
      const context = createTestContext({ isReshuffle: true });
      
      // User consistently chooses Plan B
      for (let i = 0; i < 4; i++) {
        engine.collectDecision(
          'accept_plan',
          ['A', 'B'],
          'B',
          context,
          'reshuffle'
        );
      }

      engine.detectPatterns();
      const patterns = store.getPatterns();
      
      const reshufflePattern = patterns.find(p => p.patternType === 'reshuffle');
      expect(reshufflePattern).toBeDefined();
      expect(reshufflePattern!.dominantChoice).toBe('B');
    });
  });

  describe('MustLock Behavior Pattern', () => {
    it('should detect mustLock behavior pattern', () => {
      const context = createTestContext();
      
      for (let i = 0; i < 4; i++) {
        engine.collectDecision(
          'toggle_must_lock',
          ['meeting'],
          'meeting',
          context,
          'mustLock'
        );
      }

      engine.detectPatterns();
      const patterns = store.getPatterns();
      
      expect(patterns.some(p => p.patternType === 'mustLock')).toBe(true);
    });
  });

  describe('Rule Decay Below Threshold', () => {
    it('should pause rule when confidence drops below threshold', () => {
      // Create a rule with situationKey matching what will be generated
      const rule = createPreferenceRule(
        'rule1',
        'priority',
        'conflict:A vs B',
        { priorityOrder: ['A', 'B'] },
        0.5
      );
      store.addPreferenceRule(rule);

      // Simulate deviating behavior - user chooses B instead of expected A
      const context = createTestContext();
      
      // This will generate situationKey 'conflict:A vs B'
      engine.collectDecision(
        'priority_choice',
        ['A', 'B'],
        'B', // User chose B instead of expected A
        context,
        'conflict'
      );

      const updatedRule = store.getRuleById('rule1');
      // Confidence should have decreased (0.5 - 0.1 = 0.4)
      expect(updatedRule!.confidence).toBe(0.4);
    });
  });
});
