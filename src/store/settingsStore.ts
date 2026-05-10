import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PlanningConfig,
  PLANNING_CONFIG_DEFAULTS,
  getUserSettings,
  updateUserSettings,
} from '@/lib/api/settingsClient';

interface SettingsState {
  settings: PlanningConfig;
  isLoaded: boolean;
  isSaving: boolean;
  loadError: string | null;
  loadSettings: () => Promise<void>;
  saveSettings: (patch: Partial<PlanningConfig>) => Promise<void>;
  getEffectiveSettings: () => PlanningConfig;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: { ...PLANNING_CONFIG_DEFAULTS },
      isLoaded: false,
      isSaving: false,
      loadError: null,

      async loadSettings() {
        try {
          const resp = await getUserSettings('default-user');
          if (resp.ok && resp.settings) {
            const { userId: _uid, ...cfg } = resp.settings as any;
            set({ settings: { ...PLANNING_CONFIG_DEFAULTS, ...cfg }, isLoaded: true, loadError: null });
          }
        } catch (e: any) {
          set({ loadError: e.message, isLoaded: true });
        }
      },

      async saveSettings(patch) {
        set({ isSaving: true });
        try {
          const current = get().settings;
          const next = { ...current, ...patch };
          const resp = await updateUserSettings({ userId: 'default-user', ...next });
          if (resp.ok && resp.settings) {
            const { userId: _uid, ...cfg } = resp.settings as any;
            set({ settings: { ...PLANNING_CONFIG_DEFAULTS, ...cfg }, isSaving: false });
          } else {
            set({ isSaving: false });
          }
        } catch {
          set({ isSaving: false });
          throw new Error('לא הצלחתי לשמור כרגע');
        }
      },

      getEffectiveSettings() {
        return get().settings;
      },
    }),
    {
      name: 'synco-planning-settings',
      partialize: (s) => ({ settings: s.settings }),
    }
  )
);
