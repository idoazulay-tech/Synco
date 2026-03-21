import { motion } from 'framer-motion';
import { ChevronLeft, MapPin, Clock } from 'lucide-react';
import { Task, Tag } from '@/types/task';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onNavigate?: () => void;
  variant?: 'large' | 'compact';
  className?: string;
}

export const TaskCard = ({
  task,
  onClick,
  onNavigate,
  variant = 'large',
  className,
}: TaskCardProps) => {
  const isLarge = variant === 'large';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative bg-card rounded-2xl card-shadow-lg overflow-hidden cursor-pointer',
        'border border-border/50 transition-all duration-200',
        'hover:card-shadow-xl hover:border-primary/20',
        isLarge ? 'p-6' : 'p-4',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Navigation arrow */}
        {onNavigate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate();
            }}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary hover:bg-primary/10 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-primary" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          {/* Task title */}
          <h2 className={cn(
            'font-bold text-foreground leading-tight',
            isLarge ? 'text-2xl mb-3' : 'text-lg mb-2'
          )}>
            {task.title}
          </h2>

          {/* Time */}
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              {format(task.startTime, 'HH:mm', { locale: he })} - {format(task.endTime, 'HH:mm', { locale: he })}
            </span>
          </div>

          {/* Location */}
          {task.location && (
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{task.location}</span>
            </div>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
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
          )}
        </div>
      </div>

      {/* Status indicator */}
      {task.status === 'in_progress' && (
        <div className="absolute top-4 left-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
        </div>
      )}
    </motion.div>
  );
};
