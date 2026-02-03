/**
 * Adaptive Shortening Law - קיצור אדפטיבי 30-50%
 * 
 * SHORTEN_DURATIONS:
 * - קיצור בין 30% ל-50% לפי נתוני עבר
 * - FILL_GAPS מתקצרות יותר
 * - linkedOutcome נשמר
 * 
 * DROP_TASK:
 * - משימות לא דחופות / בלי דדליין
 * - משימות חשובות שניתן לדחות
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ShortenedTask,
  TaskForDropping,
  ProposedSchedulePreview,
  ScheduleChange,
  ScheduleSnapshot,
  SystemLawsState,
  UserChoiceType
} from './types';
import { TimeConstraintType } from '../timeConstraints/types';

export interface ShorteningParams {
  minReductionPercent: number;
  maxReductionPercent: number;
  targetMinutesToSave: number;
}

export function calculateShorteningForTask(
  task: SystemLawsState['tasks'][0],
  params: ShorteningParams,
  userHistory?: { averageCompletionRatio?: number; taskTypeAverage?: number }
): ShortenedTask | null {
  if (task.linkedOutcomeId) {
    return null;
  }
  
  if (task.timeConstraintType === TimeConstraintType.HARD_LOCK) {
    return null;
  }
  
  let reductionPercent: number;
  
  if (task.timeConstraintType === TimeConstraintType.FILL_GAPS) {
    reductionPercent = params.maxReductionPercent;
  } else if (task.timeConstraintType === TimeConstraintType.FLEX_WINDOW) {
    reductionPercent = (params.minReductionPercent + params.maxReductionPercent) / 2;
  } else {
    reductionPercent = params.minReductionPercent;
  }
  
  if (userHistory?.averageCompletionRatio) {
    const ratio = userHistory.averageCompletionRatio;
    if (ratio < 0.8) {
      reductionPercent = Math.min(reductionPercent + 10, params.maxReductionPercent);
    }
  }
  
  if (task.historicalDurations && task.historicalDurations.length > 0) {
    const avgActual = task.historicalDurations.reduce((a, b) => a + b, 0) / task.historicalDurations.length;
    if (avgActual < task.durationMinutes * 0.8) {
      reductionPercent = Math.min(reductionPercent + 10, params.maxReductionPercent);
    }
  }
  
  const newDuration = Math.round(task.durationMinutes * (1 - reductionPercent / 100));
  
  if (newDuration < 5) {
    return null;
  }
  
  return {
    taskId: task.id,
    originalDuration: task.durationMinutes,
    newDuration,
    reductionPercent,
    reason: buildShorteningReason(task, reductionPercent)
  };
}

function buildShorteningReason(task: SystemLawsState['tasks'][0], percent: number): string {
  if (task.timeConstraintType === TimeConstraintType.FILL_GAPS) {
    return `משימת מילוי - קיצור ${percent}%`;
  }
  if (task.historicalDurations && task.historicalDurations.length > 0) {
    return `לפי היסטוריה - קיצור ${percent}%`;
  }
  return `קיצור סטנדרטי ${percent}%`;
}

export function calculateAllShortenings(
  tasks: SystemLawsState['tasks'],
  targetMinutesToSave: number,
  userHistory?: SystemLawsState['userHistory']
): { shortenedTasks: ShortenedTask[]; totalSaved: number; targetAchieved: boolean } {
  const params: ShorteningParams = {
    minReductionPercent: 30,
    maxReductionPercent: 50,
    targetMinutesToSave
  };
  
  const shortenedTasks: ShortenedTask[] = [];
  let totalSaved = 0;
  
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.timeConstraintType === TimeConstraintType.FILL_GAPS) return -1;
    if (b.timeConstraintType === TimeConstraintType.FILL_GAPS) return 1;
    if (a.timeConstraintType === TimeConstraintType.FLEX_WINDOW) return -1;
    if (b.timeConstraintType === TimeConstraintType.FLEX_WINDOW) return 1;
    return 0;
  });
  
  for (const task of sortedTasks) {
    if (totalSaved >= targetMinutesToSave) break;
    
    const shortened = calculateShorteningForTask(task, params, {
      averageCompletionRatio: userHistory?.averageTaskCompletionRatio,
      taskTypeAverage: task.taskType ? userHistory?.taskTypeAverages[task.taskType] : undefined
    });
    
    if (shortened) {
      shortenedTasks.push(shortened);
      totalSaved += shortened.originalDuration - shortened.newDuration;
    }
  }
  
  return {
    shortenedTasks,
    totalSaved,
    targetAchieved: totalSaved >= targetMinutesToSave
  };
}

export function getTasksForDropping(
  tasks: SystemLawsState['tasks']
): TaskForDropping[] {
  return tasks
    .filter(task => !task.linkedOutcomeId)
    .filter(task => task.timeConstraintType !== TimeConstraintType.HARD_LOCK)
    .map(task => {
      const shortTitle = task.title.split(' ').slice(0, 3).join(' ');
      const isUrgent = task.timeConstraintType === TimeConstraintType.HUMAN_DEPENDENT;
      const hasDeadline = task.timeConstraintType === TimeConstraintType.HARD_LOCK;
      
      const recommendedForDrop = 
        task.timeConstraintType === TimeConstraintType.FILL_GAPS ||
        (!isUrgent && !hasDeadline);
      
      let reason: string | undefined;
      if (task.timeConstraintType === TimeConstraintType.FILL_GAPS) {
        reason = 'משימת מילוי - ניתנת לדחייה';
      } else if (!isUrgent && !hasDeadline) {
        reason = 'אין דדליין - ניתנת לדחייה';
      }
      
      return {
        id: task.id,
        title: task.title,
        shortTitle,
        durationMinutes: task.durationMinutes,
        isUrgent,
        hasDeadline,
        linkedOutcomeId: task.linkedOutcomeId,
        recommendedForDrop,
        reason
      };
    })
    .sort((a, b) => {
      if (a.recommendedForDrop && !b.recommendedForDrop) return -1;
      if (!a.recommendedForDrop && b.recommendedForDrop) return 1;
      return 0;
    });
}

export function buildProposedSchedulePreview(
  proposalType: UserChoiceType,
  originalTasks: SystemLawsState['tasks'],
  changes: { shortenedTasks?: ShortenedTask[]; droppedTaskIds?: string[] },
  outcomeDeadline: Date
): ProposedSchedulePreview {
  const originalState: ScheduleSnapshot = {
    tasks: originalTasks.map(t => ({
      id: t.id,
      title: t.title,
      startTime: t.startTime,
      endTime: t.endTime,
      durationMinutes: t.durationMinutes
    })),
    outcomeDeadline
  };
  
  const scheduleChanges: ScheduleChange[] = [];
  let proposedTasks = [...originalTasks];
  
  if (changes.shortenedTasks) {
    for (const shortened of changes.shortenedTasks) {
      const taskIndex = proposedTasks.findIndex(t => t.id === shortened.taskId);
      if (taskIndex === -1) continue;
      
      const task = proposedTasks[taskIndex];
      const before = {
        startTime: task.startTime,
        endTime: task.endTime,
        duration: task.durationMinutes
      };
      
      const newEndTime = new Date(task.startTime);
      newEndTime.setMinutes(newEndTime.getMinutes() + shortened.newDuration);
      
      const after = {
        startTime: task.startTime,
        endTime: newEndTime,
        duration: shortened.newDuration
      };
      
      scheduleChanges.push({
        type: 'shortened',
        taskId: task.id,
        taskTitle: task.title,
        before,
        after
      });
      
      proposedTasks[taskIndex] = {
        ...task,
        endTime: newEndTime,
        durationMinutes: shortened.newDuration
      };
    }
  }
  
  if (changes.droppedTaskIds) {
    for (const taskId of changes.droppedTaskIds) {
      const task = proposedTasks.find(t => t.id === taskId);
      if (!task) continue;
      
      scheduleChanges.push({
        type: 'dropped',
        taskId: task.id,
        taskTitle: task.title,
        before: {
          startTime: task.startTime,
          endTime: task.endTime,
          duration: task.durationMinutes
        }
      });
      
      proposedTasks = proposedTasks.filter(t => t.id !== taskId);
    }
  }
  
  const proposedState: ScheduleSnapshot = {
    tasks: proposedTasks.map(t => ({
      id: t.id,
      title: t.title,
      startTime: t.startTime,
      endTime: t.endTime,
      durationMinutes: t.durationMinutes
    })),
    outcomeDeadline
  };
  
  const totalDuration = proposedTasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  const availableMinutes = Math.floor(
    (outcomeDeadline.getTime() - new Date().getTime()) / (1000 * 60)
  );
  const outcomeStillAchievable = totalDuration <= availableMinutes;
  
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);
  
  return {
    id: uuidv4(),
    proposalType,
    originalState,
    proposedState,
    changes: scheduleChanges,
    outcomeStillAchievable,
    createdAt: now,
    expiresAt,
    status: 'pending'
  };
}
