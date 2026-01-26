/**
 * Temporal Engine API Routes
 * Demo endpoints for ma_temporal_engine_he_v1
 */

import { Router, Request, Response } from 'express';
import { parseTemporalHe, suggestScheduleSlots, FreeBusySlot, SchedulingRules } from '../layers/temporal';

const router = Router();

router.post('/parse', (req: Request, res: Response) => {
  try {
    const { text, now, timezone } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'חסר טקסט לפענוח',
        field: 'text'
      });
    }
    
    const nowDate = now ? new Date(now) : new Date();
    const tz = timezone || 'Asia/Jerusalem';
    
    const result = parseTemporalHe(text, nowDate, tz);
    
    return res.json({
      success: true,
      input: text,
      result,
      parsedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Temporal parse error:', error);
    return res.status(500).json({
      error: 'שגיאה בפענוח',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/suggest', (req: Request, res: Response) => {
  try {
    const { text, freeBusy, durationMinutes, rules, now, timezone } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'חסר טקסט לפענוח',
        field: 'text'
      });
    }
    
    if (!freeBusy || !Array.isArray(freeBusy)) {
      return res.status(400).json({
        error: 'חסרים חלונות פנויים',
        field: 'freeBusy'
      });
    }
    
    const nowDate = now ? new Date(now) : new Date();
    const tz = timezone || 'Asia/Jerusalem';
    const duration = durationMinutes || 60;
    const schedulingRules: SchedulingRules = rules || {};
    
    const temporalResult = parseTemporalHe(text, nowDate, tz);
    
    const suggestions = suggestScheduleSlots(
      temporalResult,
      freeBusy as FreeBusySlot[],
      duration,
      schedulingRules
    );
    
    return res.json({
      success: true,
      input: text,
      temporal: temporalResult,
      suggestions,
      suggestedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Suggest schedule error:', error);
    return res.status(500).json({
      error: 'שגיאה בהצעת שיבוץ',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/demo', (req: Request, res: Response) => {
  const now = new Date();
  const examples = [
    'שמונה חמישים ותשע',
    'עשר ורבע',
    'רבע לשמונה',
    '8 בערב',
    'מחר ב-14:00',
    'יום שני הבא',
    'שעתיים',
    'מ-10 עד 12',
    'כל יום שני',
    'בערך סוף היום'
  ];
  
  const results = examples.map(text => ({
    input: text,
    result: parseTemporalHe(text, now)
  }));
  
  return res.json({
    title: 'MA Temporal Engine v1 - Demo',
    description: 'מנוע זמנים עברי מלא להבנת ביטויי זמן בשפה טבעית',
    now: now.toISOString(),
    timezone: 'Asia/Jerusalem',
    examples: results
  });
});

export default router;
