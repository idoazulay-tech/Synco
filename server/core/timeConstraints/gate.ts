/**
 * Time Constraint Gate - חוק-על מרכזי
 * 
 * כל פעולה על הלו"ז חייבת לעבור דרך הפונקציה הזו.
 * אם פעולה מפרה את החוקים - היא נחסמת.
 * 
 * סדר עדיפות:
 * 1. HARD_LOCK - ננעלות ראשונות, אי אפשר להזיז
 * 2. HUMAN_DEPENDENT - סביב HARD_LOCK, ללא פגיעה באדם
 * 3. FLEX_WINDOW - ממלאות חלונות פנויים
 * 4. FILL_GAPS - רק אם נשאר זמן
 */

import { 
  TimeConstraintType, 
  ScheduleOperation, 
  ScheduleState, 
  GateDecision,
  CONSTRAINT_PRIORITY 
} from './types';

export interface EnforceOptions {
  allowManualOverride?: boolean;
  userId?: string;
  reason?: string;
}

export function enforceTimeConstraintLayer(
  scheduleState: ScheduleState,
  proposedOperation: ScheduleOperation,
  options: EnforceOptions = {}
): GateDecision {
  const { operationType, taskId, proposedStartTime, proposedEndTime, isAutomatic } = proposedOperation;
  
  if (operationType === 'create') {
    return handleCreateOperation(scheduleState, proposedOperation);
  }
  
  if (!taskId) {
    return {
      allowed: false,
      reason: 'פעולה דורשת מזהה משימה'
    };
  }
  
  const task = scheduleState.tasks.find(t => t.id === taskId);
  
  if (!task) {
    return {
      allowed: true,
      reason: 'משימה לא קיימת - מותר ליצור'
    };
  }
  
  switch (operationType) {
    case 'reschedule':
    case 'auto_move':
      return handleRescheduleOperation(task, proposedOperation, scheduleState, options);
    
    case 'delete':
      return handleDeleteOperation(task, options);
    
    case 'optimize':
      return handleOptimizeOperation(task, scheduleState, options);
    
    default:
      return {
        allowed: false,
        reason: `סוג פעולה לא מוכר: ${operationType}`
      };
  }
}

function handleCreateOperation(
  scheduleState: ScheduleState,
  operation: ScheduleOperation
): GateDecision {
  if (!operation.proposedStartTime || !operation.proposedEndTime) {
    return {
      allowed: true,
      reason: 'יצירת משימה מאושרת'
    };
  }
  
  const conflicts = findConflicts(
    scheduleState,
    operation.proposedStartTime,
    operation.proposedEndTime
  );
  
  const hardLockConflicts = conflicts.filter(
    t => t.timeConstraint === TimeConstraintType.HARD_LOCK
  );
  
  if (hardLockConflicts.length > 0) {
    return {
      allowed: false,
      reason: `קונפליקט עם משימה נעולה: ${hardLockConflicts[0].title}`,
      constraintType: TimeConstraintType.HARD_LOCK,
      suggestedAlternative: findAlternativeSlot(
        scheduleState,
        operation.proposedStartTime,
        operation.proposedEndTime
      )
    };
  }
  
  return {
    allowed: true,
    reason: 'אין קונפליקט עם משימות נעולות'
  };
}

function handleRescheduleOperation(
  task: ScheduleState['tasks'][0],
  operation: ScheduleOperation,
  scheduleState: ScheduleState,
  options: EnforceOptions
): GateDecision {
  if (task.timeConstraint === TimeConstraintType.HARD_LOCK) {
    if (operation.isAutomatic) {
      return {
        allowed: false,
        reason: `משימה נעולה "${task.title}" - אסור להזיז אוטומטית`,
        constraintType: TimeConstraintType.HARD_LOCK
      };
    }
    
    if (options.allowManualOverride && options.reason) {
      return {
        allowed: true,
        reason: `הזזה ידנית עם אישור: ${options.reason}`,
        constraintType: TimeConstraintType.HARD_LOCK
      };
    }
    
    return {
      allowed: false,
      reason: `משימה נעולה "${task.title}" - נדרש אישור ידני`,
      constraintType: TimeConstraintType.HARD_LOCK
    };
  }
  
  if (task.timeConstraint === TimeConstraintType.HUMAN_DEPENDENT) {
    if (operation.isAutomatic) {
      return {
        allowed: false,
        reason: `משימה "${task.title}" תלויה באדם - נדרש אישור`,
        constraintType: TimeConstraintType.HUMAN_DEPENDENT
      };
    }
    
    return {
      allowed: true,
      reason: 'הזזה ידנית של משימה תלוית-אדם מותרת',
      constraintType: TimeConstraintType.HUMAN_DEPENDENT
    };
  }
  
  if (task.timeConstraint === TimeConstraintType.FLEX_WINDOW) {
    return {
      allowed: true,
      reason: 'משימה גמישה - הזזה מותרת בתוך החלון',
      constraintType: TimeConstraintType.FLEX_WINDOW
    };
  }
  
  if (task.timeConstraint === TimeConstraintType.FILL_GAPS) {
    return {
      allowed: true,
      reason: 'משימת מילוי - הזזה מותרת',
      constraintType: TimeConstraintType.FILL_GAPS
    };
  }
  
  return {
    allowed: true,
    reason: 'ברירת מחדל - הזזה מותרת'
  };
}

