import { Router, Request, Response } from 'express';
import { interpretInput, InterpretResult } from '../services/ruleEngine.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text is required' });
      return;
    }
    
    const result: InterpretResult = interpretInput(text);
    
    await prisma.insightLog.create({
      data: {
        sourceText: text,
        summary: result.mode === 'task_or_event' 
          ? (result.task?.title || 'משימה')
          : (result.journal?.title || 'יומן'),
        detected: {
          mode: result.mode,
          taskType: result.task?.type,
          mood: result.journal?.mood_hint,
        },
      }
    });
    
    if (result.mode === 'task_or_event' && result.task && !result.task.needs_clarification) {
      const taskFile = await prisma.taskFile.create({
        data: {
          title: result.task.title,
        }
      });
      
      const dueAt = result.task.start_date 
        ? new Date(`${result.task.start_date}${result.task.start_time ? `T${result.task.start_time}` : 'T12:00'}`)
        : undefined;
      
      const taskRun = await prisma.taskRun.create({
        data: {
          taskFileId: taskFile.id,
          urgency: result.task.priority === 'high' ? 'HIGH' : result.task.priority === 'low' ? 'LOW' : 'MEDIUM',
          dueAt,
        }
      });
      
      res.json({
        ...result,
        action: {
          type: 'TASK_CREATED',
          taskFile,
          taskRun,
        }
      });
      return;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Quick input error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
