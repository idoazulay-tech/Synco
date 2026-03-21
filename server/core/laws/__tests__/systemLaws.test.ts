/**
 * System Laws Gate Tests
 * 
 * בדיקות חובה:
 * 1. OutcomeAnchor נוצר רק כשחוק סף מתקיים (2 מתוך 4 תנאים)
 * 2. OUTCOME_AT_RISK מחזיר החלטה ולא משנה לבד
 * 3. ההשלכות תמיד תפעוליות בלבד
 * 4. קיצור 30-50% מחושב לפי נתוני עבר
 * 5. Preview לא משנה מצב עד approve
 * 6. FILL_GAPS נדחקת לפני linkedOutcome
 */

import { describe, it, expect } from 'vitest';
import {
  systemLawsGate,
  checkOutcomeThreshold,
  calculateShorteningForTask,
  calculateAllShortenings,
  getTasksForDropping,
  buildProposedSchedulePreview,
  buildOperationalConsequences,
  SystemLawsState,
  SystemLawsOperation
} from '../index';
import { TimeConstraintType } from '../../timeConstraints/types';

describe('OutcomeAnchor Threshold Law', () => {
  it('should create OutcomeAnchor only when 2+ conditions met', () => {
    const result1 = checkOutcomeThreshold('צריך לצאת לעבודה ב-8:30', {
      hasExplicitDeadline: true,
      hasStatedConsequences: true
    });
    expect(result1.meetsThreshold).toBe(true);
    expect(result1.conditionCount).toBeGreaterThanOrEqual(2);
    
    const result2 = checkOutcomeThreshold('לקרוא ספר היום');
    expect(result2.meetsThreshold).toBe(false);
    expect(result2.conditionCount).toBeLessThan(2);
  });

  it('should detect commitment language', () => {
    const result = checkOutcomeThreshold('חייב להגיע בזמן, העבודה מתחילה ב-9');
    expect(result.metConditions).toContain('hasCommitmentLanguage');
  });

  it('should detect real consequences', () => {
    const result = checkOutcomeThreshold('פגישה חשובה ב-10, אם לא אגיע אז יפספסו את הלקוח');
    expect(result.metConditions).toContain('hasRealConsequences');
  });
});

describe('OUTCOME_AT_RISK Decision', () => {
  const now = new Date('2026-01-27T07:00:00');
  const deadline = new Date('2026-01-27T08:00:00');
  
  const createStateWithRisk = (): SystemLawsState => ({
    currentTime: now,
    tasks: [
      {
        id: 'prep-1',
        title: 'להתארגן',
        startTime: now,
        endTime: new Date('2026-01-27T07:30:00'),
        durationMinutes: 30,
        timeConstraintType: TimeConstraintType.FLEX_WINDOW,
        linkedOutcomeId: 'outcome-1'
      },
      {
        id: 'prep-2',
        title: 'ארוחת בוקר',
        startTime: new Date('2026-01-27T07:30:00'),
        endTime: new Date('2026-01-27T08:00:00'),
        durationMinutes: 30,
        timeConstraintType: TimeConstraintType.FLEX_WINDOW,
        linkedOutcomeId: 'outcome-1'
      }
    ],
    outcomes: [{
      id: 'outcome-1',
      title: 'יציאה לעבודה',
      deadlineTime: deadline,
      bufferMinutes: 15,
      linkedTaskIds: ['prep-1', 'prep-2']
    }]
  });

  it('should return OUTCOME_AT_RISK decision instead of auto-changing', () => {
    const state = createStateWithRisk();
    const operation: SystemLawsOperation = {
      operationType: 'create',
      isAutomatic: true
    };

    const decision = systemLawsGate(state, operation);
    
    expect(decision.decisionType).toBe('OUTCOME_AT_RISK');
    expect(decision.outcomeAtRisk).toBeDefined();
    expect(decision.outcomeAtRisk?.missingMinutes).toBeGreaterThan(0);
  });

  it('should provide user choices in OUTCOME_AT_RISK', () => {
    const state = createStateWithRisk();
    const operation: SystemLawsOperation = {
      operationType: 'create',
      isAutomatic: false
    };

    const decision = systemLawsGate(state, operation);
    
    expect(decision.outcomeAtRisk?.availableChoices).toContain('SHORTEN_DURATIONS');
    expect(decision.outcomeAtRisk?.availableChoices).toContain('DROP_TASK');
  });
});

describe('Operational Consequences Only', () => {
  it('should return only operational facts without emotional language', () => {
    const consequences = buildOperationalConsequences(
      18,
      'יציאה לעבודה',
      new Date('2026-01-27T08:30:00'),
      new Date('2026-01-27T08:48:00')
    );
    
    expect(consequences.type).toBe('operational');
    
    expect(consequences.facts.some(f => f.includes('חסרות'))).toBe(true);
    expect(consequences.facts.some(f => f.includes('במקום'))).toBe(true);
    
    const emotionalWords = ['לחץ', 'פחד', 'דאגה', 'מתוח', 'נורא', 'קשה'];
    for (const fact of consequences.facts) {
      for (const word of emotionalWords) {
        expect(fact).not.toContain(word);
      }
    }
    
    expect(consequences.requiredActions.length).toBeGreaterThan(0);
  });
});

