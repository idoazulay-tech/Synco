# MA Temporal Engine v1

מנוע זמנים עברי מלא להבנת ביטויי זמן בשפה טבעית.

## סקירה כללית

המודול `ma_temporal_engine_he_v1` מפענח טקסט עברי חופשי המכיל ביטויי זמן ומחזיר ייצוג מובנה לשיבוץ בלוח זמנים.

## התקנה ושימוש

```typescript
import { parseTemporalHe, suggestScheduleSlots } from './server/layers/temporal';

// פענוח זמן
const result = parseTemporalHe('מחר ב-10 בבוקר', new Date());

// הצעות שיבוץ
const suggestions = suggestScheduleSlots(result, freeBusySlots, 60);
```

## טיפוסי פלט

### TimePoint - נקודת זמן
```json
{
  "type": "timepoint",
  "date": "2025-01-27",
  "time": "10:00",
  "timezone": "Asia/Jerusalem",
  "confidence": 0.95,
  "sourceText": "מחר ב-10 בבוקר"
}
```

### DatePoint - תאריך
```json
{
  "type": "datepoint",
  "date": "2025-01-27",
  "confidence": 0.98,
  "sourceText": "מחר"
}
```

### Duration - משך זמן
```json
{
  "type": "duration",
  "duration_minutes": 120,
  "duration_iso": "PT2H",
  "confidence": 0.98,
  "sourceText": "שעתיים"
}
```

### Interval - טווח זמנים
```json
{
  "type": "interval",
  "start": "2025-01-27T08:00",
  "end": "2025-01-27T10:00",
  "window": "tight",
  "confidence": 0.95,
  "sourceText": "מ-8 עד 10"
}
```

### Recurrence - חזרתיות
```json
{
  "type": "recurrence",
  "pattern": {
    "freq": "weekly",
    "interval": 1,
    "byDay": ["MO"]
  },
  "confidence": 0.95,
  "sourceText": "כל יום שני"
}
```

### Ambiguous - זמן עמום
```json
{
  "type": "ambiguous",
  "hints": {
    "preferredWindows": [{ "label": "ערב", "startHour": 17, "endHour": 22 }],
    "softness": "soft",
    "latest": "2025-01-27T23:59"
  },
  "date": "2025-01-27",
  "confidence": 0.7,
  "sourceText": "סוף היום"
}
```

## דוגמאות קלט/פלט

### 1. שעות מדויקות בעברית מדוברת
```
קלט: "פגישה בשמונה חמישים ותשע"
פלט: { type: "timepoint", time: "08:59" }
```

### 2. רבע וחצי
```
קלט: "עשר ורבע"
פלט: { type: "timepoint", time: "10:15" }

קלט: "רבע לשמונה"
פלט: { type: "timepoint", time: "07:45" }
```

### 3. חלקי יום
```
קלט: "8 בערב"
פלט: { type: "timepoint", time: "20:00" }
```

### 4. תאריכים יחסיים
```
קלט: "מחר ב-14:00"
פלט: { type: "timepoint", date: "2025-01-27", time: "14:00" }
```

### 5. ימי שבוע
```
קלט: "יום שני הבא"
פלט: { type: "datepoint", date: "2025-01-27", weekday: 1 }
```

### 6. משכים
```
קלט: "פגישה של שעתיים"
פלט: { type: "duration", duration_minutes: 120 }
```

### 7. טווחים
```
קלט: "מחר מ-10 עד 12"
פלט: { type: "interval", start: "2025-01-27T10:00", end: "2025-01-27T12:00" }
```

### 8. חזרתיות
```
קלט: "כל יום שני ב-10"
פלט: { type: "recurrence", pattern: { freq: "weekly", byDay: ["MO"] } }
```

### 9. עמימות
```
קלט: "סוף היום"
פלט: { type: "ambiguous", hints: { preferredWindows: [{ label: "ערב" }], softness: "soft" } }
```

### 10. משולב
```
קלט: "בערך מחר בערב"
פלט: { type: "ambiguous", date: "2025-01-27", hints: { softness: "soft" } }
```

## פונקציות מודולריות

| פונקציה | תיאור |
|---------|-------|
| `tokenize(text)` | פיצול טקסט לטוקנים |
| `normalizeTokens(tokens)` | נרמול ו' צמודה ותחיליות |
| `parseNumericTime(text)` | שעה ודקות מדוברת |
| `parseQuarterHalf(text)` | רבע, חצי, חסר רבע |
| `parseDayParts(text)` | בוקר, ערב, צהריים, לילה |
| `parseRelativeDates(text, now)` | היום, מחר, בעוד X |
| `parseWeekdays(text, now)` | ימי שבוע וקיצורים |
| `parseDuration(text)` | משכי זמן |
| `parseIntervals(text, now)` | מ...עד, בין...ל |
| `parseRecurrence(text, now)` | כל יום, כל שבוע |
| `parseAmbiguity(text, now)` | בערך, לקראת, מתישהו |
| `parseTemporalHe(text, now, tz)` | אורקסטרטור ראשי |
| `suggestScheduleSlots(...)` | הצעות שיבוץ ללוז |

## כללי בטיחות

1. **אין ניחוש** - כשחסרים נתונים, מוחזר `needs_clarification: true` עם שאלה ממוקדת
2. **ולידציה** - דקות 0-59, שעות 0-23
3. **עמימות** - ביטויים עמומים מחזירים `hints` במקום שעה ספציפית
4. **אזור זמן** - ברירת מחדל Asia/Jerusalem

## בדיקות

```bash
npx vitest run server/layers/temporal/__tests__/temporalEngine.test.ts
```

120+ בדיקות מכסות:
- קצוות דקות 00-59
- רבע וחצי
- AM/PM לפי חלקי יום
- תאריכים יחסיים
- ימי שבוע
- משכים
- טווחים
- חזרתיות
- עמימות
