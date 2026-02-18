import type { PolicyDecision, BrainAction, BrainContext } from "../types/index.js";
import { storeLearningState, loadLearningState } from "./memory.js";

export interface UserLearningState {
  isNewUser: boolean;
  totalEvents: number;
  approvedActions: number;
  rejectedActions: number;
  trustLevel: 'learning' | 'cautious' | 'trusted';
}

const userStates = new Map<string, UserLearningState>();

export async function getUserLearningState(userId: string): Promise<UserLearningState> {
  if (userStates.has(userId)) {
    return userStates.get(userId)!;
  }

  const persisted = await loadLearningState(userId);
  if (persisted) {
    const state: UserLearningState = {
      isNewUser: persisted.isNewUser as boolean ?? true,
      totalEvents: persisted.totalEvents as number ?? 0,
      approvedActions: persisted.approvedActions as number ?? 0,
      rejectedActions: persisted.rejectedActions as number ?? 0,
      trustLevel: (persisted.trustLevel as UserLearningState['trustLevel']) ?? 'learning',
    };
    userStates.set(userId, state);
    return state;
  }

  const defaultState: UserLearningState = {
    isNewUser: true,
    totalEvents: 0,
    approvedActions: 0,
    rejectedActions: 0,
    trustLevel: 'learning',
  };
  userStates.set(userId, defaultState);
  return defaultState;
}

export async function updateLearningState(
  userId: string,
  action: 'event' | 'approved' | 'rejected'
): Promise<void> {
  const state = await getUserLearningState(userId);

  switch (action) {
    case 'event':
      state.totalEvents++;
      if (state.totalEvents > 10) state.isNewUser = false;
      break;
    case 'approved':
      state.approvedActions++;
      break;
    case 'rejected':
      state.rejectedActions++;
      break;
  }

  const total = state.approvedActions + state.rejectedActions;
  if (total >= 20 && state.approvedActions / total > 0.8) {
    state.trustLevel = 'trusted';
  } else if (total >= 5 && state.approvedActions / total > 0.6) {
    state.trustLevel = 'cautious';
  } else {
    state.trustLevel = 'learning';
  }

  await storeLearningState(userId, state as unknown as Record<string, unknown>);
}

const SENSITIVE_ACTIONS: BrainAction['type'][] = [
  'create_task',
  'update_task',
  'suggest_schedule',
];

const SAFE_ACTIONS: BrainAction['type'][] = [
  'store_preference',
  'generate_insight',
  'ask_clarification',
];

export async function evaluatePolicy(
  actions: BrainAction[],
  context: BrainContext,
  confidence: number
): Promise<PolicyDecision> {
  const state = await getUserLearningState(context.userId);

  const hasSensitiveActions = actions.some(a => SENSITIVE_ACTIONS.includes(a.type));
  const hasHighPriority = actions.some(a => a.priority === 'high');
  const allSafe = actions.every(a => SAFE_ACTIONS.includes(a.type));

  if (allSafe) {
    return {
      action: 'execute',
      reason: 'כל הפעולות בטוחות ולא דורשות אישור',
      confidence,
      requiresApproval: false,
    };
  }

  if (state.trustLevel === 'learning') {
    if (hasSensitiveActions) {
      return {
        action: 'ask_user',
        reason: 'אני עדיין לומד אותך - רוצה לוודא שזה מה שהתכוונת',
        confidence,
        requiresApproval: true,
      };
    }
    return {
      action: 'learn_silently',
      reason: 'שומר את המידע ללמידה בשלב הזה',
      confidence,
      requiresApproval: false,
    };
  }

  if (state.trustLevel === 'cautious') {
    if (hasSensitiveActions && confidence < 0.7) {
      return {
        action: 'ask_user',
        reason: 'לא בטוח מספיק - מעדיף לשאול',
        confidence,
        requiresApproval: true,
      };
    }
    if (hasHighPriority && hasSensitiveActions) {
      return {
        action: 'ask_user',
        reason: 'פעולה עם השפעה גבוהה - צריך אישור',
        confidence,
        requiresApproval: true,
      };
    }
    return {
      action: 'execute',
      reason: 'מספיק בטחון לביצוע',
      confidence,
      requiresApproval: false,
    };
  }

  if (confidence < 0.5) {
    return {
      action: 'ask_user',
      reason: 'ביטחון נמוך - מעדיף לוודא',
      confidence,
      requiresApproval: true,
    };
  }

  return {
    action: 'execute',
    reason: 'ביטחון גבוה ורמת אמון מספקת',
    confidence,
    requiresApproval: false,
  };
}
