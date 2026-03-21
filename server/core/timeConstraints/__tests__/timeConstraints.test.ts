/**
 * Time Constraint & Flexibility Layer Tests
 * 4 תרחישים נדרשים:
 * 1. HARD_LOCK לא זז
 * 2. FILL_GAPS נדחק ראשון בעומס
 * 3. HUMAN_DEPENDENT מחזיר needs_clarification כשיש ספק
 * 4. FLEX_WINDOW נשאר בתוך החלון
 */

import { describe, it, expect } from 'vitest';
import { 
  TimeConstraintType, 
  classifyTaskTimeConstraint,
  enforceTimeConstraintLayer,
  canTaskBeBumped,
  getTasksToEvict,
  ScheduleState,
  ScheduleOperation
} from '../index';

describe('Time Constraint Layer - Classifier', () => {
  describe('HARD_LOCK classification', () => {
    it('should classify meeting with exact time as HARD_LOCK', () => {
      const result = classifyTaskTimeConstraint(
        'פגישה עם דני בשעה 10',
        { hasExactTime: true }
      );
      expect(result.type).toBe(TimeConstraintType.HARD_LOCK);
      expect(result.canReschedule).toBe(false);
    });

    it('should classify appointment as HARD_LOCK', () => {
      const result = classifyTaskTimeConstraint('תור לרופא מחר ב-9');
      expect(result.type).toBe(TimeConstraintType.HARD_LOCK);
    });

    it('should classify flight as HARD_LOCK', () => {
      const result = classifyTaskTimeConstraint('טיסה לאילת ב-6 בבוקר');
      expect(result.type).toBe(TimeConstraintType.HARD_LOCK);
    });
  });

  describe('HUMAN_DEPENDENT classification', () => {
    it('should classify task with participants as HUMAN_DEPENDENT', () => {
      const result = classifyTaskTimeConstraint(
        'שיחה עם לקוח',
        undefined,
        ['לקוח']
      );
      expect(result.type).toBe(TimeConstraintType.HUMAN_DEPENDENT);
    });

    it('should set requiresClarification when confidence is low', () => {
      const result = classifyTaskTimeConstraint('זמן איכות עם הילדים');
      expect(result.type).toBe(TimeConstraintType.HUMAN_DEPENDENT);
    });
  });

  describe('FLEX_WINDOW classification', () => {
    it('should classify "היום מתישהו" as FLEX_WINDOW', () => {
      const result = classifyTaskTimeConstraint(
        'לקנות חלב היום',
        { hasFlexWindow: true }
      );
      expect(result.type).toBe(TimeConstraintType.FLEX_WINDOW);
      expect(result.canReschedule).toBe(true);
    });

    it('should classify "מחר בערב" as FLEX_WINDOW', () => {
      const result = classifyTaskTimeConstraint('ספורט מחר בערב');
      expect(result.type).toBe(TimeConstraintType.FLEX_WINDOW);
    });
  });

  describe('FILL_GAPS classification', () => {
    it('should classify "אם יהיה זמן" as FILL_GAPS', () => {
      const result = classifyTaskTimeConstraint('לקרוא ספר אם יהיה זמן');
      expect(result.type).toBe(TimeConstraintType.FILL_GAPS);
      expect(result.canReschedule).toBe(true);
    });

    it('should classify hobby as FILL_GAPS', () => {
      const result = classifyTaskTimeConstraint('לצפות בסרט בזמן הפנוי');
      expect(result.type).toBe(TimeConstraintType.FILL_GAPS);
    });
  });
});

