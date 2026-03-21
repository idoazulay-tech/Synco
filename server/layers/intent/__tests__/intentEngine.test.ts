// Unit tests for Intent & Context Engine
import { describe, it, expect, beforeEach, test } from 'vitest';
import { IntentContextEngine } from '../IntentContextEngine';
import { ContextManager } from '../memory/ContextManager';

describe('IntentContextEngine', () => {
  let engine: IntentContextEngine;
  let contextManager: ContextManager;
  
  beforeEach(() => {
    contextManager = new ContextManager();
    engine = new IntentContextEngine(contextManager);
  });
  
  test('1. תכניס לי פגישה מחר ב-2 עם יוסי', () => {
    const result = engine.analyze('תכניס לי פגישה מחר ב-2 עם יוסי');
    
    expect(result.inputType).toBe('command');
    expect(result.primaryIntent).toBe('create_event');
    expect(result.entities.date.confidence).toBeGreaterThan(0);
    expect(result.entities.time.confidence).toBeGreaterThan(0);
    expect(result.entities.people.normalized).toContain('יוסי');
  });
  
  test('2. תזכיר לי לקנות מים', () => {
    const result = engine.analyze('תזכיר לי לקנות מים');
    
    expect(result.inputType).toBe('command');
    expect(result.primaryIntent).toBe('create_task');
    expect(result.entities.taskName.normalized).toContain('לקנות');
  });
  
  test('3. אני אולי צריך לעשות קניות', () => {
    const result = engine.analyze('אני אולי צריך לעשות קניות');
    
    expect(result.inputType).toBe('thought');
    expect(['low', 'medium']).toContain(result.commitmentLevel);
  });
  
  test('4. לא, בעצם מחר ב-3', () => {
    engine.analyze('תכניס לי פגישה היום');
    const result = engine.analyze('לא, בעצם מחר ב-3');
    
    expect(result.inputType).toBe('correction');
    expect(result.context.isFollowUp).toBe(true);
  });
  
  test('5. דחוף דחוף אני חייב לקנות תבלין עכשיו זה 20 דקות', () => {
    const result = engine.analyze('דחוף דחוף אני חייב לקנות תבלין עכשיו זה 20 דקות');
    
    expect(result.commitmentLevel).toBe('high');
    expect(['medium', 'high']).toContain(result.cognitiveLoad);
    expect(result.entities.urgency.normalized).toBe('high');
    expect(result.entities.duration.normalized).toBe(20);
  });
  
  test('6. מה יש לי היום', () => {
    const result = engine.analyze('מה יש לי היום');
    
    expect(result.inputType).toBe('question');
    expect(result.primaryIntent).toBe('inquire');
    expect(result.entities.date.confidence).toBeGreaterThan(0);
  });
  
  test('7. תסדר לי את היום מחדש', () => {
    const result = engine.analyze('תסדר לי את היום מחדש');
    
    expect(result.inputType).toBe('command');
    expect(result.primaryIntent).toBe('reschedule');
  });
  
  test('8. עזוב שכח מזה', () => {
    const result = engine.analyze('עזוב שכח מזה');
    
    expect(result.inputType).toBe('correction');
  });
  
  test('9. כן - follow up detection', () => {
    engine.analyze('תכניס פגישה');
    const result = engine.analyze('כן');
    
    expect(result.context.isFollowUp).toBe(true);
    expect(result.context.refersToPrevious).toBe(true);
  });
  
  test('10. אני לחוץ לא מצליח לתפקד', () => {
    const result = engine.analyze('אני לחוץ לא מצליח לתפקד');
    
    expect(result.inputType).toBe('emotional_dump');
    expect(result.primaryIntent).not.toBe('create_task');
  });
  
  test('11. Entity extraction - time with Hebrew words', () => {
    const result = engine.analyze('פגישה מחר בשלוש');
    
    expect(result.entities.time.normalized).toBe('15:00');
    expect(result.entities.date.confidence).toBeGreaterThan(0);
  });
  
  test('12. Entity extraction - duration', () => {
    const result = engine.analyze('משימה של חצי שעה');
    
    expect(result.entities.duration.normalized).toBe(30);
  });
  
  test('13. Constraint detection - allowed window', () => {
    const result = engine.analyze('רק אחרי שלוש אפשר לעשות דברים');
    
    expect(result.entities.constraints.length).toBeGreaterThan(0);
    expect(result.entities.constraints[0].type).toBe('allowed_window');
  });
  
  test('14. Missing info detection for create_event', () => {
    const result = engine.analyze('פגישה');
    
    expect(result.missingInfo).toContain('date');
    expect(result.missingInfo).toContain('time');
  });
  
  test('15. Confidence score calculation', () => {
    const complete = engine.analyze('תכניס פגישה מחר ב-2 עם יוסי');
    const incomplete = engine.analyze('פגישה');
    
    expect(complete.confidenceScore).toBeGreaterThan(incomplete.confidenceScore);
  });
});

describe('ContextManager', () => {
  let manager: ContextManager;
  
  beforeEach(() => {
    manager = new ContextManager();
  });
  
  test('tracks conversation history', () => {
    manager.startNewTurn('first input');
    manager.startNewTurn('second input');
    
    const state = manager.getState();
    expect(state.conversationHistory.length).toBe(2);
  });
  
  test('detects follow-up responses', () => {
    manager.startNewTurn('תכניס פגישה');
    
    const suggestion = manager.analyzeContext('כן');
    expect(suggestion.isFollowUp).toBe(true);
  });
  
  test('tracks cognitive load over time', () => {
    manager.updateCognitiveLoad('high');
    manager.updateCognitiveLoad('high');
    manager.updateCognitiveLoad('medium');
    
    expect(manager.getAverageCognitiveLoad()).toBe('high');
  });
  
  test('resets state correctly', () => {
    manager.startNewTurn('test');
    manager.reset();
    
    const state = manager.getState();
    expect(state.conversationHistory.length).toBe(0);
    expect(state.lastIntent).toBeNull();
  });
});
