export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'not_completed' | 'standby';

export type HistoryEventType = 
  | 'created' 
  | 'started' 
  | 'completed' 
  | 'not_completed' 
  | 'postponed' 
  | 'modified' 
  | 'moved';

export interface Tag {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface HistoryEntry {
  id: string;
  taskId: string;
  eventType: HistoryEventType;
  timestamp: Date;
  details?: string;
  previousValue?: string;
  newValue?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  status: TaskStatus;
  tags: Tag[];
  images?: string[];
  isRecurring?: boolean;
  recurringPattern?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  history: HistoryEntry[];
}

export interface StandbyTask extends Omit<Task, 'startTime' | 'endTime'> {
  notes: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface DaySchedule {
  date: Date;
  tasks: Task[];
}

// Default tags
export const DEFAULT_TAGS: Tag[] = [
  { id: '1', name: 'בית', color: 'hsl(142 71% 45%)', icon: '🏠' },
  { id: '2', name: 'עבודה', color: 'hsl(217 91% 60%)', icon: '💼' },
  { id: '3', name: 'חשבונות', color: 'hsl(38 92% 50%)', icon: '📄' },
  { id: '4', name: 'כסף', color: 'hsl(142 71% 45%)', icon: '💰' },
  { id: '5', name: 'ספורט', color: 'hsl(0 84% 60%)', icon: '🏃' },
  { id: '6', name: 'בריאות', color: 'hsl(280 70% 55%)', icon: '❤️' },
];
