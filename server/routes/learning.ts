// Layer 5: Learning Engine API Routes

import { Router, Request, Response } from 'express';
import { LearningEngine, getLearningStore } from '../layers/learning/index.js';

const router = Router();

function getEngine(): LearningEngine {
  return new LearningEngine(getLearningStore());
}

// GET /api/learning - Get learning state
router.get('/', (_req: Request, res: Response) => {
  try {
    const store = getLearningStore();
    const state = store.getLearningState();
    
    res.json({
      success: true,
      data: {
        activeRules: store.getActiveRules(),
        pausedRules: store.getPausedRules(),
        pendingProposal: store.getPendingProposal(),
        recentDecisions: store.getRecentDecisionLogs(5),
        patterns: store.getPatterns().slice(0, 10),
        stats: {
          totalDecisions: state.decisionLogs.length,
          totalRules: state.preferenceRules.length,
          totalPatterns: state.patterns.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/learning/rule/confirm - Confirm pending rule proposal
router.post('/rule/confirm', (_req: Request, res: Response) => {
  try {
    const engine = getEngine();
    const rule = engine.confirmRuleProposal();
    
    if (rule) {
      res.json({
        success: true,
        data: {
          rule,
          message: 'הכלל נוצר בהצלחה'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'אין הצעת כלל פעילה'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/learning/rule/decline - Decline pending rule proposal
router.post('/rule/decline', (_req: Request, res: Response) => {
  try {
    const engine = getEngine();
    engine.declineRuleProposal();
    
    res.json({
      success: true,
      message: 'ההצעה נדחתה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/learning/rule/toggle - Toggle rule status (pause/resume)
router.post('/rule/toggle', (req: Request, res: Response) => {
  try {
    const { ruleId, status } = req.body;
    
    if (!ruleId || !['active', 'paused'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'נדרש ruleId וסטטוס (active/paused)'
      });
      return;
    }
    
    const engine = getEngine();
    const rule = engine.toggleRule(ruleId, status);
    
    if (rule) {
      res.json({
        success: true,
        data: {
          rule,
          message: status === 'paused' ? 'הכלל הושהה' : 'הכלל הופעל מחדש'
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'כלל לא נמצא'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/learning/process - Process a learning event (for integration)
router.post('/process', (req: Request, res: Response) => {
  try {
    const {
      actionType,
      comparedItems,
      userChoice,
      context,
      plannedMinutes,
      actualMinutes,
      feedback
    } = req.body;
    
    if (!actionType || !userChoice) {
      res.status(400).json({
        success: false,
        error: 'נדרש actionType ו-userChoice'
      });
      return;
    }
    
    const engine = getEngine();
    const result = engine.process(
      actionType,
      comparedItems || [],
      userChoice,
      context || {
        cognitiveLoad: 'medium',
        urgencyLevels: {},
        mustLocks: [],
        timeWindow: { startIso: '', endIso: '' },
        isReshuffle: false,
        isFollowUp: false
      },
      plannedMinutes || 0,
      actualMinutes,
      feedback
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
