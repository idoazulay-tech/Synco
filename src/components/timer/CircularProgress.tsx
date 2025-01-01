import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  remainingTime: string;
  isUrgent?: boolean;
  isWarning?: boolean;
  className?: string;
}

export const CircularProgress = ({
  percentage,
  remainingTime,
  isUrgent = false,
  isWarning = false,
  className,
}: CircularProgressProps) => {
  const getProgressColor = () => {
    if (isUrgent) return 'bg-timer-urgent';
    if (isWarning) return 'bg-timer-warning';
    return 'bg-timer-progress';
  };

  return (
    <div className={cn('w-full flex flex-col gap-2', className)}>
      {/* Stats row - prominent display */}
      <div className="flex items-baseline justify-between gap-4">
        <motion.span
          className={cn(
            'text-4xl md:text-5xl font-bold tabular-nums',
            isUrgent ? 'text-destructive' : 'text-foreground'
          )}
          key={percentage}
          initial={{ scale: 1.05, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {Math.round(percentage)}%
        </motion.span>
        <span className={cn(
          'text-2xl md:text-3xl font-semibold tabular-nums',
          isUrgent ? 'text-destructive/80' : 'text-muted-foreground'
        )}>
          {remainingTime}
        </span>
      </div>
      
      {/* Linear progress bar with border */}
      <div className="w-full h-4 bg-timer-track rounded-full overflow-hidden border border-foreground/20">
        <motion.div
          className={cn('h-full rounded-full', getProgressColor())}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};
