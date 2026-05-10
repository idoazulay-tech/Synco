export interface PlanningConfig {
  displayName: string;
  timezone: string;
  dayStart: string;
  dayEnd: string;
  planningBufferMinutes: number;
  transitionBufferMinutes: number;
  planningStyle: 'gentle' | 'balanced' | 'aggressive';
  themePreference: 'system' | 'light' | 'dark';
}

export const PLANNING_CONFIG_DEFAULTS: PlanningConfig = {
  displayName: '',
  timezone: 'Asia/Jerusalem',
  dayStart: '08:00',
  dayEnd: '22:00',
  planningBufferMinutes: 5,
  transitionBufferMinutes: 5,
  planningStyle: 'balanced',
  themePreference: 'system',
};

export interface PlanningSettingsResponse {
  ok: boolean;
  settings: PlanningConfig & { userId: string };
}

/** Apply planningStyle to buffer: gentle +5, balanced 0, aggressive -2 (min 0) */
export function applyPlanningStyleBuffer(
  base: number,
  style: PlanningConfig['planningStyle']
): number {
  if (style === 'gentle') return base + 5;
  if (style === 'aggressive') return Math.max(0, base - 2);
  return base;
}

export function planningStyleSummaryHe(style: PlanningConfig['planningStyle']): string {
  if (style === 'gentle') return 'מצב תכנון עדין פעיל — סינקו ישאיר יותר מרווחים בין המשימות';
  if (style === 'aggressive') return 'מצב תכנון אינטנסיבי פעיל — סינקו ינצל יותר חלונות זמן';
  return 'מצב תכנון מאוזן פעיל';
}
