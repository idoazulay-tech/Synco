/**
 * MA Temporal Engine - Comprehensive Test Suite
 * 120+ tests covering all temporal parsing scenarios
 */

import { describe, it, expect, beforeEach, test } from 'vitest';
import { 
  parseTemporalHe, 
  parseNumericTime,
  parseQuarterHalf,
  parseDayParts,
  parseRelativeDates,
  parseWeekdays,
  parseDuration,
  parseIntervals,
  parseRecurrence,
  parseAmbiguity,
  suggestScheduleSlots
} from '../index';
import { format, addDays } from 'date-fns';

const NOW = new Date('2025-01-26T10:00:00');

describe('MA Temporal Engine v1', () => {
  
  describe('A) Spoken Time - Minutes 00-59', () => {
    
    test('00 - שמונה אפס אפס', () => {
      const result = parseNumericTime('שמונה אפס אפס');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(0);
      expect(result.formatted).toBe('8:00');
    });

    test('00 - שמונה בדיוק', () => {
      const result = parseNumericTime('שמונה בדיוק');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(0);
    });

    test('00 - שמונה עגול', () => {
      const result = parseNumericTime('שמונה עגול');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(0);
    });

    test('01 - שמונה אחת', () => {
      const result = parseNumericTime('שמונה אחת');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(1);
      expect(result.formatted).toBe('8:01');
    });

    test('02 - שמונה שתיים', () => {
      const result = parseNumericTime('שמונה שתיים');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(2);
    });

    test('03 - שתיים ושלוש (hour:minute)', () => {
      const result = parseNumericTime('שתיים שלוש');
      expect(result.hour).toBe(2);
      expect(result.minute).toBe(3);
      expect(result.formatted).toBe('2:03');
    });

    test('05 - שמונה חמש', () => {
      const result = parseNumericTime('שמונה חמש');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(5);
    });

    test('09 - שמונה תשע', () => {
      const result = parseNumericTime('שמונה תשע');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(9);
      expect(result.formatted).toBe('8:09');
    });

    test('10 - שמונה עשר', () => {
      const result = parseNumericTime('שמונה עשר');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(10);
      expect(result.formatted).toBe('8:10');
    });

    test('11 - שמונה אחת עשרה', () => {
      const result = parseNumericTime('שמונה אחת עשרה');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(11);
      expect(result.formatted).toBe('8:11');
    });

    test('15 - שמונה חמש עשרה', () => {
      const result = parseNumericTime('שמונה חמש עשרה');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(15);
    });

    test('19 - שמונה תשע עשרה', () => {
      const result = parseNumericTime('שמונה תשע עשרה');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(19);
      expect(result.formatted).toBe('8:19');
    });

    test('20 - שמונה עשרים', () => {
      const result = parseNumericTime('שמונה עשרים');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(20);
      expect(result.formatted).toBe('8:20');
    });

    test('21 - שמונה עשרים ואחת', () => {
      const result = parseNumericTime('שמונה עשרים ואחת');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(21);
      expect(result.formatted).toBe('8:21');
    });

    test('25 - שמונה עשרים וחמש', () => {
      const result = parseNumericTime('שמונה עשרים וחמש');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(25);
    });

    test('29 - שמונה עשרים ותשע', () => {
      const result = parseNumericTime('שמונה עשרים ותשע');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(29);
      expect(result.formatted).toBe('8:29');
    });

    test('30 - שמונה שלושים', () => {
      const result = parseNumericTime('שמונה שלושים');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(30);
      expect(result.formatted).toBe('8:30');
    });

    test('31 - שמונה שלושים ואחת', () => {
      const result = parseNumericTime('שמונה שלושים ואחת');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(31);
    });

    test('39 - שמונה שלושים ותשע', () => {
      const result = parseNumericTime('שמונה שלושים ותשע');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(39);
      expect(result.formatted).toBe('8:39');
    });

    test('40 - שמונה ארבעים', () => {
      const result = parseNumericTime('שמונה ארבעים');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(40);
      expect(result.formatted).toBe('8:40');
    });

    test('41 - שמונה ארבעים ואחת', () => {
      const result = parseNumericTime('שמונה ארבעים ואחת');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(41);
    });

    test('49 - שמונה ארבעים ותשע', () => {
      const result = parseNumericTime('שמונה ארבעים ותשע');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(49);
      expect(result.formatted).toBe('8:49');
    });

    test('50 - שמונה חמישים', () => {
      const result = parseNumericTime('שמונה חמישים');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(50);
      expect(result.formatted).toBe('8:50');
    });

    test('51 - שמונה חמישים ואחת', () => {
      const result = parseNumericTime('שמונה חמישים ואחת');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(51);
    });

    test('55 - שמונה חמישים וחמש', () => {
      const result = parseNumericTime('שמונה חמישים וחמש');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(55);
    });

    test('58 - שמונה חמישים ושמונה', () => {
      const result = parseNumericTime('שמונה חמישים ושמונה');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(58);
      expect(result.formatted).toBe('8:58');
    });

    test('59 - שמונה חמישים ותשע', () => {
      const result = parseNumericTime('שמונה חמישים ותשע');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(59);
      expect(result.formatted).toBe('8:59');
    });

    test('Different hours - שתים עשרה שלושים', () => {
      const result = parseNumericTime('שתים עשרה שלושים');
      expect(result.hour).toBe(12);
      expect(result.minute).toBe(30);
    });

    test('With context - פגישה בשמונה חמישים', () => {
      const result = parseNumericTime('פגישה שמונה חמישים');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(50);
    });
  });

  describe('B) Quarter and Half', () => {
    
    test('עשר ורבע => 10:15', () => {
      const result = parseQuarterHalf('עשר ורבע');
      expect(result?.hour).toBe(10);
      expect(result?.minute).toBe(15);
    });

    test('עשר וחצי => 10:30', () => {
      const result = parseQuarterHalf('עשר וחצי');
      expect(result?.hour).toBe(10);
      expect(result?.minute).toBe(30);
    });

    test('רבע לשמונה => 7:45', () => {
      const result = parseQuarterHalf('רבע לשמונה');
      expect(result?.hour).toBe(7);
      expect(result?.minute).toBe(45);
    });

    test('שלוש חסר רבע => 2:45', () => {
      const result = parseQuarterHalf('שלוש חסר רבע');
      expect(result?.hour).toBe(2);
      expect(result?.minute).toBe(45);
    });

    test('רבע לאחת => 12:45', () => {
      const result = parseQuarterHalf('רבע לאחת');
      expect(result?.hour).toBe(12);
      expect(result?.minute).toBe(45);
    });

    test('שבע וחצי => 7:30', () => {
      const result = parseQuarterHalf('שבע וחצי');
      expect(result?.hour).toBe(7);
      expect(result?.minute).toBe(30);
    });

    test('חמש ורבע => 5:15', () => {
      const result = parseQuarterHalf('חמש ורבע');
      expect(result?.hour).toBe(5);
      expect(result?.minute).toBe(15);
    });

    test('שתים עשרה וחצי => 12:30', () => {
      const result = parseQuarterHalf('שתים עשרה וחצי');
      expect(result?.hour).toBe(12);
      expect(result?.minute).toBe(30);
    });
  });

  describe('C) Day Parts (AM/PM)', () => {

    test('8 בבוקר => 08:00', () => {
      const result = parseTemporalHe('8 בבוקר', NOW);
      expect(result.type).toBe('timepoint');
      if (result.type === 'timepoint') {
        expect(result.time).toBe('08:00');
      }
    });

    test('8 בערב => 20:00', () => {
      const result = parseTemporalHe('8 בערב', NOW);
      expect(result.type).toBe('timepoint');
      if (result.type === 'timepoint') {
        expect(result.time).toBe('20:00');
      }
    });

    test('1 בצהריים => 13:00', () => {
      const result = parseTemporalHe('1 בצהריים', NOW);
      expect(result.type).toBe('timepoint');
      if (result.type === 'timepoint') {
        expect(result.time).toBe('13:00');
      }
    });

    test('10 בלילה => 22:00', () => {
      const result = parseTemporalHe('10 בלילה', NOW);
      expect(result.type).toBe('timepoint');
      if (result.type === 'timepoint') {
        expect(result.time).toBe('22:00');
      }
    });

    test('3pm => 15:00', () => {
      const result = parseTemporalHe('3pm', NOW);
      expect(result.type).toBe('timepoint');
      if (result.type === 'timepoint') {
        expect(result.time).toBe('15:00');
      }
    });

    test('10am => 10:00', () => {
      const result = parseTemporalHe('10am', NOW);
      expect(result.type).toBe('timepoint');
      if (result.type === 'timepoint') {
        expect(result.time).toBe('10:00');
      }
    });

    test('5 אחה"צ => 17:00', () => {
      const result = parseTemporalHe('5 אחה"צ', NOW);
      expect(result.type).toBe('timepoint');
      if (result.type === 'timepoint') {
        expect(result.time).toBe('17:00');
      }
    });

    test('Ambiguous hour without context asks for clarification', () => {
      const result = parseTemporalHe('ב-8', NOW);
      expect(result.type).toBe('timepoint');
      if (result.type === 'timepoint') {
        expect(result.needs_clarification).toBe(true);
      }
    });
  });

  describe('D) Relative Dates', () => {

    test('היום', () => {
      const result = parseRelativeDates('היום', NOW);
      expect(result?.date).toBe('2025-01-26');
      expect(result?.daysOffset).toBe(0);
    });

    test('מחר', () => {
      const result = parseRelativeDates('מחר', NOW);
      expect(result?.date).toBe('2025-01-27');
      expect(result?.daysOffset).toBe(1);
    });

    test('מחרתיים', () => {
      const result = parseRelativeDates('מחרתיים', NOW);
      expect(result).not.toBeNull();
      expect(result?.daysOffset).toBe(2);
    });

    test('אתמול', () => {
      const result = parseRelativeDates('אתמול', NOW);
      expect(result?.date).toBe('2025-01-25');
      expect(result?.daysOffset).toBe(-1);
    });

    test('שלשום', () => {
      const result = parseRelativeDates('שלשום', NOW);
      expect(result?.date).toBe('2025-01-24');
      expect(result?.daysOffset).toBe(-2);
    });

    test('בעוד 3 ימים', () => {
      const result = parseRelativeDates('בעוד 3 ימים', NOW);
      expect(result?.date).toBe('2025-01-29');
    });

    test('תוך שבוע', () => {
      const result = parseRelativeDates('תוך שבוע', NOW);
      expect(result).not.toBeNull();
      expect(result?.daysOffset).toBe(7);
    });

    test('בעוד שבועיים', () => {
      const result = parseRelativeDates('בעוד שבועיים', NOW);
      expect(result).not.toBeNull();
    });

    test('עוד 5 דקות', () => {
      const result = parseRelativeDates('עוד 5 דקות', NOW);
      expect(result).not.toBeNull();
    });
  });

  describe('E) Weekdays', () => {

    test('יום ראשון', () => {
      const result = parseWeekdays('יום ראשון', NOW);
      expect(result?.weekday).toBe(0);
      expect(result?.weekdayName).toBe('ראשון');
    });

    test('יום שני', () => {
      const result = parseWeekdays('יום שני', NOW);
      expect(result?.weekday).toBe(1);
    });

    test('יום שלישי', () => {
      const result = parseWeekdays('יום שלישי', NOW);
      expect(result?.weekday).toBe(2);
    });

    test('יום רביעי', () => {
      const result = parseWeekdays('יום רביעי', NOW);
      expect(result?.weekday).toBe(3);
    });

    test('יום חמישי', () => {
      const result = parseWeekdays('יום חמישי', NOW);
      expect(result?.weekday).toBe(4);
    });

    test('יום שישי', () => {
      const result = parseWeekdays('יום שישי', NOW);
      expect(result?.weekday).toBe(5);
    });

    test('שבת', () => {
      const result = parseWeekdays('שבת', NOW);
      expect(result?.weekday).toBe(6);
    });

    test('שני הקרוב', () => {
      const result = parseWeekdays('שני הקרוב', NOW);
      expect(result).not.toBeNull();
    });

    test('שני הבא', () => {
      const result = parseWeekdays('שני הבא', NOW);
      expect(result).not.toBeNull();
    });

    test("יום א'", () => {
      const result = parseWeekdays("יום א'", NOW);
      expect(result?.weekday).toBe(0);
    });

    test("יום ב'", () => {
      const result = parseWeekdays("יום ב'", NOW);
      expect(result?.weekday).toBe(1);
    });
  });

  describe('F) Durations', () => {

    test('דקה', () => {
      const result = parseDuration('דקה');
      expect(result?.duration_minutes).toBe(1);
    });

    test('5 דקות', () => {
      const result = parseDuration('5 דקות');
      expect(result?.duration_minutes).toBe(5);
    });

    test('10 דקות', () => {
      const result = parseDuration('10 דקות');
      expect(result?.duration_minutes).toBe(10);
    });

    test('רבע שעה', () => {
      const result = parseDuration('רבע שעה');
      expect(result?.duration_minutes).toBe(15);
      expect(result?.duration_iso).toBe('PT15M');
    });

    test('חצי שעה', () => {
      const result = parseDuration('חצי שעה');
      expect(result?.duration_minutes).toBe(30);
      expect(result?.duration_iso).toBe('PT30M');
    });

    test('שעה', () => {
      const result = parseDuration('שעה');
      expect(result?.duration_minutes).toBe(60);
    });

    test('שעתיים', () => {
      const result = parseDuration('שעתיים');
      expect(result?.duration_minutes).toBe(120);
      expect(result?.duration_iso).toBe('PT2H');
    });

    test('3 שעות', () => {
      const result = parseDuration('3 שעות');
      expect(result?.duration_minutes).toBe(180);
    });

    test('יום', () => {
      const result = parseDuration('יום');
      expect(result?.duration_minutes).toBe(1440);
    });

    test('יומיים', () => {
      const result = parseDuration('יומיים');
      expect(result?.duration_minutes).toBe(2880);
    });

    test('3 ימים', () => {
      const result = parseDuration('3 ימים');
      expect(result?.duration_minutes).toBe(4320);
    });

    test('שבוע', () => {
      const result = parseDuration('שבוע');
      expect(result?.duration_minutes).toBe(10080);
    });

    test('שבועיים', () => {
      const result = parseDuration('שבועיים');
      expect(result?.duration_minutes).toBe(20160);
    });

    test('חודש', () => {
      const result = parseDuration('חודש');
      expect(result?.duration_minutes).toBe(43200);
    });

    test('חודשיים', () => {
      const result = parseDuration('חודשיים');
      expect(result?.duration_minutes).toBe(86400);
    });
  });

  describe('G) Intervals/Ranges', () => {

    test('מ-8 עד 10', () => {
      const result = parseIntervals('מ-8 עד 10', NOW);
      expect(result?.type).toBe('interval');
      expect(result?.start).toContain('08:00');
      expect(result?.end).toContain('10:00');
    });

    test('בין 16 ל-18', () => {
      const result = parseIntervals('בין 16 ל-18', NOW);
      expect(result?.type).toBe('interval');
      expect(result?.start).toContain('16:00');
      expect(result?.end).toContain('18:00');
    });

    test('מחר מ-8 עד 10', () => {
      const result = parseIntervals('מחר מ-8 עד 10', NOW);
      expect(result?.type).toBe('interval');
      expect(result?.start).toContain('2025-01-27');
    });

    test('מ-9:30 עד 11:00', () => {
      const result = parseIntervals('מ-9:30 עד 11:00', NOW);
      expect(result?.type).toBe('interval');
      expect(result?.start).toContain('09:30');
      expect(result?.end).toContain('11:00');
    });

    test('בין 14 ל 16', () => {
      const result = parseIntervals('בין 14 ל 16', NOW);
      expect(result?.type).toBe('interval');
    });
  });

  describe('H) Recurrence', () => {

    test('כל יום', () => {
      const result = parseRecurrence('כל יום', NOW);
      expect(result?.pattern.freq).toBe('daily');
      expect(result?.pattern.interval).toBe(1);
    });

    test('כל יומיים', () => {
      const result = parseRecurrence('כל יומיים', NOW);
      expect(result?.pattern.freq).toBe('daily');
      expect(result?.pattern.interval).toBe(2);
    });

    test('כל שבוע', () => {
      const result = parseRecurrence('כל שבוע', NOW);
      expect(result?.pattern.freq).toBe('weekly');
    });

    test('כל יום שני', () => {
      const result = parseRecurrence('כל יום שני', NOW);
      expect(result?.pattern.freq).toBe('weekly');
      expect(result?.pattern.byDay).toContain('MO');
    });

    test('כל יום ראשון', () => {
      const result = parseRecurrence('כל יום ראשון', NOW);
      expect(result?.pattern.freq).toBe('weekly');
      expect(result?.pattern.byDay).toContain('SU');
    });

    test('כל חודש ב-5', () => {
      const result = parseRecurrence('כל חודש ב-5', NOW);
      expect(result?.pattern.freq).toBe('monthly');
      expect(result?.pattern.dayOfMonth).toBe(5);
    });

    test('פעמיים בשבוע', () => {
      const result = parseRecurrence('פעמיים בשבוע', NOW);
      expect(result?.pattern.freq).toBe('weekly');
      expect(result?.needs_clarification).toBe(true);
    });

    test('פעם בחודש', () => {
      const result = parseRecurrence('פעם בחודש', NOW);
      expect(result?.pattern.freq).toBe('monthly');
    });

    test('שבועי', () => {
      const result = parseRecurrence('שבועי', NOW);
      expect(result?.pattern.freq).toBe('weekly');
    });

    test('יומי', () => {
      const result = parseRecurrence('יומי', NOW);
      expect(result?.pattern.freq).toBe('daily');
    });
  });

  describe('I) Ambiguity', () => {

    test('בערך', () => {
      const result = parseAmbiguity('בערך שמונה', NOW);
      expect(result?.type).toBe('ambiguous');
      expect(result?.hints.softness).toBe('soft');
    });

    test('לקראת', () => {
      const result = parseAmbiguity('לקראת הערב', NOW);
      expect(result?.type).toBe('ambiguous');
      expect(result?.hints.softness).toBe('soft');
    });

    test('בסביבות', () => {
      const result = parseAmbiguity('בסביבות חמש', NOW);
      expect(result?.type).toBe('ambiguous');
    });

    test('מתישהו', () => {
      const result = parseAmbiguity('מתישהו היום', NOW);
      expect(result?.type).toBe('ambiguous');
    });

    test('כשיהיה זמן', () => {
      const result = parseAmbiguity('כשיהיה זמן', NOW);
      expect(result?.type).toBe('ambiguous');
    });

    test('מאוחר יותר', () => {
      const result = parseAmbiguity('מאוחר יותר', NOW);
      expect(result?.type).toBe('ambiguous');
      expect(result?.hints.preferredWindows).toBeDefined();
    });

    test('בהמשך', () => {
      const result = parseAmbiguity('בהמשך היום', NOW);
      expect(result?.type).toBe('ambiguous');
    });

    test('סוף היום', () => {
      const result = parseAmbiguity('סוף היום', NOW);
      expect(result?.type).toBe('ambiguous');
      expect(result?.hints.preferredWindows?.[0].label).toBe('ערב');
      expect(result?.hints.latest).toBeDefined();
    });

    test('סוף השבוע', () => {
      const result = parseAmbiguity('סוף השבוע', NOW);
      expect(result?.type).toBe('ambiguous');
      expect(result?.hints.preferredWindows?.[0].label).toBe('סוף שבוע');
    });

    test('תחילת השבוע', () => {
      const result = parseAmbiguity('תחילת השבוע', NOW);
      expect(result?.type).toBe('ambiguous');
    });

    test('ASAP', () => {
      const result = parseAmbiguity('צריך לסיים ASAP', NOW);
      expect(result?.type).toBe('ambiguous');
      expect(result?.hints.softness).toBe('hard');
    });

    test('דחוף', () => {
      const result = parseAmbiguity('משימה דחוף', NOW);
      expect(result?.type).toBe('ambiguous');
      expect(result?.hints.softness).toBe('hard');
    });

    test('בהקדם', () => {
      const result = parseAmbiguity('בהקדם האפשרי', NOW);
      expect(result?.type).toBe('ambiguous');
      expect(result?.hints.softness).toBe('hard');
    });
  });

  describe('Integration - parseTemporalHe', () => {

    test('מחר ב-14:00 => TimePoint with date and time', () => {
      const result = parseTemporalHe('מחר ב-14:00', NOW);
      expect(result.type).toBe('timepoint');
      if (result.type === 'timepoint') {
        expect(result.date).toBe('2025-01-27');
        expect(result.time).toBe('14:00');
      }
    });

    test('יום שני בשמונה בבוקר', () => {
      const result = parseTemporalHe('יום שני ב-8 בבוקר', NOW);
      expect(result.type).toBe('timepoint');
      if (result.type === 'timepoint') {
        expect(result.time).toBe('08:00');
      }
    });

    test('מחרתיים ב-3 בערב', () => {
      const result = parseTemporalHe('מחרתיים ב-3 בערב', NOW);
      expect(result.type).toBe('timepoint');
      if (result.type === 'timepoint') {
        expect(result.time).toBe('15:00');
      }
    });

    test('כל יום שני ב-10 בבוקר', () => {
      const result = parseTemporalHe('כל יום שני ב-10 בבוקר', NOW);
      expect(result.type).toBe('recurrence');
    });

    test('בערך מחר בערב בין 7 ל-9', () => {
      const result = parseTemporalHe('בערך מחר בערב בין 7 ל-9', NOW);
      expect(result.type).toBe('ambiguous');
    });

    test('פגישה של שעתיים', () => {
      const result = parseTemporalHe('פגישה של שעתיים', NOW);
      expect(result.type).toBe('duration');
      if (result.type === 'duration') {
        expect(result.duration_minutes).toBe(120);
      }
    });

    test('Digital time 14:30', () => {
      const result = parseTemporalHe('פגישה ב-14:30', NOW);
      expect(result.type).toBe('timepoint');
      if (result.type === 'timepoint') {
        expect(result.time).toBe('14:30');
      }
    });

    test('Complex: מחר מ-10 עד 12', () => {
      const result = parseTemporalHe('מחר מ-10 עד 12', NOW);
      expect(result.type).toBe('interval');
      if (result.type === 'interval') {
        expect(result.start).toContain('2025-01-27');
        expect(result.start).toContain('10:00');
        expect(result.end).toContain('12:00');
      }
    });

    test('No temporal found returns clarification', () => {
      const result = parseTemporalHe('עשה משהו', NOW);
      expect(result.needs_clarification).toBe(true);
    });
  });

  describe('Schedule Suggestions', () => {

    test('suggests slots from free busy', () => {
      const temporal = parseTemporalHe('מחר בבוקר', NOW);
      const freeBusy = [
        { start: '2025-01-27T09:00', end: '2025-01-27T12:00', status: 'free' as const },
        { start: '2025-01-27T12:00', end: '2025-01-27T14:00', status: 'busy' as const },
        { start: '2025-01-27T14:00', end: '2025-01-27T18:00', status: 'free' as const }
      ];
      
      const suggestions = suggestScheduleSlots(temporal, freeBusy, 60);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    test('respects sleep hours', () => {
      const temporal = parseTemporalHe('מחר', NOW);
      const freeBusy = [
        { start: '2025-01-27T02:00', end: '2025-01-27T05:00', status: 'free' as const },
        { start: '2025-01-27T10:00', end: '2025-01-27T12:00', status: 'free' as const }
      ];
      
      const suggestions = suggestScheduleSlots(temporal, freeBusy, 60, {
        sleepStart: 23,
        sleepEnd: 6
      });
      
      const hasNightSlot = suggestions.some(s => s.start.includes('02:'));
      expect(hasNightSlot).toBe(false);
    });

    test('returns max 3 suggestions', () => {
      const temporal = parseTemporalHe('מחר', NOW);
      const freeBusy = [
        { start: '2025-01-27T08:00', end: '2025-01-27T09:00', status: 'free' as const },
        { start: '2025-01-27T10:00', end: '2025-01-27T11:00', status: 'free' as const },
        { start: '2025-01-27T12:00', end: '2025-01-27T13:00', status: 'free' as const },
        { start: '2025-01-27T14:00', end: '2025-01-27T15:00', status: 'free' as const },
        { start: '2025-01-27T16:00', end: '2025-01-27T17:00', status: 'free' as const }
      ];
      
      const suggestions = suggestScheduleSlots(temporal, freeBusy, 30);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Edge Cases', () => {

    test('Empty string', () => {
      const result = parseTemporalHe('', NOW);
      expect(result.needs_clarification).toBe(true);
    });

    test('Just numbers without context', () => {
      const result = parseTemporalHe('123', NOW);
      expect(result.confidence).toBeLessThan(0.8);
    });

    test('Mixed Hebrew and English', () => {
      const result = parseTemporalHe('deadline מחר', NOW);
      expect(result.type).toBe('datepoint');
    });

    test('Multiple temporal expressions - first wins', () => {
      const result = parseTemporalHe('בערך מחר', NOW);
      expect(result.type).toBe('ambiguous');
    });
  });
});
