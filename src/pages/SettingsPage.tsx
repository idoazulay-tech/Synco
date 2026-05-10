import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Info, BarChart3, Archive, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTaskStore } from '@/store/taskStore';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { useSettingsStore } from '@/store/settingsStore';
import { resetLearningData } from '@/lib/api/settingsClient';
import type { PlanningConfig } from '@/lib/api/settingsClient';
import { PLANNING_CONFIG_DEFAULTS } from '@/lib/api/settingsClient';

const settingsItems = [
  { icon: BarChart3, title: 'סטטיסטיקות', description: 'צפה בניתוח התנהגות והרגלים', path: '/statistics' },
  { icon: Archive,   title: 'ארכיון',      description: 'צפה במשימות שהושלמו',          path: '/archive'    },
  { icon: Info,      title: 'אודות',       description: 'גרסה ומידע על האפליקציה',      path: '/about'      },
];

const PLANNING_STYLES: { value: PlanningConfig['planningStyle']; label: string; desc: string }[] = [
  { value: 'gentle',     label: 'עדין',       desc: 'יותר מרווחים, פחות לחץ'            },
  { value: 'balanced',   label: 'מאוזן',      desc: 'איזון בין הספק לרוגע'              },
  { value: 'aggressive', label: 'אינטנסיבי',  desc: 'מנצל יותר חלונות זמן'              },
];

