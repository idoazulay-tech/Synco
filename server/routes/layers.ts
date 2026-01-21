import { Router, Request, Response } from 'express';
import { getOrchestrator } from '../layers';

const router = Router();

// Process input through 7-layer system
router.post('/process', async (req: Request, res: Response) => {
  try {
    const { text, source = 'text' } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const orchestrator = getOrchestrator();
    const result = await orchestrator.processInput(text, source);
    
    res.json(result);
  } catch (error) {
    console.error('Layer processing error:', error);
    res.status(500).json({ error: 'Failed to process input' });
  }
});

// Record task completion for learning
router.post('/learn/completion', async (req: Request, res: Response) => {
  try {
    const { taskPattern, plannedMinutes, actualMinutes } = req.body;
    
    if (!taskPattern || typeof plannedMinutes !== 'number' || typeof actualMinutes !== 'number') {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const orchestrator = getOrchestrator();
    const result = await orchestrator.recordTaskCompletion(
      taskPattern,
      plannedMinutes,
      actualMinutes
    );
    
    res.json(result);
  } catch (error) {
    console.error('Learning record error:', error);
    res.status(500).json({ error: 'Failed to record completion' });
  }
});

// Get personal time stats
router.get('/stats/personal', async (_req: Request, res: Response) => {
  try {
    const orchestrator = getOrchestrator();
    const stats = orchestrator.getPersonalStats();
    res.json({ stats });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get learning insights
router.get('/insights', async (_req: Request, res: Response) => {
  try {
    const orchestrator = getOrchestrator();
    const insights = orchestrator.getInsights();
    res.json(insights);
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

export default router;
