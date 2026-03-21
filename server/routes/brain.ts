import { Router } from 'express';
import { processBrainInput, answerCuriosity, getBrainStatus, handleApproval } from '../brain/index.js';

const router = Router();

router.post('/process', async (req, res) => {
  try {
    const { userId, text, type, payload } = req.body;

    if (!userId || !text) {
      return res.status(400).json({ error: 'userId and text are required' });
    }

    const result = await processBrainInput(userId, text, type, payload);
    res.json(result);
  } catch (error: any) {
    console.error('Brain process error:', error);
    res.status(500).json({ error: 'Failed to process brain input', details: error.message });
  }
});

router.post('/approve', async (req, res) => {
  try {
    const { userId, approved } = req.body;

    if (!userId || typeof approved !== 'boolean') {
      return res.status(400).json({ error: 'userId and approved (boolean) are required' });
    }

    await handleApproval(userId, approved);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Brain approval error:', error);
    res.status(500).json({ error: 'Failed to process approval', details: error.message });
  }
});

router.post('/curiosity/answer', async (req, res) => {
  try {
    const { userId, questionId, answer } = req.body;

    if (!userId || !questionId || !answer) {
      return res.status(400).json({ error: 'userId, questionId, and answer are required' });
    }

    const result = await answerCuriosity(userId, questionId, answer);
    res.json(result);
  } catch (error: any) {
    console.error('Curiosity answer error:', error);
    res.status(500).json({ error: 'Failed to process curiosity answer', details: error.message });
  }
});

router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const status = await getBrainStatus(userId);
    res.json(status);
  } catch (error: any) {
    console.error('Brain status error:', error);
    res.status(500).json({ error: 'Failed to get brain status', details: error.message });
  }
});

export default router;
