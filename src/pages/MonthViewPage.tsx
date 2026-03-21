import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday
} from 'date-fns';
import { he } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTaskStore } from '@/store/taskStore';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

const MonthViewPage = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { getTasksForDay } = useTaskStore();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const goToPreviousMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const handleDayClick = (date: Date) => {
    if (isSameMonth(date, currentMonth)) {
      // Navigate directly to day view
      navigate('/day', { state: { date: date.toISOString() } });
    }
  };

  const selectedDayTasks = selectedDate ? getTasksForDay(selectedDate) : [];

  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={goToNextMonth}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            
            <motion.h1 
              key={currentMonth.toISOString()}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-bold"
            >
              {format(currentMonth, 'MMMM yyyy', { locale: he })}
            </motion.h1>
            
            <button 
              onClick={goToPreviousMonth}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 pb-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
        </header>

        {/* Calendar grid */}
        <div className="flex-1 p-2 md:p-4">
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {days.map((day, index) => {
              const dayTasks = getTasksForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);

              return (
                <motion.button
                  key={day.toISOString()}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.01 }}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    'min-h-[80px] md:min-h-[100px] rounded-xl flex flex-col items-start p-1.5 md:p-2',
                    'transition-all duration-200 text-right',
                    !isCurrentMonth && 'opacity-30',
                    isSelected && 'bg-primary text-primary-foreground',
                    !isSelected && isTodayDate && 'ring-2 ring-primary bg-primary/5',
                    !isSelected && isCurrentMonth && 'hover:bg-secondary bg-card border border-border/30'
                  )}
                >
                  <span className={cn(
                    'text-sm font-bold mb-1',
                    isSelected && 'text-primary-foreground',
                    isTodayDate && !isSelected && 'text-primary'
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  {/* Task list in cell */}
                  {dayTasks.length > 0 && (
                    <div className="w-full space-y-0.5 overflow-hidden flex-1">
                      {dayTasks.slice(0, 3).map((task, i) => (
                        <div 
                          key={task.id}
                          className={cn(
                            'text-[9px] md:text-[10px] leading-tight truncate px-1 py-0.5 rounded',
                            isSelected 
                              ? 'bg-primary-foreground/20 text-primary-foreground' 
                              : 'bg-primary/10 text-foreground'
                          )}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <span className={cn(
                          'text-[9px]',
                          isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}>
                          +{dayTasks.length - 3} עוד
                        </span>
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

      </div>
    </AppLayout>
  );
};

export default MonthViewPage;
