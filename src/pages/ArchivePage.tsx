import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Archive, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTaskStore } from '@/store/taskStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ArchivePage = () => {
  const navigate = useNavigate();
  const { archivedTasks, clearArchive } = useTaskStore();
  const [filter, setFilter] = useState<'all' | 'completed' | 'not_completed'>('all');

  const filteredTasks = archivedTasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const completedCount = archivedTasks.filter(t => t.status === 'completed').length;
  const notCompletedCount = archivedTasks.filter(t => t.status === 'not_completed').length;

  return (
    <AppLayout>
      <div className="min-h-screen pb-20">
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
              data-testid="button-back"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
            
            <h1 className="text-lg font-bold">ארכיון</h1>
            
            <div className="w-10" />
          </div>

          <div className="flex gap-2 px-4 pb-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="gap-1.5"
              data-testid="filter-all"
            >
              <Archive className="w-3 h-3" />
              הכל
              <span className="opacity-70">({archivedTasks.length})</span>
            </Button>
            <Button
              variant={filter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('completed')}
              className="gap-1.5"
              data-testid="filter-completed"
            >
              <CheckCircle className="w-3 h-3" />
              הושלמו
              <span className="opacity-70">({completedCount})</span>
            </Button>
            <Button
              variant={filter === 'not_completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('not_completed')}
              className="gap-1.5"
              data-testid="filter-not-completed"
            >
              <XCircle className="w-3 h-3" />
              לא הושלמו
              <span className="opacity-70">({notCompletedCount})</span>
            </Button>
          </div>
        </header>

        <div className="p-4 space-y-3">
          {filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Archive className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-medium mb-1">הארכיון ריק</h2>
              <p className="text-muted-foreground text-center">
                משימות שהושלמו יופיעו כאן
              </p>
            </motion.div>
          ) : (
            <>
              {filteredTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4 rounded-xl bg-card border border-border"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      task.status === 'completed' ? 'bg-success/10' : 'bg-destructive/10'
                    )}>
                      {task.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.completedAt && format(new Date(task.completedAt), 'd בMMMM yyyy, HH:mm', { locale: he })}
                      </p>
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {task.tags.map(tag => (
                            <Badge 
                              key={tag.id} 
                              variant="secondary"
                              className="text-xs"
                              style={{ backgroundColor: `${tag.color}15`, color: tag.color }}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {archivedTasks.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full mt-6 text-destructive hover:text-destructive"
                  onClick={clearArchive}
                  data-testid="button-clear-archive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  נקה ארכיון
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ArchivePage;
