import { useState } from 'react';
import { format } from 'date-fns';
import { Sparkles, X, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Task } from '@/types/task';
import {
  scheduleDayPreview,
  SchedulePreviewResponse,
} from '@/lib/api/plannerClient';

interface Props {
  date: Date;
  tasks: Task[];
}

const priorityLabel: Record<string, string> = {
  high: 'גבוהה',
  medium: 'בינונית',
  low: 'נמוכה',
};

const priorityColor: Record<string, string> = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-green-500',
};

export function PlanMyDayButton({ date, tasks }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SchedulePreviewResponse | null>(null);
  const [approved, setApproved] = useState(false);

  const dateIso = format(date, 'yyyy-MM-dd');

  const handleClick = async () => {
    setError(null);
    setApproved(false);
    setLoading(true);
    try {
      const result = await scheduleDayPreview(dateIso, tasks);
      setPreview(result);
    } catch (e: any) {
      setError('לא הצלחתי לסדר את היום כרגע. נסה שוב.');
      console.warn('[PlanMyDayButton] schedule error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    setApproved(true);
  };

  const handleClose = () => {
    setPreview(null);
    setApproved(false);
    setError(null);
  };

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={handleClick}
          disabled={loading}
          data-testid="button-plan-my-day"
          className="gap-1.5 text-xs h-8 px-3 border-primary/30 text-primary hover:bg-primary/5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {loading ? 'סינקו מסדר לך את היום...' : 'סדר לי את היום'}
        </Button>
        {error && (
          <p className="text-xs text-destructive text-center px-2" data-testid="text-plan-error">
            {error}
          </p>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={open => { if (!open) handleClose(); }}>
        <DialogContent
          className="max-w-md w-full max-h-[80vh] overflow-y-auto"
          dir="rtl"
          data-testid="dialog-plan-preview"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-primary" />
              הצעת הסידור של סינקו
            </DialogTitle>
          </DialogHeader>

          {approved ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center" data-testid="text-plan-approved">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
              <p className="font-medium">מעולה.</p>
              <p className="text-sm text-muted-foreground">
                בשלב הבא נחבר שמירה של הסידור.
              </p>
              <Button size="sm" onClick={handleClose} data-testid="button-plan-close-approved">
                סגור
              </Button>
            </div>
          ) : preview && (
            <div className="flex flex-col gap-4" data-testid="section-plan-body">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-lg text-sm">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">עומס:</span>
                  <span className="font-medium">{preview.summary.dayLoadMinutes} דק׳</span>
                </div>
                <div className="text-left">
                  <span className="text-muted-foreground">שובצו: </span>
                  <span className="font-medium text-green-600">{preview.summary.scheduledCount}</span>
                  <span className="text-muted-foreground"> / {preview.summary.totalTasks}</span>
                </div>
              </div>

              {/* Scheduled tasks */}
              {preview.scheduledTasks.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold">משימות שובצו</h3>
                  {preview.scheduledTasks.map(t => (
                    <div
                      key={t.id}
                      className="flex flex-col gap-0.5 p-2.5 rounded-lg border border-border bg-background"
                      data-testid={`plan-task-${t.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{t.title}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {t.startTime}–{t.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={priorityColor[t.priority] ?? ''}>
                          עדיפות: {priorityLabel[t.priority] ?? t.priority}
                        </span>
                        <span>·</span>
                        <span>{t.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Unscheduled tasks */}
              {preview.unscheduledTasks.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    משימות שלא שובצו
                  </h3>
                  {preview.unscheduledTasks.map(t => (
                    <div
                      key={t.id}
                      className="flex flex-col gap-0.5 p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800"
                      data-testid={`plan-unscheduled-${t.id}`}
                    >
                      <span className="font-medium text-sm">{t.title}</span>
                      <span className="text-xs text-muted-foreground">{t.reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {preview.warnings.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-sm font-semibold text-muted-foreground">דברים שכדאי לשים לב אליהם</h3>
                  {preview.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1">
                      {w}
                    </p>
                  ))}
                </div>
              )}

              {/* No tasks at all */}
              {preview.summary.totalTasks === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-plan-empty">
                  אין משימות פעילות ביום זה לסידור.
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-border">
                <Button
                  className="flex-1"
                  onClick={handleApprove}
                  data-testid="button-plan-approve"
                >
                  נראה טוב
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  data-testid="button-plan-cancel"
                >
                  לא עכשיו
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