const THEME_OPTIONS: { value: PlanningConfig['themePreference']; label: string }[] = [
  { value: 'system', label: 'לפי מערכת' },
  { value: 'light',  label: 'בהיר'       },
  { value: 'dark',   label: 'כהה'        },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { archivedTasks } = useTaskStore();
  const { settings, isLoaded, isSaving, loadSettings, saveSettings } = useSettingsStore();

  const [form, setForm] = useState<PlanningConfig>({ ...PLANNING_CONFIG_DEFAULTS });
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Sync form from store once loaded
  useEffect(() => {
    if (isLoaded) setForm({ ...settings });
  }, [isLoaded, settings]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd   = endOfDay(now);
    const weekStart  = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd    = endOfWeek(now,   { weekStartsOn: 0 });
    const monthStart = startOfMonth(now);
    const monthEnd   = endOfMonth(now);

    return {
      todayCompleted: archivedTasks.filter(t =>
        t.completedAt && isWithinInterval(new Date(t.completedAt), { start: todayStart, end: todayEnd })
      ).length,
      weekCompleted: archivedTasks.filter(t =>
        t.completedAt && isWithinInterval(new Date(t.completedAt), { start: weekStart, end: weekEnd })
      ).length,
      monthCompleted: archivedTasks.filter(t =>
        t.completedAt && isWithinInterval(new Date(t.completedAt), { start: monthStart, end: monthEnd })
      ).length,
    };
  }, [archivedTasks]);

  function patch(key: keyof PlanningConfig, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaveMsg(null);
  }

  async function handleSave() {
    setSaveMsg(null);
    try {
      await saveSettings(form);
      setSaveMsg({ ok: true, text: 'נשמר בהצלחה ✓' });
    } catch {
      setSaveMsg({ ok: false, text: 'לא הצלחתי לשמור כרגע' });
    }
  }

  function handleRestoreDefaults() {
    setForm({ ...PLANNING_CONFIG_DEFAULTS });
    setSaveMsg(null);
  }

  async function handleResetLearning() {
    if (!resetConfirm) { setResetConfirm(true); return; }
    try {
      const res = await resetLearningData('default-user');
      setResetMsg(`נמחקו ${res.deletedCount ?? 0} אירועי למידה`);
    } catch {
      setResetMsg('שגיאה בניקוי נתוני למידה');
    }
    setResetConfirm(false);
  }

  return (
    <AppLayout>
      <div className="min-h-screen pb-24">
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="p-4">
            <h1 className="text-2xl font-bold">הגדרות</h1>
          </div>
        </header>

        <div className="p-4 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-success/10 border border-success/20 text-center">
              <p className="text-2xl font-bold text-success">{stats.todayCompleted}</p>
              <p className="text-xs text-muted-foreground">היום</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
              <p className="text-2xl font-bold text-primary">{stats.weekCompleted}</p>
              <p className="text-xs text-muted-foreground">השבוע</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="p-3 rounded-xl bg-accent/50 border border-border text-center">
              <p className="text-2xl font-bold">{stats.monthCompleted}</p>
              <p className="text-xs text-muted-foreground">החודש</p>
            </motion.div>
          </div>

          {/* Notification Settings */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <NotificationSettings />
          </motion.div>

          {/* ── Planning Settings ─────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
              <h2 className="text-lg font-semibold">הגדרות תכנון</h2>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">שם</label>
                <input
                  data-testid="input-displayName"
                  type="text"
                  value={form.displayName}
                  onChange={e => patch('displayName', e.target.value)}
                  placeholder="איך לקרוא לך?"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-right"
                />
              </div>

              {/* Timezone */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">אזור זמן</label>
                <input
                  data-testid="input-timezone"
                  type="text"
                  value={form.timezone}
                  onChange={e => patch('timezone', e.target.value)}
                  placeholder="Asia/Jerusalem"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-left"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">לדוגמה: Asia/Jerusalem, Europe/London, America/New_York</p>
              </div>

              {/* Day window */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">תחילת יום</label>
                  <input
                    data-testid="input-dayStart"
                    type="time"
                    value={form.dayStart}
                    onChange={e => patch('dayStart', e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">סוף יום</label>
                  <input
                    data-testid="input-dayEnd"
                    type="time"
                    value={form.dayEnd}
                    onChange={e => patch('dayEnd', e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Buffers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">מרווח תכנון (דקות)</label>
                  <input
                    data-testid="input-planningBuffer"
                    type="number"
                    min={0}
                    max={60}
                    value={form.planningBufferMinutes}
                    onChange={e => patch('planningBufferMinutes', Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-center"
                  />
                  <p className="text-xs text-muted-foreground">זמן לפני המשימה הראשונה</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">מרווח מעבר (דקות)</label>
                  <input
                    data-testid="input-transitionBuffer"
                    type="number"
                    min={0}
                    max={60}
                    value={form.transitionBufferMinutes}
                    onChange={e => patch('transitionBufferMinutes', Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-center"
                  />
                  <p className="text-xs text-muted-foreground">זמן מעבר בין משימות</p>
                </div>
              </div>

              {/* Planning style */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">סגנון תכנון</label>
                <div className="grid grid-cols-3 gap-2">
                  {PLANNING_STYLES.map(s => (
                    <button
                      key={s.value}
                      data-testid={`btn-planningStyle-${s.value}`}
                      onClick={() => patch('planningStyle', s.value)}
                      className={`p-3 rounded-xl border text-center transition-colors ${
                        form.planningStyle === s.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-foreground hover:bg-secondary/50'
                      }`}
                    >
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme preference */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">העדפת תצוגה</label>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_OPTIONS.map(t => (
                    <button
                      key={t.value}
                      data-testid={`btn-theme-${t.value}`}
                      onClick={() => patch('themePreference', t.value)}
                      className={`p-2.5 rounded-xl border text-sm font-medium transition-colors ${
                        form.themePreference === t.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background hover:bg-secondary/50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">הגדרת תצוגה כהה תיושם בגרסה הבאה</p>
              </div>

              {/* Save message */}
              {saveMsg && (
                <p className={`text-sm text-center font-medium ${saveMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {saveMsg.text}
                </p>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  data-testid="btn-save-settings"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-white py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'שומר...' : 'שמור הגדרות'}
                </button>
                <button
                  data-testid="btn-restore-defaults"
                  onClick={handleRestoreDefaults}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  שחזר
                </button>
              </div>
            </div>
          </motion.div>

          {/* Menu items */}
          <div className="space-y-2">
            {settingsItems.map((item, index) => (
              <motion.button
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 + 0.3 }}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-secondary/50 transition-colors text-right"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            ))}
          </div>

          {/* ── Dev Tools ─────────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">כלי מפתח</p>
              {resetMsg && (
                <p className="text-sm text-muted-foreground">{resetMsg}</p>
              )}
              {!resetConfirm ? (
                <button
                  data-testid="btn-reset-learning"
                  onClick={handleResetLearning}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  ניקוי נתוני למידה לבדיקה
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-destructive font-medium">בטוח? פעולה זו מוחקת את כל נתוני הלמידה.</p>
                  <div className="flex gap-2">
                    <button
                      data-testid="btn-confirm-reset"
                      onClick={handleResetLearning}
                      className="px-4 py-1.5 rounded-lg bg-destructive text-white text-sm font-medium"
                    >
                      כן, מחק
                    </button>
                    <button
                      data-testid="btn-cancel-reset"
                      onClick={() => setResetConfirm(false)}
                      className="px-4 py-1.5 rounded-lg border border-border text-sm"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
