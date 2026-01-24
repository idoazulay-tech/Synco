// API Routes for Layer 7: Feedback & Review

import { Router } from 'express';
import { getFeedbackLayer } from '../layers/feedback/index.js';
import { getStore } from '../layers/task/store/InMemoryStore.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const feedbackLayer = getFeedbackLayer();
    
    const feedbackFeed = feedbackLayer.getFeedbackFeed(limit);
    const pendingCheckIn = feedbackLayer.getPendingCheckIn();
    const stats = feedbackLayer.getStats();
    const context = feedbackLayer.getContext();
    
    res.json({
      feedbackFeed,
      pendingCheckIn,
      stats,
      context,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in GET /api/feedback:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/checkin/respond', (req, res) => {
  try {
    const { response, checkInId } = req.body;
    
    if (!response || !checkInId) {
      return res.status(400).json({ 
        error: 'Missing response or checkInId' 
      });
    }
    
    const feedbackLayer = getFeedbackLayer();
    const result = feedbackLayer.respondToCheckIn(response, checkInId);
    
    res.json({
      success: true,
      feedbackMessage: result.feedbackMessage,
      uiInstructions: result.uiInstructions,
      signalsForLearning: result.signalsForLearning,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in POST /api/feedback/checkin/respond:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/daily-review/request', (req, res) => {
  try {
    const feedbackLayer = getFeedbackLayer();
    const store = getStore();
    const taskState = store.getState();
    
    const result = feedbackLayer.processDailyReview(taskState, true);
    
    res.json({
      success: true,
      feedbackMessage: result.feedbackMessage,
      uiInstructions: result.uiInstructions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in POST /api/feedback/daily-review/request:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/reflection', (req, res) => {
  try {
    const { decision, confidence, missingInfo, actionType, taskTitle } = req.body;
    
    if (!decision) {
      return res.status(400).json({ 
        error: 'Missing decision parameter' 
      });
    }
    
    const feedbackLayer = getFeedbackLayer();
    const result = feedbackLayer.processReflection({
      decision,
      confidence: confidence || 1,
      missingInfo: missingInfo || [],
      actionType,
      taskTitle
    });
    
    res.json({
      success: true,
      feedbackMessage: result.feedbackMessage,
      uiInstructions: result.uiInstructions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in POST /api/feedback/reflection:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/stats', (req, res) => {
  try {
    const feedbackLayer = getFeedbackLayer();
    const stats = feedbackLayer.getStats();
    
    res.json({
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in GET /api/feedback/stats:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
