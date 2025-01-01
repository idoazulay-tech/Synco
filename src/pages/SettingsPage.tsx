import { motion } from 'framer-motion';
import { ChevronLeft, Bell, Palette, Info, BarChart3, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTaskStore } from '@/store/taskStore';
import { cn } from '@/lib/utils';

const settingsItems = [
  {
    icon: Bell,
    title: 'התראות',
    description: 'נהל הגדרות התראות ותזכורות',
    path: '/settings/notifications',
  },
  {
    icon: Palette,
    title: 'מראה',
    description: 'התאמה אישית של צבעים ועיצוב',
    path: '/settings/appearance',
  },
  {
    icon: BarChart3,
    title: 'סטטיסטיקות',
    description: 'צפה בניתוח התנהגות והרגלים',
    path: '/statistics',
  },
  {
    icon: Archive,
    title: 'ארכיון',
    description: 'צפה במשימות שהושלמו',
    path: '/archive',
  },
  {
    icon: Info,
    title: 'אודות',
    description: 'גרסה ומידע על האפליקציה',
    path: '/about',
  },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { archivedTasks, tasks } = useTaskStore();

  return (
    <AppLayout>
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="p-4">
            <h1 className="text-2xl font-bold">הגדרות</h1>
          </div>
        </header>

        {/* Stats summary */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-primary/10 border border-primary/20"
            >
              <p className="text-3xl font-bold text-primary">{tasks.length}</p>
              <p className="text-sm text-muted-foreground">משימות פעילות</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="p-4 rounded-xl bg-success/10 border border-success/20"
            >
              <p className="text-3xl font-bold text-success">{archivedTasks.length}</p>
              <p className="text-sm text-muted-foreground">משימות שהושלמו</p>
            </motion.div>
          </div>

          {/* Menu items */}
          <div className="space-y-2">
            {settingsItems.map((item, index) => (
              <motion.button
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
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
        </div>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
