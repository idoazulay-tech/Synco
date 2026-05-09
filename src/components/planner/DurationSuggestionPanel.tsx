import { Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DurationSuggestion } from '@/lib/api/plannerClient';

const confidenceLabel: Record<string, string> = {
  high:   'גבוהה',
  medium: 'בינונית',
  low:    'נמוכה',
};

interface Props {
  suggestion: DurationSuggestion;
  mode: 'read_only' | 'draft_editable';
  onUseSuggestion?: () => void;
}

export function DurationSuggestionPanel({ suggestion: s, mode, onUseSuggestion }: Props) {
  return (
    <div
      className="mt-1.5 pt-1.5 border-t border-amber-200 dark:border-amber-800 flex flex-col gap-1"
      data-testid="section-duration-suggestion"
    >
      <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
        <Timer className="w-3 h-3" />
        סינקו למד על משך דומה:
      </p>
      <div className="flex flex-col gap-0.5 text-[11px] text-amber-700 dark:text-amber-300">
        <span>משך נוכחי: <strong>{s.currentDurationMinutes} דק׳</strong></span>
        <span>הצעה: <strong>{s.suggestedDurationMinutes} דק׳</strong></span>
        <span>סיבה: {s.reason}</span>
        <span>
          כמות דוגמאות: {s.sampleSize} · רמת ביטחון:{' '}
          {confidenceLabel[s.confidence] ?? s.confidence}
          {s.confidence === 'low' && (
            <span className="mr-1 opacity-75">(מעט נתונים)</span>
          )}
        </span>
      </div>

      {mode === 'draft_editable' && onUseSuggestion && s.suggestedDurationMinutes >= 1 && (
        <Button
          size="sm"
          variant="outline"
          className="mt-1 h-7 text-[11px] border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20 self-start"
          onClick={onUseSuggestion}
          data-testid="button-use-duration-suggestion"
        >
          השתמש בהצעה
        </Button>
      )}
    </div>
  );
}
