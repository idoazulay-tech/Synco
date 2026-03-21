import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Clock, XCircle, CheckCircle } from 'lucide-react';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTaskStore } from '@/store/taskStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DateRange = '7days' | '30days' | '90days';

const StatisticsPage = () => {
  const navigate = useNavigate();
  const { archivedTasks, tasks } = useTaskStore();
  const [dateRange, setDateRange] = useState<DateRange>('7days');

  const rangeConfig = {
    '7days': { label: '7 ימים', days: 7 },
    '30days': { label: '30 יום', days: 30 },
    '90days': { label: '90 יום', days: 90 },
  };

  const stats = useMemo(() => {
    const now = new Date();
    const rangeStart = subDays(now, rangeConfig[dateRange].days);
    const rangeEnd = now;

    const filteredArchived = archivedTasks.filter(task => 
      task.completedAt && isWithinInterval(new Date(task.completedAt), { 
        start: startOfDay(rangeStart), 
        end: endOfDay(rangeEnd) 
      })
    );

    const completed = filteredArchived.filter(t => t.status === 'completed').length;
    const notCompleted = filteredArchived.filter(t => t.status === 'not_completed').length;
    const total = completed + notCompleted;

    // Completion rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Most productive hours (when tasks are completed)
    const hourCounts: Record<number, number> = {};
    filteredArchived.forEach(task => {
      if (task.completedAt && task.status === 'completed') {
        const hour = new Date(task.completedAt).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });
    
    const productiveHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Postponement count from history
    let postponements = 0;
    [...archivedTasks, ...tasks].forEach(task => {
      task.history.forEach(entry => {
        if (entry.eventType === 'postponed' && 
            isWithinInterval(new Date(entry.timestamp), { start: rangeStart, end: rangeEnd })) {
          postponements++;
        }
      });
    });

    // Tag completion rates
    const tagStats: Record<string, { completed: number; total: number }> = {};
    filteredArchived.forEach(task => {
      task.tags.forEach(tag => {
        if (!tagStats[tag.name]) {
          tagStats[tag.name] = { completed: 0, total: 0 };
        }
        tagStats[tag.name].total++;
        if (task.status === 'completed') {
          tagStats[tag.name].completed++;
        }
      });
    });

    const tagCompletionRates = Object.entries(tagStats)
      .map(([name, { completed, total }]) => ({
        name,
        rate: Math.round((completed / total) * 100),
        total,
      }))
      .sort((a, b) => a.rate - b.rate);

    return {
      completed,
      notCompleted,
      total,
      completionRate,
      productiveHours,
      postponements,
      tagCompletionRates,
    };
  }, [archivedTasks, tasks, dateRange]);

  return (
    <AppLayout>
      <div className="min-h-screen pb-20">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
            
            <h1 className="text-lg font-bold">סטטיסטיקות</h1>
            
            <div className="w-10" />
          </div>

          {/* Date range selector */}
          <div className="flex gap-2 px-4 pb-4">
            {(Object.keys(rangeConfig) as DateRange[]).map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange(range)}
              >
                {rangeConfig[range].label}
              </Button>
            ))}
          </div>
        </header>

        {/* Stats */}
        <div className="p-4 space-y-4">
          {/* Completion rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-card border border-border card-shadow"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">אחוז השלמה</p>
                <p className="text-3xl font-bold text-primary">{stats.completionRate}%</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.completionRate}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="h-full bg-primary rounded-full"
              />
            </div>
            
            <div className="flex justify-between mt-3 text-sm">
              <span className="flex items-center gap-1 text-success">
                <CheckCircle className="w-4 h-4" />
                {stats.completed} הושלמו
              </span>
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="w-4 h-4" />
                {stats.notCompleted} לא הושלמו
              </span>
            </div>
          </motion.div>

          {/* Productive hours */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-card border border-border card-shadow"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">השעות הפרודוקטיביות ביותר</p>
              </div>
            </div>
            
            {stats.productiveHours.length > 0 ? (
              <div className="flex gap-3">
                {stats.productiveHours.map((hour, i) => (
                  <div 
                    key={hour}
                    className={cn(
                      'flex-1 p-3 rounded-xl text-center',
                      i === 0 ? 'bg-success/10 border-2 border-success/20' : 'bg-secondary'
                    )}
                  >
                    <p className={cn(
                      'text-xl font-bold',
                      i === 0 ? 'text-success' : 'text-foreground'
                    )}>
                      {hour.toString().padStart(2, '0')}:00
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {i === 0 ? 'הכי טוב' : `#${i + 1}`}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                אין מספיק נתונים
              </p>
            )}
          </motion.div>

          {/* Postponements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-6 rounded-2xl bg-card border border-border card-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">דחיות</p>
                <p className="text-3xl font-bold text-warning">{stats.postponements}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <span className="text-2xl">⏰</span>
              </div>
            </div>
          </motion.div>

          {/* Tag completion rates */}
          {stats.tagCompletionRates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-card border border-border card-shadow"
            >
              <p className="text-sm text-muted-foreground mb-4">אחוז השלמה לפי קטגוריה</p>
              <div className="space-y-3">
                {stats.tagCompletionRates.map((tag) => (
                  <div key={tag.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{tag.name}</span>
                      <span className={cn(
                        'font-medium',
                        tag.rate < 50 ? 'text-destructive' : 'text-success'
                      )}>
                        {tag.rate}%
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          'h-full rounded-full transition-all',
                          tag.rate < 50 ? 'bg-destructive' : 'bg-success'
                        )}
                        style={{ width: `${tag.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default StatisticsPage;
