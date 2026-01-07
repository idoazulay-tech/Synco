import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addHours, startOfDay, differenceInMinutes, addDays, subDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { useTaskStore } from '@/store/taskStore';
import { cn } from '@/lib/utils';

const MINI_HOUR_HEIGHT = 40;

interface CompactScheduleProps {
  isOpen: boolean;
  onClose: () => void;
  currentTaskId?: string;
}

export const CompactSchedule = ({ isOpen, onClose, currentTaskId }: CompactScheduleProps) => {
  const navigate = useNavigate();
  const { getTasksForDay } = useTaskStore();
  const [viewDate, setViewDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const tasks = getTasksForDay(viewDate);
  const currentHour = now.getHours();
  const dayStart = startOfDay(viewDate);
  const isToday = format(viewDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
  
  const visibleHours = Array.from({ length: 8 }, (_, i) => Math.min(23, currentHour - 1 + i));

  const handleDragEnd = useCallback((e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 50) {
      if (info.offset.x > 0) {
        setViewDate(prev => subDays(prev, 1));
      } else {
        setViewDate(prev => addDays(prev, 1));
      }
    }
  }, []);

  const goToNextDay = () => setViewDate(prev => addDays(prev, 1));
  const goToPrevDay = () => setViewDate(prev => subDays(prev, 1));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 z-30"
            onClick={onClose}
            data-testid="schedule-backdrop"
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-28 bg-background border-l border-border z-40 shadow-xl"
          >
            <button
              onClick={onClose}
              className="absolute -left-8 top-1/2 -translate-y-1/2 bg-background border border-border rounded-l-lg p-1.5 shadow-md hover:bg-secondary transition-colors"
              data-testid="button-close-schedule"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="h-full flex flex-col">
              <div className="p-2 border-b border-border flex items-center justify-between">
                <button
                  onClick={goToNextDay}
                  className="p-1 hover:bg-secondary rounded transition-colors"
                  data-testid="button-schedule-next"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-medium text-center">
                  {isToday ? 'היום' : format(viewDate, 'EEE d/M', { locale: he })}
                </span>
                <button
                  onClick={goToPrevDay}
                  className="p-1 hover:bg-secondary rounded transition-colors"
                  data-testid="button-schedule-prev"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <motion.div 
                className="flex-1 overflow-y-auto touch-pan-x"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
              >
                <div className="relative">
                  {visibleHours.map((hour) => {
                    const isCurrentHour = isToday && hour === currentHour;

                    return (
                      <div 
                        key={hour}
                        className={cn(
                          "relative border-b border-border/30",
                          isCurrentHour && "bg-primary/5"
                        )}
                        style={{ height: `${MINI_HOUR_HEIGHT}px` }}
                      >
                        <span className="absolute top-0 left-1 text-[10px] text-muted-foreground">
                          {hour.toString().padStart(2, '0')}
                        </span>
                        
                        {isCurrentHour && (
                          <div 
                            className="absolute left-0 right-0 h-0.5 bg-red-500 z-10"
                            style={{ top: `${(now.getMinutes() / 60) * 100}%` }}
                          />
                        )}
                      </div>
                    );
                  })}

                  <div className="absolute top-0 left-8 right-1">
                    {tasks.filter(task => {
                      const taskHour = task.startTime.getHours();
                      return taskHour >= visibleHours[0] && taskHour <= visibleHours[visibleHours.length - 1];
                    }).map(task => {
                      const startMinutes = differenceInMinutes(task.startTime, addHours(dayStart, visibleHours[0]));
                      const durationMinutes = differenceInMinutes(task.endTime, task.startTime);
                      const top = (startMinutes / 60) * MINI_HOUR_HEIGHT;
                      const height = (durationMinutes / 60) * MINI_HOUR_HEIGHT;
                      const isActive = currentTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          onClick={() => navigate(`/task/${task.id}`)}
                          className={cn(
                            "absolute left-0 right-0 rounded px-1 text-[8px] truncate cursor-pointer",
                            isActive 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-secondary text-secondary-foreground"
                          )}
                          style={{
                            top: `${Math.max(0, top)}px`,
                            height: `${Math.max(16, height)}px`,
                          }}
                          data-testid={`mini-task-${task.id}`}
                        >
                          {task.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              <button
                onClick={() => navigate('/day')}
                className="p-2 border-t border-border text-[10px] text-center text-primary hover:bg-secondary transition-colors"
                data-testid="button-open-full-calendar"
              >
                לוח מלא
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const ScheduleToggle = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="fixed right-0 top-1/2 -translate-y-1/2 bg-secondary/80 hover:bg-secondary p-1 rounded-l-lg shadow-md z-30 transition-colors"
    data-testid="button-open-schedule"
  >
    <ChevronLeft className="w-4 h-4" />
  </button>
);
