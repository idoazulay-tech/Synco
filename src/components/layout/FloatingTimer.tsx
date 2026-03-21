import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Eye, Clock, Calendar, CalendarDays, Check } from 'lucide-react';
import { Task } from '@/types/task';
import { cn } from '@/lib/utils';

interface FloatingTimerProps {
  task: Task;
  percentage: number;
  remainingTime: string;
  onComplete: () => void;
  className?: string;
}

export const FloatingTimer = ({
  task,
  percentage,
  remainingTime,
  onComplete,
  className,
}: FloatingTimerProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const isUrgent = percentage <= 10;
  const isWarning = percentage <= 25 && percentage > 10;

  const menuItems = [
    { icon: Eye, label: 'פרטי משימה', action: () => navigate(`/task/${task.id}`) },
    { icon: Clock, label: 'שנה זמנים', action: () => navigate(`/task/${task.id}/edit`) },
    { icon: Calendar, label: 'יומן יום', action: () => navigate('/day') },
    { icon: CalendarDays, label: 'יומן חודש', action: () => navigate('/month') },
    { icon: Check, label: 'סיים משימה', action: onComplete },
  ];

  return (
    <div className={cn('fixed bottom-6 left-6 z-50', className)}>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-20 left-0 bg-card rounded-xl card-shadow-xl border border-border overflow-hidden min-w-[200px]"
          >
            {menuItems.map((item, index) => (
              <button
                key={item.label}
                onClick={() => {
                  item.action();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-secondary transition-colors"
              >
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={cn(
          'relative w-16 h-16 rounded-full flex items-center justify-center',
          'card-shadow-xl transition-all duration-300',
          isUrgent ? 'bg-destructive' : isWarning ? 'bg-warning' : 'bg-primary',
          isMenuOpen && 'ring-4 ring-primary/20'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Progress ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            strokeWidth="4"
            className="stroke-white/20"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            className="stroke-white"
            strokeDasharray={175.93}
            strokeDashoffset={175.93 - (percentage / 100) * 175.93}
          />
        </svg>

        {/* Center text */}
        <span className="text-primary-foreground font-bold text-sm tabular-nums">
          {Math.round(percentage)}%
        </span>
      </motion.button>
    </div>
  );
};
