import { describe, it, expect } from 'vitest';
import {
  tokenizeHebrew,
  normalizeTokens,
  heNumberToInt,
  parseSpokenTimeHe,
  formatTime,
  convertSpokenHebrewTime
} from '../timeSpokenHeToDigital';

describe('TIME_SPOKEN_HE_IL_TO_DIGITAL', () => {
  describe('tokenizeHebrew', () => {
    it('should split text into tokens', () => {
      const tokens = tokenizeHebrew('שמונה חמישים ותשע');
      expect(tokens).toEqual(['שמונה', 'חמישים', 'ותשע']);
    });

    it('should handle punctuation', () => {
      const tokens = tokenizeHebrew('שמונה, חמישים!');
      expect(tokens).toEqual(['שמונה', 'חמישים']);
    });

    it('should handle extra whitespace', () => {
      const tokens = tokenizeHebrew('  שמונה   חמישים  ');
      expect(tokens).toEqual(['שמונה', 'חמישים']);
    });
  });

  describe('normalizeTokens', () => {
    it('should separate וחמש to ו + חמש', () => {
      const normalized = normalizeTokens(['ותשע']);
      expect(normalized).toEqual(['ו', 'תשע']);
    });

    it('should keep ו separate if already separated', () => {
      const normalized = normalizeTokens(['ו', 'תשע']);
      expect(normalized).toEqual(['ו', 'תשע']);
    });

    it('should not split non-number words starting with ו', () => {
      const normalized = normalizeTokens(['ועכשיו']);
      expect(normalized).toEqual(['ועכשיו']);
    });
  });

  describe('heNumberToInt', () => {
    it('should parse single units', () => {
      expect(heNumberToInt(['אפס'])).toBe(0);
      expect(heNumberToInt(['אחת'])).toBe(1);
      expect(heNumberToInt(['תשע'])).toBe(9);
    });

    it('should parse עשר as 10', () => {
      expect(heNumberToInt(['עשר'])).toBe(10);
    });

    it('should parse teens', () => {
      expect(heNumberToInt(['אחת', 'עשרה'])).toBe(11);
      expect(heNumberToInt(['תשע', 'עשרה'])).toBe(19);
    });

    it('should parse tens', () => {
      expect(heNumberToInt(['עשרים'])).toBe(20);
      expect(heNumberToInt(['חמישים'])).toBe(50);
    });

    it('should parse tens + ו + units', () => {
      expect(heNumberToInt(['חמישים', 'ו', 'תשע'])).toBe(59);
      expect(heNumberToInt(['עשרים', 'ו', 'אחת'])).toBe(21);
      expect(heNumberToInt(['שלושים', 'ו', 'חמש'])).toBe(35);
    });
  });

  describe('formatTime', () => {
    it('should format with two-digit minutes', () => {
      expect(formatTime(8, 0)).toBe('8:00');
      expect(formatTime(8, 1)).toBe('8:01');
      expect(formatTime(8, 9)).toBe('8:09');
      expect(formatTime(8, 10)).toBe('8:10');
      expect(formatTime(8, 59)).toBe('8:59');
    });
  });

  describe('parseSpokenTimeHe - Edge cases for minutes', () => {
    // 8:00 variants
    it('should parse "שמונה אפס אפס" as 8:00', () => {
      const result = parseSpokenTimeHe('שמונה אפס אפס');
      expect(result.formatted).toBe('8:00');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should parse "שמונה אפס" as 8:00', () => {
      const result = parseSpokenTimeHe('שמונה אפס');
      expect(result.formatted).toBe('8:00');
    });

    it('should parse "שמונה בדיוק" as 8:00', () => {
      const result = parseSpokenTimeHe('שמונה בדיוק');
      expect(result.formatted).toBe('8:00');
    });

    it('should parse "שמונה עגול" as 8:00', () => {
      const result = parseSpokenTimeHe('שמונה עגול');
      expect(result.formatted).toBe('8:00');
    });

    it('should parse "שמונה על הדקה" as 8:00', () => {
      const result = parseSpokenTimeHe('שמונה על הדקה');
      expect(result.formatted).toBe('8:00');
    });

    // 8:01
    it('should parse "שמונה אחת" as 8:01', () => {
      const result = parseSpokenTimeHe('שמונה אחת');
      expect(result.formatted).toBe('8:01');
    });

    // 8:09
    it('should parse "שמונה תשע" as 8:09', () => {
      const result = parseSpokenTimeHe('שמונה תשע');
      expect(result.formatted).toBe('8:09');
    });

    // 8:10
    it('should parse "שמונה עשר" as 8:10', () => {
      const result = parseSpokenTimeHe('שמונה עשר');
      expect(result.formatted).toBe('8:10');
    });

    // 8:11
    it('should parse "שמונה אחת עשרה" as 8:11', () => {
      const result = parseSpokenTimeHe('שמונה אחת עשרה');
      expect(result.formatted).toBe('8:11');
    });

    // 8:19
    it('should parse "שמונה תשע עשרה" as 8:19', () => {
      const result = parseSpokenTimeHe('שמונה תשע עשרה');
      expect(result.formatted).toBe('8:19');
    });

    // 8:20
    it('should parse "שמונה עשרים" as 8:20', () => {
      const result = parseSpokenTimeHe('שמונה עשרים');
      expect(result.formatted).toBe('8:20');
    });

    // 8:21
    it('should parse "שמונה עשרים ואחת" as 8:21', () => {
      const result = parseSpokenTimeHe('שמונה עשרים ואחת');
      expect(result.formatted).toBe('8:21');
    });

    // 8:29
    it('should parse "שמונה עשרים ותשע" as 8:29', () => {
      const result = parseSpokenTimeHe('שמונה עשרים ותשע');
      expect(result.formatted).toBe('8:29');
    });

    // 8:30
    it('should parse "שמונה שלושים" as 8:30', () => {
      const result = parseSpokenTimeHe('שמונה שלושים');
      expect(result.formatted).toBe('8:30');
    });

    // 8:31
    it('should parse "שמונה שלושים ואחת" as 8:31', () => {
      const result = parseSpokenTimeHe('שמונה שלושים ואחת');
      expect(result.formatted).toBe('8:31');
    });

    // 8:39
    it('should parse "שמונה שלושים ותשע" as 8:39', () => {
      const result = parseSpokenTimeHe('שמונה שלושים ותשע');
      expect(result.formatted).toBe('8:39');
    });

    // 8:40
    it('should parse "שמונה ארבעים" as 8:40', () => {
      const result = parseSpokenTimeHe('שמונה ארבעים');
      expect(result.formatted).toBe('8:40');
    });

    // 8:41
    it('should parse "שמונה ארבעים ואחת" as 8:41', () => {
      const result = parseSpokenTimeHe('שמונה ארבעים ואחת');
      expect(result.formatted).toBe('8:41');
    });

    // 8:49
    it('should parse "שמונה ארבעים ותשע" as 8:49', () => {
      const result = parseSpokenTimeHe('שמונה ארבעים ותשע');
      expect(result.formatted).toBe('8:49');
    });

    // 8:50
    it('should parse "שמונה חמישים" as 8:50', () => {
      const result = parseSpokenTimeHe('שמונה חמישים');
      expect(result.formatted).toBe('8:50');
    });

    // 8:51
    it('should parse "שמונה חמישים ואחת" as 8:51', () => {
      const result = parseSpokenTimeHe('שמונה חמישים ואחת');
      expect(result.formatted).toBe('8:51');
    });

    // 8:58
    it('should parse "שמונה חמישים ושמונה" as 8:58', () => {
      const result = parseSpokenTimeHe('שמונה חמישים ושמונה');
      expect(result.formatted).toBe('8:58');
    });

    // 8:59
    it('should parse "שמונה חמישים ותשע" as 8:59', () => {
      const result = parseSpokenTimeHe('שמונה חמישים ותשע');
      expect(result.formatted).toBe('8:59');
    });
  });

  describe('parseSpokenTimeHe - Different hours', () => {
    it('should parse "אחת עשרים וחמש" as 1:25', () => {
      const result = parseSpokenTimeHe('אחת עשרים וחמש');
      expect(result.formatted).toBe('1:25');
    });

    it('should parse "שתים עשרה ארבעים וחמש" as 12:45', () => {
      const result = parseSpokenTimeHe('שתים עשרה ארבעים וחמש');
      expect(result.formatted).toBe('12:45');
    });

    it('should parse "עשר חמש עשרה" as 10:15', () => {
      const result = parseSpokenTimeHe('עשר חמש עשרה');
      expect(result.formatted).toBe('10:15');
    });
  });

  describe('parseSpokenTimeHe - Validation', () => {
    it('should return needsClarification for invalid minutes (60+)', () => {
      // This shouldn't happen with our number system, but test validation
      const result = parseSpokenTimeHe('שמונה שישים');
      expect(result.needsClarification).toBe(true);
    });

    it('should return needsClarification when no hour found', () => {
      const result = parseSpokenTimeHe('רק טקסט בלי מספרים');
      expect(result.needsClarification).toBe(true);
    });
  });

  describe('convertSpokenHebrewTime - High-level API', () => {
    it('should return success=true with valid time', () => {
      const result = convertSpokenHebrewTime('שמונה חמישים ותשע');
      expect(result.success).toBe(true);
      expect(result.time).toBe('8:59');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(59);
    });

    it('should return success=false with needsClarification for invalid input', () => {
      const result = convertSpokenHebrewTime('blah blah');
      expect(result.success).toBe(false);
      expect(result.needsClarification).toBe(true);
    });
  });

  describe('parseSpokenTimeHe - Separated ו', () => {
    it('should handle separated ו ("שמונה חמישים ו תשע")', () => {
      const result = parseSpokenTimeHe('שמונה חמישים ו תשע');
      expect(result.formatted).toBe('8:59');
    });
  });
});
