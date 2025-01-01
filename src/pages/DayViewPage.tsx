import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { format, addDays, subDays, startOfDay, addHours, isSameHour, isWithinInterval, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTaskStore } from '@/store/taskStore';
import { useTaskTimer } from '@/hooks/useTaskTimer';
import { Task } from '@/types/task';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Task item component with timer for active tasks
const TaskItem = ({ 
  task, 
  isActive, 
  position, 
  onClick 
}: { 
  task: Task; 
  isActive: boolean; 
  position: { top: string }; 
  onClick: () => void;
}) => {
  const { percentage, remainingTime, isUrgent, isWarning } = useTaskTimer(isActive ? task : null);

  const getProgressColor = () => {
    if (isUrgent) return 'bg-timer-urgent';
    if (isWarning) return 'bg-timer-warning';
    return 'bg-timer-progress';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className={cn(
        'absolute rounded-xl cursor-pointer overflow-hidden',
        'transition-all duration-200 hover:ring-2 hover:ring-primary/20',
        'left-2 right-4 md:left-4 md:right-8', // Better spacing on sides
        isActive 
          ? 'bg-primary text-primary-foreground shadow-lg' 
          : 'bg-primary/10 text-foreground border border-border/50'
      )}
      style={{
        top: position.top,
        minHeight: '56px',
      }}
    >
      <div className="flex items-start justify-between p-3 gap-3">
        {/* Task info */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm md:text-base font-semibold truncate',
            isActive && 'text-primary-foreground'
          )}>
            {task.title}
          </p>
          {task.location && (
            <p className={cn(
              'text-xs truncate mt-0.5',
              isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}>
              {task.location}
            </p>
          )}
        </div>

        {/* Timer stats for active task */}
        {isActive && (
          <div className="flex-shrink-0 text-right">
            <p className={cn(
              'text-lg md:text-xl font-bold tabular-nums',
              isUrgent ? 'text-destructive' : 'text-primary-foreground'
            )}>
              {Math.round(percentage)}%
            </p>
            <p className="text-xs text-primary-foreground/80 tabular-nums">
              {remainingTime}
            </p>
          </div>
        )}
      </div>

      {/* Progress bar for active task - at bottom of card */}
      {isActive && (
        <div className="w-full h-2 bg-primary-foreground/20 border-t border-foreground/20">
          <motion.div
            className={cn('h-full', getProgressColor())}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      )}
    </motion.div>
  );
};

const DayViewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Get date from navigation state or use today
  const getInitialDate = () => {
    if (location.state?.date) {
      return new Date(location.state.date);
    }
    return new Date();
  };
  
  const [selectedDate, setSelectedDate] = useState(getInitialDate);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const { getTasksForDay, getCurrentTask } = useTaskStore();
  const tasks = getTasksForDay(selectedDate);
  const currentTask = getCurrentTask();

  // Auto-scroll to current hour on mount and when viewing today
  useEffect(() => {
    if (timelineRef.current && isSameDay(selectedDate, new Date())) {
      const currentHour = new Date().getHours();
      const hourHeight = 80; // Height of each hour row
      const scrollPosition = Math.max(0, (currentHour - 1) * hourHeight);
      
      setTimeout(() => {
        timelineRef.current?.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }, 300);
    }
  }, [selectedDate]);

  const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1));

  // Swipe handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isRightSwipe) {
      goToPreviousDay(); // Swipe right = earlier date
    } else if (isLeftSwipe) {
      goToNextDay(); // Swipe left = later date
    }
  };

  const getTasksForHour = (hour: number) => {
    const hourStart = addHours(startOfDay(selectedDate), hour);
    const hourEnd = addHours(hourStart, 1);
    
    return tasks.filter(task => 
      isWithinInterval(hourStart, { start: task.startTime, end: task.endTime }) ||
      isWithinInterval(task.startTime, { start: hourStart, end: hourEnd })
    );
  };

  const getTaskPosition = (task: Task, hour: number) => {
    const hourStart = addHours(startOfDay(selectedDate), hour);
    const taskStartMinutes = task.startTime.getMinutes();
    const top = (taskStartMinutes / 60) * 100;
    
    const taskDurationMinutes = (task.endTime.getTime() - task.startTime.getTime()) / (1000 * 60);
    const height = Math.min((taskDurationMinutes / 60) * 100, 100 - top);

    return { top: `${top}%`, height: `${height}%` };
  };

  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={goToPreviousDay}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            
            <motion.div 
              key={selectedDate.toISOString()}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-xl font-bold">
                {format(selectedDate, 'EEEE', { locale: he })}
              </h1>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, 'd בMMMM yyyy', { locale: he })}
              </p>
            </motion.div>
            
            <button 
              onClick={goToNextDay}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Timeline with swipe support */}
        <div 
          ref={timelineRef}
          className="flex-1 overflow-y-auto pb-20"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="relative">
            {HOURS.map((hour) => {
              const hourTasks = getTasksForHour(hour);
              const now = new Date();
              const isCurrentHour = isSameHour(addHours(startOfDay(selectedDate), hour), now);

              return (
                <div 
                  key={hour}
                  className="flex border-b border-border/50 relative"
                  style={{ height: '80px' }}
                >
                  {/* Time label */}
                  <div className="w-16 flex-shrink-0 px-2 py-1 text-left">
                    <span className={cn(
                      'text-xs font-medium',
                      isCurrentHour ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>

                  {/* Task area */}
                  <div className="flex-1 relative">
                    {/* Current time indicator */}
                    {isCurrentHour && (
                      <div 
                        className="absolute left-0 right-0 h-0.5 bg-primary z-10"
                        style={{ top: `${(now.getMinutes() / 60) * 100}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                      </div>
                    )}

                    {/* Tasks */}
                    {hourTasks.map((task) => {
                      const position = getTaskPosition(task, hour);
                      const isActive = currentTask?.id === task.id;

                      return (
                        <TaskItem
                          key={`${task.id}-${hour}`}
                          task={task}
                          isActive={isActive}
                          position={position}
                          onClick={() => navigate(`/task/${task.id}`)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DayViewPage;
