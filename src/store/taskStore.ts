import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, StandbyTask, HistoryEntry, Tag, DEFAULT_TAGS } from '@/types/task';
import { addHours, addMinutes, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface TaskState {
  tasks: Task[];
  standbyTasks: StandbyTask[];
  archivedTasks: Task[];
  tags: Tag[];
  
  // Actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'history'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string, completed: boolean) => void;
  moveToStandby: (id: string, notes: string) => void;
  scheduleStandbyTask: (id: string, startTime: Date, endTime: Date) => void;
  
  // Getters
  getCurrentTask: () => Task | null;
  getTasksForDay: (date: Date) => Task[];
  getTaskById: (id: string) => Task | undefined;
  
  // History
  addHistoryEntry: (taskId: string, entry: Omit<HistoryEntry, 'id' | 'taskId' | 'timestamp'>) => void;
}

// Demo data for initial state
const createDemoTasks = (): Task[] => {
  const now = new Date();
  const tasks: Task[] = [
    {
      id: '1',
      title: 'פגישת צוות בוקר',
      description: 'סקירה שבועית עם הצוות',
      location: 'חדר ישיבות A',
      startTime: addMinutes(now, -30),
      endTime: addMinutes(now, 30),
      duration: 60,
      status: 'in_progress',
      tags: [DEFAULT_TAGS[1]],
      createdAt: addHours(now, -24),
      updatedAt: now,
      history: [],
    },
    {
      id: '2',
      title: 'הכנת מצגת',
      description: 'להכין מצגת לישיבת הנהלה',
      startTime: addMinutes(now, 45),
      endTime: addMinutes(now, 105),
      duration: 60,
      status: 'pending',
      tags: [DEFAULT_TAGS[1]],
      createdAt: addHours(now, -48),
      updatedAt: now,
      history: [],
    },
    {
      id: '3',
      title: 'אימון ריצה',
      description: '5 קילומטר בפארק',
      location: 'פארק הירקון',
      startTime: addHours(now, 3),
      endTime: addHours(now, 4),
      duration: 60,
      status: 'pending',
      tags: [DEFAULT_TAGS[4]],
      createdAt: addHours(now, -72),
      updatedAt: now,
      history: [],
    },
    {
      id: '4',
      title: 'תשלום חשבונות',
      description: 'חשמל, מים, ארנונה',
      startTime: addHours(now, 5),
      endTime: addMinutes(addHours(now, 5), 30),
      duration: 30,
      status: 'pending',
      tags: [DEFAULT_TAGS[2], DEFAULT_TAGS[3]],
      createdAt: addHours(now, -24),
      updatedAt: now,
      history: [],
    },
  ];
  return tasks;
};

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: createDemoTasks(),
      standbyTasks: [],
      archivedTasks: [],
      tags: DEFAULT_TAGS,

      addTask: (taskData) => {
        const newTask: Task = {
          ...taskData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          history: [{
            id: crypto.randomUUID(),
            taskId: '',
            eventType: 'created',
            timestamp: new Date(),
          }],
        };
        newTask.history[0].taskId = newTask.id;
        
        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));
        
        return newTask;
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  ...updates,
                  updatedAt: new Date(),
                  history: [
                    ...task.history,
                    {
                      id: crypto.randomUUID(),
                      taskId: id,
                      eventType: 'modified',
                      timestamp: new Date(),
                      details: JSON.stringify(updates),
                    },
                  ],
                }
              : task
          ),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));
      },

      completeTask: (id, completed) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;

        const updatedTask: Task = {
          ...task,
          status: completed ? 'completed' : 'not_completed',
          completedAt: completed ? new Date() : undefined,
          updatedAt: new Date(),
          history: [
            ...task.history,
            {
              id: crypto.randomUUID(),
              taskId: id,
              eventType: completed ? 'completed' : 'not_completed',
              timestamp: new Date(),
            },
          ],
        };

        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          archivedTasks: [...state.archivedTasks, updatedTask],
        }));
      },

      moveToStandby: (id, notes) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;

        const standbyTask: StandbyTask = {
          ...task,
          notes,
          status: 'standby',
        };

        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          standbyTasks: [...state.standbyTasks, standbyTask],
        }));
      },

      scheduleStandbyTask: (id, startTime, endTime) => {
        const standbyTask = get().standbyTasks.find((t) => t.id === id);
        if (!standbyTask) return;

        const scheduledTask: Task = {
          ...standbyTask,
          startTime,
          endTime,
          status: 'pending',
          updatedAt: new Date(),
          history: [
            ...standbyTask.history,
            {
              id: crypto.randomUUID(),
              taskId: id,
              eventType: 'moved',
              timestamp: new Date(),
              details: `Scheduled from standby to ${startTime.toISOString()}`,
            },
          ],
        };

        set((state) => ({
          standbyTasks: state.standbyTasks.filter((t) => t.id !== id),
          tasks: [...state.tasks, scheduledTask],
        }));
      },

      getCurrentTask: () => {
        const now = new Date();
        const tasks = get().tasks;
        
        // Find all tasks that are currently active (now is within their time range)
        const activeTasks = tasks.filter((task) =>
          task.status !== 'completed' &&
          task.status !== 'not_completed' &&
          isWithinInterval(now, { start: task.startTime, end: task.endTime })
        );
        
        // Return the first one by start time (earliest started task gets priority)
        if (activeTasks.length === 0) return null;
        
        return activeTasks.sort((a, b) => 
          a.startTime.getTime() - b.startTime.getTime()
        )[0];
      },

      getTasksForDay: (date: Date) => {
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        return get().tasks.filter((task) =>
          isWithinInterval(task.startTime, { start: dayStart, end: dayEnd })
        ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      },

      getTaskById: (id: string) => {
        return get().tasks.find((task) => task.id === id);
      },

      addHistoryEntry: (taskId, entry) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  history: [
                    ...task.history,
                    {
                      ...entry,
                      id: crypto.randomUUID(),
                      taskId,
                      timestamp: new Date(),
                    },
                  ],
                }
              : task
          ),
        }));
      },
    }),
    {
      name: 'task-storage',
      partialize: (state) => ({
        tasks: state.tasks,
        standbyTasks: state.standbyTasks,
        archivedTasks: state.archivedTasks,
        tags: state.tags,
      }),
    }
  )
);
