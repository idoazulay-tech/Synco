import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Inbox, Plus, GripVertical } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTaskStore } from '@/store/taskStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const StandbyPage = () => {
  const navigate = useNavigate();
  const { standbyTasks } = useTaskStore();

  return (
    <AppLayout>
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="p-4">
            <h1 className="text-2xl font-bold">משימות בהמתנה</h1>
            <p className="text-sm text-muted-foreground mt-1">
              משימות שטרם שובצו ללוח הזמנים
            </p>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 pb-20">
          {standbyTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Inbox className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-medium text-foreground mb-1">אין משימות בהמתנה</h2>
              <p className="text-muted-foreground text-center mb-6">
                משימות שלא שובצו לזמן יופיעו כאן
              </p>
              <Button onClick={() => navigate('/add')} className="gap-2">
                <Plus className="w-4 h-4" />
                הוסף משימה חדשה
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {standbyTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border card-shadow"
                >
                  <button className="mt-1 cursor-grab">
                    <GripVertical className="w-5 h-5 text-muted-foreground" />
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{task.title}</h3>
                    {task.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{task.notes}</p>
                    )}
                    
                    {task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {task.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: `${tag.color}15`,
                              color: tag.color 
                            }}
                          >
                            {tag.icon && <span className="text-xs">{tag.icon}</span>}
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate('/day')}
                  >
                    שבץ
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default StandbyPage;
