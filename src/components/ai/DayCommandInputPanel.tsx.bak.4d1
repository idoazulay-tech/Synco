import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Loader2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Trash2, Copy, RefreshCw, HelpCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  previewDayCommand,
  applyDayCommand,
  type DayCommandPreviewResponse,
  type DayCommandProposedChange,
} from '@/lib/api/plannerClient';

interface Props {
  dateIso: string;
  onApplied?: () => void;
  className?: string;
}

const OPERATION_LABELS: Record<string, string> = {
  create_task:       'יצירה',
  update_task:       'עדכון',
  delete_task:       'מחיקה',
  duplicate_task:    'שכפול',
  reschedule_task:   'שיבוץ מחדש',
  create_recurrence: 'חזרתיות',
  replan_day:        'תכנון יום מחדש',
  split_task:        'פיצול',
  ask_question:      'שאלה',
};

const RISK_COLORS: Record<string, string> = {
  low:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  high:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function OperationCard({
  op,
  selected,
  onToggle,
}: {
  op: DayCommandProposedChange;
  selected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const icon =
    op.type === 'delete_task' ? <Trash2 className="w-4 h-4" /> :
    op.type === 'duplicate_task' ? <Copy className="w-4 h-4" /> :
    op.type === 'create_recurrence' ? <RefreshCw className="w-4 h-4" /> :
    op.type === 'ask_question' ? <HelpCircle className="w-4 h-4" /> :
    <Sparkles className="w-4 h-4" />;

  return (
    <Card
      className={cn(
        'p-3 cursor-pointer border-2 transition-colors',
        selected ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-transparent',
        op.requiresExplicitConfirm && 'border-orange-300 dark:border-orange-700'
      )}
      onClick={onToggle}
      data-testid={`day-command-op-${op.operationId}`}
    >
      <div className="flex items-start gap-2">
        <div className={cn('mt-0.5 p-1 rounded', RISK_COLORS[op.riskLevel] ?? RISK_COLORS.low)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{OPERATION_LABELS[op.type] ?? op.type}</Badge>
            {op.title && <span className="text-sm font-medium truncate">{op.title}</span>}
            {op.requiresExplicitConfirm && (
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-xs">
                דרוש אישור
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{op.reason}</p>

          {(op.before || op.after || op.recurrence) && (
            <button
              className="text-xs text-blue-500 mt-1 flex items-center gap-1"
              onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
              data-testid={`day-command-op-expand-${op.operationId}`}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'הסתר פרטים' : 'הצג פרטים'}
            </button>
          )}

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-2 text-xs space-y-1"
              >
                {op.before && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded p-2">
                    <span className="font-medium text-red-700 dark:text-red-300">לפני: </span>
                    <span className="text-muted-foreground">{JSON.stringify(op.before, null, 2)}</span>
                  </div>
                )}
                {op.after && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
                    <span className="font-medium text-green-700 dark:text-green-300">אחרי: </span>
                    <span className="text-muted-foreground">{JSON.stringify(op.after, null, 2)}</span>
                  </div>
                )}
                {op.recurrence && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-2">
                    <span className="font-medium text-purple-700 dark:text-purple-300">חזרתיות: </span>
                    <span className="text-muted-foreground">{JSON.stringify(op.recurrence, null, 2)}</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={cn(
          'w-5 h-5 rounded border-2 flex-shrink-0 mt-1 flex items-center justify-center',
          selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
        )}>
          {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
        </div>
      </div>
    </Card>
  );
}

export function DayCommandInputPanel({ dateIso, onApplied, className }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<DayCommandPreviewResponse | null>(null);
  const [selectedOps, setSelectedOps] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handlePreview = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setPreview(null);
    setSelectedOps(new Set());

    try {
      const result = await previewDayCommand({
        dateIso,
        text: trimmed,
        nowIso: new Date().toISOString(),
      });
      setPreview(result);

      if (result.ok && result.proposedChanges) {
        const autoSelect = new Set<string>(
          result.proposedChanges
            .filter(op => !op.requiresExplicitConfirm)
            .map(op => op.operationId)
        );
        setSelectedOps(autoSelect);
      }
    } catch (err) {
      toast({ title: 'שגיאה', description: 'לא ניתן לנתח את הפקודה. נסה שוב.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [text, dateIso, toast]);

  const toggleOp = useCallback((opId: string) => {
    setSelectedOps(prev => {
      const next = new Set(prev);
      if (next.has(opId)) next.delete(opId);
      else next.add(opId);
      return next;
    });
  }, []);

  const handleApply = useCallback(async () => {
    if (!preview?.proposedChanges) return;
    const ops = preview.proposedChanges.filter(op => selectedOps.has(op.operationId));
    if (ops.length === 0) {
      toast({ title: 'לא נבחרו פעולות', description: 'בחר לפחות פעולה אחת לביצוע.' });
      return;
    }

    setApplying(true);
    try {
      const result = await applyDayCommand({ dateIso, operations: ops });
      if (result.ok) {
        toast({
          title: `בוצע בהצלחה`,
          description: `${result.appliedCount ?? ops.length} פעולות בוצעו${result.skipped?.length ? `, ${result.skipped.length} דולגו` : ''}.`,
        });
        setText('');
        setPreview(null);
        setSelectedOps(new Set());
        onApplied?.();
      } else {
        toast({ title: 'שגיאה בביצוע', description: result.error ?? 'נסה שוב.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'שגיאת רשת', description: 'לא ניתן לשמור. נסה שוב.', variant: 'destructive' });
    } finally {
      setApplying(false);
    }
  }, [preview, selectedOps, dateIso, onApplied, toast]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handlePreview();
    }
  }, [handlePreview]);

  const hasPreview = !!preview;
  const hasClarification = preview?.needsClarification;
  const hasChanges = !!preview?.proposedChanges?.length;
  const selectedCount = selectedOps.size;

  return (
    <div className={cn('flex flex-col gap-3', className)} dir="rtl">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
        <span className="text-sm font-medium text-foreground">פקודת יום חופשית</span>
        {hasPreview && (
          <button
            onClick={() => { setPreview(null); setSelectedOps(new Set()); }}
            className="mr-auto text-muted-foreground hover:text-foreground"
            data-testid="day-command-clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <Textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="לדוגמה: נכנסה לי משימה חשובה ב-14:00 לשעה, סדר את היום מחדש"
        className="resize-none text-sm min-h-[80px] bg-background"
        disabled={loading || applying}
        data-testid="day-command-input"
        dir="rtl"
      />

      <div className="flex items-center gap-2">
        <Button
          onClick={handlePreview}
          disabled={!text.trim() || loading || applying}
          size="sm"
          className="flex items-center gap-2"
          data-testid="day-command-preview-btn"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          נתח פקודה
        </Button>
        <span className="text-xs text-muted-foreground">Ctrl+Enter לניתוח</span>
      </div>

      <AnimatePresence>
        {hasPreview && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-3"
          >
            {/* Warnings / Assumptions */}
            {(preview.warnings?.length > 0 || preview.assumptions?.length > 0) && (
              <div className="text-xs space-y-1">
                {preview.warnings?.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
                {preview.assumptions?.map((a, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-muted-foreground">
                    <span className="text-xs font-medium">הנחה:</span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Clarification questions */}
            {hasClarification && preview.questions && preview.questions.length > 0 && (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-3 space-y-2">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  נדרש הבהרה:
                </p>
                {preview.questions.map((q, i) => (
                  <p key={i} className="text-sm text-yellow-700 dark:text-yellow-400 flex items-start gap-1">
                    <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {q}
                  </p>
                ))}
              </div>
            )}

            {/* AI not enabled */}
            {!preview.ok && preview.reason && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-3">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {preview.reason === 'ai_disabled'
                    ? 'AI כבוי. הפעל SYNCO_AI_ENABLED=true ו-SYNCO_AI_DAY_COMMAND_ENABLED=true.'
                    : preview.message ?? 'לא ניתן לנתח את הפקודה.'}
                </p>
              </div>
            )}

            {/* Proposed changes */}
            {hasChanges && preview.proposedChanges && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    שינויים מוצעים ({preview.proposedChanges.length})
                  </p>
                  <button
                    onClick={() => {
                      const all = new Set(preview.proposedChanges!.map(o => o.operationId));
                      setSelectedOps(selectedCount === all.size ? new Set() : all);
                    }}
                    className="text-xs text-blue-500 hover:underline"
                    data-testid="day-command-select-all"
                  >
                    {selectedCount === preview.proposedChanges.length ? 'בטל הכל' : 'בחר הכל'}
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {preview.proposedChanges.map(op => (
                    <OperationCard
                      key={op.operationId}
                      op={op}
                      selected={selectedOps.has(op.operationId)}
                      onToggle={() => toggleOp(op.operationId)}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={handleApply}
                    disabled={selectedCount === 0 || applying}
                    size="sm"
                    className="flex items-center gap-2"
                    data-testid="day-command-apply-btn"
                  >
                    {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {applying ? 'מבצע...' : `בצע ${selectedCount > 0 ? `(${selectedCount})` : ''}`}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setPreview(null); setSelectedOps(new Set()); }}
                    data-testid="day-command-cancel-btn"
                  >
                    ביטול
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