function handleDeleteOperation(
  task: ScheduleState['tasks'][0],
  options: EnforceOptions
): GateDecision {
  if (task.timeConstraint === TimeConstraintType.HARD_LOCK && task.isLocked) {
    if (!options.allowManualOverride) {
      return {
        allowed: false,
        reason: `משימה נעולה "${task.title}" - מחיקה דורשת אישור`,
        constraintType: TimeConstraintType.HARD_LOCK
      };
    }
  }
  
  return {
    allowed: true,
    reason: 'מחיקה מותרת'
  };
}

function handleOptimizeOperation(
  task: ScheduleState['tasks'][0],
  scheduleState: ScheduleState,
  options: EnforceOptions
): GateDecision {
  if (task.timeConstraint === TimeConstraintType.HARD_LOCK) {
    return {
      allowed: false,
      reason: `משימה נעולה "${task.title}" - לא נכללת באופטימיזציה`,
      constraintType: TimeConstraintType.HARD_LOCK
    };
  }
  
  if (task.timeConstraint === TimeConstraintType.HUMAN_DEPENDENT) {
    return {
      allowed: false,
      reason: `משימה תלויית-אדם "${task.title}" - לא נכללת באופטימיזציה אוטומטית`,
      constraintType: TimeConstraintType.HUMAN_DEPENDENT
    };
  }
  
  return {
    allowed: true,
    reason: 'משימה ניתנת לאופטימיזציה',
    constraintType: task.timeConstraint
  };
}

function findConflicts(
  scheduleState: ScheduleState,
  startTime: Date,
  endTime: Date
): ScheduleState['tasks'] {
  return scheduleState.tasks.filter(task => {
    const taskStart = new Date(task.startTime);
    const taskEnd = new Date(task.endTime);
    return startTime < taskEnd && endTime > taskStart;
  });
}

function findAlternativeSlot(
  scheduleState: ScheduleState,
  originalStart: Date,
  originalEnd: Date
): { startTime: Date; endTime: Date; reason: string } | undefined {
  const duration = originalEnd.getTime() - originalStart.getTime();
  
  const sortedTasks = [...scheduleState.tasks]
    .filter(t => t.timeConstraint === TimeConstraintType.HARD_LOCK)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  
  let searchStart = new Date(originalStart);
  
  for (const task of sortedTasks) {
    const taskStart = new Date(task.startTime);
    const gap = taskStart.getTime() - searchStart.getTime();
    
    if (gap >= duration) {
      return {
        startTime: searchStart,
        endTime: new Date(searchStart.getTime() + duration),
        reason: `חלון פנוי לפני "${task.title}"`
      };
    }
    
    searchStart = new Date(task.endTime);
  }
  
  return {
    startTime: searchStart,
    endTime: new Date(searchStart.getTime() + duration),
    reason: 'חלון פנוי אחרי כל המשימות הנעולות'
  };
}

export function canTaskBeBumped(
  task: ScheduleState['tasks'][0],
  bumpingTask: ScheduleState['tasks'][0]
): boolean {
  const bumpingPriority = CONSTRAINT_PRIORITY[bumpingTask.timeConstraint];
  const targetPriority = CONSTRAINT_PRIORITY[task.timeConstraint];
  
  if (task.timeConstraint === TimeConstraintType.HARD_LOCK) {
    return false;
  }
  
  if (task.timeConstraint === TimeConstraintType.HUMAN_DEPENDENT) {
    return false;
  }
  
  return bumpingPriority < targetPriority;
}

export function getTasksToEvict(
  scheduleState: ScheduleState,
  requiredDuration: number
): ScheduleState['tasks'] {
  const evictable = scheduleState.tasks.filter(
    t => t.timeConstraint === TimeConstraintType.FILL_GAPS
  );
  
  let totalDuration = 0;
  const toEvict: ScheduleState['tasks'] = [];
  
  for (const task of evictable) {
    const duration = new Date(task.endTime).getTime() - new Date(task.startTime).getTime();
    toEvict.push(task);
    totalDuration += duration;
    
    if (totalDuration >= requiredDuration) {
      break;
    }
  }
  
  return toEvict;
}
