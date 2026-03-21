// Rule Proposer - Creates rule proposals from patterns

import type { Pattern, PendingRuleProposal, PreferenceRule, RulePayload } from '../types/learningTypes';
import { createPreferenceRule } from '../models/PreferenceRule';
import { getQuestionTextForRuleType, validateRulePayload } from '../policies/ruleSchemas';
import { shouldSuppressProposal } from '../policies/decay';

let proposalIdCounter = 0;
let ruleIdCounter = 0;

function generateProposalId(): string {
  return `prop_${Date.now()}_${++proposalIdCounter}`;
}

function generateRuleId(): string {
  return `rule_${Date.now()}_${++ruleIdCounter}`;
}

function buildPayloadFromPattern(pattern: Pattern): RulePayload {
  switch (pattern.patternType) {
    case 'priority':
      // Extract priority order from choice distribution
      const sortedChoices = Object.entries(pattern.choiceDistribution)
        .sort(([, a], [, b]) => b - a)
        .map(([choice]) => choice);
      return { priorityOrder: sortedChoices };
      
    case 'schedule':
      // Default to evening window if detected
      return { preferredTimeWindow: { startHour: 18, endHour: 22 } };
      
    case 'reshuffle':
      return { preferredPlan: pattern.dominantChoice === 'A' ? 'A' : 'B' };
      
    case 'mustLock':
      return { mustLockTaskTypes: [pattern.dominantChoice] };
      
    default:
      return {};
  }
}

export function createProposal(
  pattern: Pattern,
  existingProposals: PendingRuleProposal[]
): PendingRuleProposal | null {
  // Check if we already have a proposal for this situation
  const existing = existingProposals.find(p => p.situationKey === pattern.situationKey);
  if (existing) {
    // Check if suppressed due to declines
    if (shouldSuppressProposal(existing.declinedCount, null)) {
      return null;
    }
    return existing;
  }
  
  const payload = buildPayloadFromPattern(pattern);
  
  // Validate payload before creating proposal
  if (!validateRulePayload(pattern.patternType, payload)) {
    return null;
  }
  
  const contextDescription = pattern.dominantChoice;
  const questionText = getQuestionTextForRuleType(pattern.patternType, contextDescription);
  
  return {
    id: generateProposalId(),
    situationKey: pattern.situationKey,
    suggestedRule: {
      ruleType: pattern.patternType,
      payload
    },
    evidenceCount: pattern.observationCount,
    confidence: pattern.confidence,
    question: {
      questionId: `q_${generateProposalId()}`,
      textHebrew: questionText,
      expectedAnswerType: 'confirm',
      options: ['כן', 'לא']
    },
    declinedCount: 0
  };
}

export function confirmProposal(
  proposal: PendingRuleProposal,
  existingRules: PreferenceRule[]
): PreferenceRule {
  // Check if rule already exists for this situation
  const existing = existingRules.find(r => r.situationKey === proposal.situationKey);
  if (existing) {
    return {
      ...existing,
      status: 'active',
      confidence: Math.max(existing.confidence, proposal.confidence),
      updatedAtIso: new Date().toISOString()
    };
  }
  
  return createPreferenceRule(
    generateRuleId(),
    proposal.suggestedRule.ruleType,
    proposal.situationKey,
    proposal.suggestedRule.payload,
    proposal.confidence
  );
}

export function declineProposal(proposal: PendingRuleProposal): PendingRuleProposal {
  return {
    ...proposal,
    declinedCount: proposal.declinedCount + 1
  };
}

export function findProposalsFromPatterns(
  patterns: Pattern[],
  existingProposals: PendingRuleProposal[],
  existingRules: PreferenceRule[]
): PendingRuleProposal[] {
  const proposals: PendingRuleProposal[] = [];
  
  for (const pattern of patterns) {
    // Skip if rule already exists for this situation
    if (existingRules.some(r => r.situationKey === pattern.situationKey && r.status === 'active')) {
      continue;
    }
    
    const proposal = createProposal(pattern, existingProposals);
    if (proposal) {
      proposals.push(proposal);
    }
  }
  
  return proposals;
}
