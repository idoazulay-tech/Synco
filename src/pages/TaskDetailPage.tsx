import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Clock, Tag, FileText, CalendarDays, Check } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useTaskStore } from '@/store/taskStore';
import { useTaskTimer } from '@/hooks/useTaskTimer';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const TaskDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showReschedule, setShowReschedule] = useState(false);
  const { getTaskById, completeTask, updateTask, getCurrentTask } = useTaskStore();
  const task = id ? getTaskById(id) : undefined;
  const currentTask = getCurrentTask();
  const isActiveTask = task && currentTask && task.id === currentTask.id;
  
  const { percentage, remainingTime, isUrgent, isWarning } = useTaskTimer(isActiveTask ? task : null);

  if (!task) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">משימה לא נמצאה</p>
        </div>
      </AppLayout>
    );
  }

  const handleComplete = () => {
    completeTask(task.id, true);
    navigate('/');
  };

  const handleReschedule = (daysToAdd: number) => {
    const newStartTime = addDays(task.startTime, daysToAdd);
    const newEndTime = addDays(task.endTime, daysToAdd);
    updateTask(task.id, { 
      startTime: newStartTime, 
      endTime: newEndTime,
      status: 'pending'
    });
    setShowReschedule(false);
    navigate('/');
  };

  return (
    <AppLayout>
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
            
            <h1 className="text-lg font-bold">פרטי משימה</h1>
            
            <div className="w-10" />
          </div>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Progress bar for active task */}
          {isActiveTask && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-secondary/50 border border-border"
            >
              <div className="flex items-center justify-between mb-3">
                <span className={cn(
                  'text-2xl font-bold tabular-nums',
                  isUrgent ? 'text-destructive' : 'text-foreground'
                )}>
                  {Math.round(percentage)}%
                </span>
                <span className="text-lg text-muted-foreground tabular-nums">
                  {remainingTime}
                </span>
              </div>
              <div className="w-full h-3 bg-timer-track rounded-full overflow-hidden border border-foreground/20">
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    isUrgent ? 'bg-timer-urgent' : isWarning ? 'bg-timer-warning' : 'bg-timer-progress'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )}

          {/* Title & Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-4 h-4 rounded-full mt-1.5 flex-shrink-0',
                task.status === 'in_progress' && 'bg-primary animate-pulse',
                task.status === 'pending' && 'bg-muted-foreground',
                task.status === 'completed' && 'bg-success'
              )} />
              <h2 className="text-2xl font-bold leading-tight">{task.title}</h2>
            </div>
          </motion.div>

          {/* Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50"
          >
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">
                {format(task.startTime, 'HH:mm')} - {format(task.endTime, 'HH:mm')}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(task.startTime, 'EEEE, d בMMMM yyyy', { locale: he })}
              </p>
            </div>
          </motion.div>

          {/* Location */}
          {task.location && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50"
            >
              <MapPin className="w-5 h-5 text-primary" />
              <p className="font-medium">{task.location}</p>
            </motion.div>
          )}

          {/* Description */}
          {task.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">תיאור</span>
              </div>
              <p className="text-foreground leading-relaxed">{task.description}</p>
            </motion.div>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Tag className="w-4 h-4" />
                <span className="text-sm font-medium">תגיות</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ 
                      backgroundColor: `${tag.color}15`,
                      color: tag.color 
                    }}
                  >
                    {tag.icon && <span>{tag.icon}</span>}
                    {tag.name}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* History */}
          {task.history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-medium text-muted-foreground">היסטוריה</h3>
              <div className="space-y-2">
                {task.history.slice(-5).reverse().map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary/50" />
                    <span className="text-muted-foreground">
                      {format(new Date(entry.timestamp), 'dd/MM HH:mm')}
                    </span>
                    <span>
                      {entry.eventType === 'created' && 'נוצרה'}
                      {entry.eventType === 'modified' && 'עודכנה'}
                      {entry.eventType === 'started' && 'התחילה'}
                      {entry.eventType === 'completed' && 'הושלמה'}
                      {entry.eventType === 'postponed' && 'נדחתה'}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Actions */}
        <div className="fixed bottom-20 inset-x-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
          <div className="flex gap-3 max-w-lg mx-auto">
            <Dialog open={showReschedule} onOpenChange={setShowReschedule}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="flex-1 gap-2">
                  <CalendarDays className="w-4 h-4" />
                  הזז לתאריך
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>הזזת משימה</DialogTitle>
                  <DialogDescription>
                    בחר מתי להזיז את "{task.title}"
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => handleReschedule(1)}
                    className="h-16 flex-col gap-1"
                  >
                    <span className="text-lg font-bold">מחר</span>
                    <span className="text-xs text-muted-foreground">
                      {format(addDays(new Date(), 1), 'd/M')}
                    </span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleReschedule(2)}
                    className="h-16 flex-col gap-1"
                  >
                    <span className="text-lg font-bold">מחרתיים</span>
                    <span className="text-xs text-muted-foreground">
                      {format(addDays(new Date(), 2), 'd/M')}
                    </span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleReschedule(7)}
                    className="h-16 flex-col gap-1"
                  >
                    <span className="text-lg font-bold">עוד שבוע</span>
                    <span className="text-xs text-muted-foreground">
                      {format(addDays(new Date(), 7), 'd/M')}
                    </span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/month')}
                    className="h-16 flex-col gap-1"
                  >
                    <span className="text-lg font-bold">בחר תאריך</span>
                    <span className="text-xs text-muted-foreground">מהיומן</span>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button size="lg" onClick={handleComplete} className="flex-1 gap-2 bg-success hover:bg-success/90">
              <Check className="w-4 h-4" />
              סיים משימה
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default TaskDetailPage;