describe('Time Constraint Layer - Gate', () => {
  const now = new Date('2026-01-27T10:00:00');
  
  const createScheduleState = (tasks: Partial<ScheduleState['tasks'][0]>[]): ScheduleState => ({
    currentTime: now,
    tasks: tasks.map((t, i) => ({
      id: t.id || `task-${i}`,
      title: t.title || 'משימה',
      startTime: t.startTime || now,
      endTime: t.endTime || new Date(now.getTime() + 60 * 60 * 1000),
      timeConstraint: t.timeConstraint || TimeConstraintType.FLEX_WINDOW,
      participants: t.participants,
      isLocked: t.isLocked
    }))
  });

  describe('HARD_LOCK cannot be moved automatically', () => {
    it('should block automatic reschedule of HARD_LOCK task', () => {
      const state = createScheduleState([{
        id: 'meeting-1',
        title: 'פגישה חשובה',
        timeConstraint: TimeConstraintType.HARD_LOCK
      }]);

      const operation: ScheduleOperation = {
        operationType: 'reschedule',
        taskId: 'meeting-1',
        isAutomatic: true
      };

      const decision = enforceTimeConstraintLayer(state, operation);
      
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('נעולה');
      expect(decision.constraintType).toBe(TimeConstraintType.HARD_LOCK);
    });

    it('should allow manual reschedule with override', () => {
      const state = createScheduleState([{
        id: 'meeting-1',
        title: 'פגישה',
        timeConstraint: TimeConstraintType.HARD_LOCK
      }]);

      const operation: ScheduleOperation = {
        operationType: 'reschedule',
        taskId: 'meeting-1',
        isAutomatic: false
      };

      const decision = enforceTimeConstraintLayer(state, operation, {
        allowManualOverride: true,
        reason: 'המשתמש ביקש במפורש'
      });
      
      expect(decision.allowed).toBe(true);
    });
  });

  describe('FILL_GAPS gets bumped first under load', () => {
    it('should return FILL_GAPS tasks as evictable', () => {
      const state = createScheduleState([
        { id: 'hard-1', title: 'פגישה', timeConstraint: TimeConstraintType.HARD_LOCK },
        { id: 'flex-1', title: 'קניות', timeConstraint: TimeConstraintType.FLEX_WINDOW },
        { id: 'fill-1', title: 'ספר', timeConstraint: TimeConstraintType.FILL_GAPS },
        { id: 'fill-2', title: 'סרט', timeConstraint: TimeConstraintType.FILL_GAPS }
      ]);

      const toEvict = getTasksToEvict(state, 60 * 60 * 1000); // 1 hour
      
      expect(toEvict.length).toBeGreaterThan(0);
      expect(toEvict.every(t => t.timeConstraint === TimeConstraintType.FILL_GAPS)).toBe(true);
    });

    it('should allow automatic move of FILL_GAPS', () => {
      const state = createScheduleState([{
        id: 'fill-1',
        title: 'לקרוא ספר',
        timeConstraint: TimeConstraintType.FILL_GAPS
      }]);

      const operation: ScheduleOperation = {
        operationType: 'auto_move',
        taskId: 'fill-1',
        isAutomatic: true
      };

      const decision = enforceTimeConstraintLayer(state, operation);
      expect(decision.allowed).toBe(true);
    });
  });

  describe('HUMAN_DEPENDENT requires clarification when uncertain', () => {
    it('should block automatic move of HUMAN_DEPENDENT', () => {
      const state = createScheduleState([{
        id: 'call-1',
        title: 'שיחה עם לקוח',
        timeConstraint: TimeConstraintType.HUMAN_DEPENDENT,
        participants: ['לקוח']
      }]);

      const operation: ScheduleOperation = {
        operationType: 'auto_move',
        taskId: 'call-1',
        isAutomatic: true
      };

      const decision = enforceTimeConstraintLayer(state, operation);
      
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('אישור');
    });

    it('should allow manual move of HUMAN_DEPENDENT', () => {
      const state = createScheduleState([{
        id: 'call-1',
        title: 'שיחה עם לקוח',
        timeConstraint: TimeConstraintType.HUMAN_DEPENDENT
      }]);

      const operation: ScheduleOperation = {
        operationType: 'reschedule',
        taskId: 'call-1',
        isAutomatic: false
      };

      const decision = enforceTimeConstraintLayer(state, operation);
      expect(decision.allowed).toBe(true);
    });
  });

  describe('FLEX_WINDOW stays within window', () => {
    it('should allow reschedule of FLEX_WINDOW', () => {
      const state = createScheduleState([{
        id: 'flex-1',
        title: 'קניות היום',
        timeConstraint: TimeConstraintType.FLEX_WINDOW
      }]);

      const operation: ScheduleOperation = {
        operationType: 'reschedule',
        taskId: 'flex-1',
        isAutomatic: true
      };

      const decision = enforceTimeConstraintLayer(state, operation);
      
      expect(decision.allowed).toBe(true);
      expect(decision.constraintType).toBe(TimeConstraintType.FLEX_WINDOW);
    });

    it('should allow optimization of FLEX_WINDOW', () => {
      const state = createScheduleState([{
        id: 'flex-1',
        title: 'קניות',
        timeConstraint: TimeConstraintType.FLEX_WINDOW
      }]);

      const operation: ScheduleOperation = {
        operationType: 'optimize',
        taskId: 'flex-1',
        isAutomatic: true
      };

      const decision = enforceTimeConstraintLayer(state, operation);
      expect(decision.allowed).toBe(true);
    });
  });

  describe('Priority bumping', () => {
    it('should not allow bumping HARD_LOCK', () => {
      const hardTask = { 
        id: 'h1', 
        title: 'פגישה', 
        timeConstraint: TimeConstraintType.HARD_LOCK,
        startTime: now,
        endTime: new Date(now.getTime() + 60 * 60 * 1000)
      };
      const fillTask = {
        id: 'f1',
        title: 'ספר',
        timeConstraint: TimeConstraintType.FILL_GAPS,
        startTime: now,
        endTime: new Date(now.getTime() + 60 * 60 * 1000)
      };

      expect(canTaskBeBumped(hardTask, fillTask)).toBe(false);
    });

    it('should allow bumping FILL_GAPS by HARD_LOCK', () => {
      const hardTask = { 
        id: 'h1', 
        title: 'פגישה', 
        timeConstraint: TimeConstraintType.HARD_LOCK,
        startTime: now,
        endTime: new Date(now.getTime() + 60 * 60 * 1000)
      };
      const fillTask = {
        id: 'f1',
        title: 'ספר',
        timeConstraint: TimeConstraintType.FILL_GAPS,
        startTime: now,
        endTime: new Date(now.getTime() + 60 * 60 * 1000)
      };

      expect(canTaskBeBumped(fillTask, hardTask)).toBe(true);
    });
  });
});
