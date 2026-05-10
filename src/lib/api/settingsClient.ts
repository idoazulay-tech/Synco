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

export async function getUserSettings(userId = 'default-user'): Promise<PlanningSettingsResponse> {
  const res = await fetch(`/api/settings?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    return {
      ok: true,
      settings: { userId, ...PLANNING_CONFIG_DEFAULTS },
    };
  }
  const data = await res.json();
  if (data.ok && data.settings) return data;
  return { ok: true, settings: { userId, ...PLANNING_CONFIG_DEFAULTS } };
}

export async function updateUserSettings(
  settings: Partial<PlanningConfig> & { userId?: string }
): Promise<PlanningSettingsResponse> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'default-user', ...settings }),
  });
  const data = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export async function resetLearningData(userId = 'default-user'): Promise<{ ok: boolean; deletedCount?: number }> {
  const res = await fetch('/api/settings/reset-learning-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, confirm: 'RESET_LEARNING_DATA' }),
  });
  const data = await res.json().catch(() => ({ ok: false }));
  return data;
}
