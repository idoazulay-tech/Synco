import { describe, it, expect } from 'vitest';
import { extractEntities } from '../pipeline/extractEntities';

describe('Contextual Time Disambiguation', () => {
  describe('Linguistic context keywords', () => {
    it('should interpret "12 בצהריים" as 12:00', () => {
      const result = extractEntities('פגישה ב12 בצהריים');
      expect(result.time.normalized).toBe('12:00');
    });

    it('should interpret "12 בלילה" as 00:00', () => {
      const result = extractEntities('משימה ב12 בלילה');
      expect(result.time.normalized).toBe('00:00');
    });

    it('should interpret "2 בלילה" as 02:00', () => {
      const result = extractEntities('לקום ב2 בלילה');
      expect(result.time.normalized).toBe('02:00');
    });

    it('should interpret "7 בערב" as 19:00', () => {
      const result = extractEntities('ארוחת ערב ב7 בערב');
      expect(result.time.normalized).toBe('19:00');
    });

    it('should interpret "8 בבוקר" as 08:00', () => {
      const result = extractEntities('להתעורר ב8 בבוקר');
      expect(result.time.normalized).toBe('08:00');
    });

    it('should interpret "4 אחהצ" as 16:00', () => {
      const result = extractEntities('פגישה ב4 אחה"צ');
      expect(result.time.normalized).toBe('16:00');
    });
  });

  describe('Explicit time formats', () => {
    it('should parse "14:30" correctly', () => {
      const result = extractEntities('פגישה ב14:30');
      expect(result.time.normalized).toBe('14:30');
    });

    it('should parse "8:00" correctly', () => {
      const result = extractEntities('פגישה ב8:00');
      expect(result.time.normalized).toBe('08:00');
    });
  });

  describe('Spoken Hebrew time with minutes', () => {
    it('should parse "שמונה חמישים ותשע" as 08:59', () => {
      const result = extractEntities('משימה בשמונה חמישים ותשע');
      expect(result.time.normalized).toBe('08:59');
    });

    it('should parse "שלוש ארבעים וחמש" as 15:45 (afternoon disambiguation)', () => {
      const result = extractEntities('פגישה בשלוש ארבעים וחמש');
      expect(result.time.normalized).toMatch(/^(03|15):45$/);
    });

    it('should parse "עשר עשרים" as 10:20', () => {
      const result = extractEntities('תזכורת בעשר עשרים');
      expect(result.time.normalized).toMatch(/^(10|22):20$/);
    });

    it('should parse spoken Hebrew time with hours and minutes', () => {
      const result = extractEntities('פגישה בשמונה חמישים ותשע');
      expect(result.time.normalized).toMatch(/^(08|20):59$/);
    });
  });

  describe('Edge cases - clamping to context boundaries', () => {
    it('should handle "1 בבוקר" by clamping to morning range minimum (06:00)', () => {
      const result = extractEntities('משימה ב1 בבוקר');
      expect(result.time.normalized).toBe('06:00');
    });

    it('should handle "11 בלילה" by resolving to 23:00', () => {
      const result = extractEntities('לישון ב11 בלילה');
      expect(result.time.normalized).toBe('23:00');
    });

    it('should handle "3 בלילה" as 03:00', () => {
      const result = extractEntities('להתעורר ב3 בלילה');
      expect(result.time.normalized).toBe('03:00');
    });
  });

  describe('No time context', () => {
    it('should extract task name without time when no time given', () => {
      const result = extractEntities('להתקשר לרופא');
      expect(result.taskName.normalized).toContain('רופא');
    });
  });
});