describe('Adaptive Shortening 30-50%', () => {
  it('should calculate shortening between 30-50% based on task type', () => {
    const fillGapsTask = {
      id: 'fill-1',
      title: 'לקרוא ספר',
      startTime: new Date('2026-01-27T07:00:00'),
      endTime: new Date('2026-01-27T07:30:00'),
      durationMinutes: 30,
      timeConstraintType: TimeConstraintType.FILL_GAPS
    };
    
    const shortened = calculateShorteningForTask(fillGapsTask, {
      minReductionPercent: 30,
      maxReductionPercent: 50,
      targetMinutesToSave: 15
    });
    
    expect(shortened).not.toBeNull();
    expect(shortened!.reductionPercent).toBe(50);
    expect(shortened!.newDuration).toBe(15);
  });

  it('should use historical data for better shortening estimation', () => {
    const taskWithHistory = {
      id: 'task-1',
      title: 'משימה רגילה',
      startTime: new Date('2026-01-27T07:00:00'),
      endTime: new Date('2026-01-27T07:30:00'),
      durationMinutes: 30,
      timeConstraintType: TimeConstraintType.FLEX_WINDOW,
      historicalDurations: [20, 22, 18]
    };
    
    const shortened = calculateShorteningForTask(taskWithHistory, {
      minReductionPercent: 30,
      maxReductionPercent: 50,
      targetMinutesToSave: 10
    });
    
    expect(shortened).not.toBeNull();
    expect(shortened!.reductionPercent).toBeGreaterThanOrEqual(40);
  });

  it('should not shorten linkedOutcome tasks', () => {
    const linkedTask = {
      id: 'linked-1',
      title: 'הכנה ליציאה',
      startTime: new Date('2026-01-27T07:00:00'),
      endTime: new Date('2026-01-27T07:30:00'),
      durationMinutes: 30,
      timeConstraintType: TimeConstraintType.FLEX_WINDOW,
      linkedOutcomeId: 'outcome-1'
    };
    
    const shortened = calculateShorteningForTask(linkedTask, {
      minReductionPercent: 30,
      maxReductionPercent: 50,
      targetMinutesToSave: 15
    });
    
    expect(shortened).toBeNull();
  });
});

describe('Preview Does Not Change State Until Approved', () => {
  it('should create preview without modifying original state', () => {
    const originalTasks = [
      {
        id: 'task-1',
        title: 'משימה 1',
        startTime: new Date('2026-01-27T07:00:00'),
        endTime: new Date('2026-01-27T07:30:00'),
        durationMinutes: 30,
        timeConstraintType: TimeConstraintType.FILL_GAPS
      },
      {
        id: 'task-2',
        title: 'משימה 2',
        startTime: new Date('2026-01-27T07:30:00'),
        endTime: new Date('2026-01-27T08:00:00'),
        durationMinutes: 30,
        timeConstraintType: TimeConstraintType.FLEX_WINDOW
      }
    ];
    
    const originalCopy = JSON.parse(JSON.stringify(originalTasks));
    
    const preview = buildProposedSchedulePreview(
      'SHORTEN_DURATIONS',
      originalTasks,
      { 
        shortenedTasks: [{
          taskId: 'task-1',
          originalDuration: 30,
          newDuration: 15,
          reductionPercent: 50,
          reason: 'קיצור'
        }]
      },
      new Date('2026-01-27T08:30:00')
    );
    
    expect(preview.status).toBe('pending');
    expect(JSON.stringify(originalTasks)).toBe(JSON.stringify(originalCopy));
    
    expect(preview.originalState.tasks[0].durationMinutes).toBe(30);
    expect(preview.proposedState.tasks[0].durationMinutes).toBe(15);
  });
});

describe('FILL_GAPS Bumped Before LinkedOutcome', () => {
  it('should prioritize FILL_GAPS for dropping over linkedOutcome tasks', () => {
    const tasks = [
      {
        id: 'fill-1',
        title: 'לקרוא ספר',
        startTime: new Date('2026-01-27T07:00:00'),
        endTime: new Date('2026-01-27T07:30:00'),
        durationMinutes: 30,
        timeConstraintType: TimeConstraintType.FILL_GAPS
      },
      {
        id: 'linked-1',
        title: 'הכנה ליציאה',
        startTime: new Date('2026-01-27T07:30:00'),
        endTime: new Date('2026-01-27T08:00:00'),
        durationMinutes: 30,
        timeConstraintType: TimeConstraintType.FLEX_WINDOW,
        linkedOutcomeId: 'outcome-1'
      }
    ];
    
    const forDropping = getTasksForDropping(tasks);
    
    expect(forDropping.length).toBe(1);
    expect(forDropping[0].id).toBe('fill-1');
    expect(forDropping[0].recommendedForDrop).toBe(true);
  });

  it('should shorten FILL_GAPS first in calculateAllShortenings', () => {
    const tasks = [
      {
        id: 'flex-1',
        title: 'משימה גמישה',
        startTime: new Date('2026-01-27T07:00:00'),
        endTime: new Date('2026-01-27T07:30:00'),
        durationMinutes: 30,
        timeConstraintType: TimeConstraintType.FLEX_WINDOW
      },
      {
        id: 'fill-1',
        title: 'לקרוא ספר',
        startTime: new Date('2026-01-27T07:30:00'),
        endTime: new Date('2026-01-27T08:00:00'),
        durationMinutes: 30,
        timeConstraintType: TimeConstraintType.FILL_GAPS
      }
    ];
    
    const result = calculateAllShortenings(tasks, 20);
    
    expect(result.shortenedTasks.length).toBeGreaterThan(0);
    expect(result.shortenedTasks[0].taskId).toBe('fill-1');
    expect(result.shortenedTasks[0].reductionPercent).toBe(50);
  });
});
