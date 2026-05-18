import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronRight, ChevronLeft, CheckCircle2, PlusCircle, Trash2, RefreshCw, CalendarCheck, MoveRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDailyLearningSummary, type DailySummaryResult } from '@/lib/api/learningClient';
import { cn } from '@/lib/utils';

function toDateIso(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  colorClass: string;
  testId: string;
}

function StatPill({ icon, label, value, colorClass, testId }: StatPillProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex flex-col items-center gap-1 flex-1 rounded-2xl py-3 px-2',
        colorClass,
      )}
    >
      <div className="text-lg">{icon}</div>
      <span className="text-xl font-bold leading-none">{value}</span>
      <span className="text-[11px] text-center leading-tight opacity-80">{label}</span>
    </div>
  );
}

export function DailyActivitySummaryCard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateIso = toDateIso(selectedDate);

  const today = toDateIso(new Date());
  const isToday = dateIso === today;

  const { data, isLoading, isError } = useQuery<DailySummaryResult | null>({
    queryKey: ['/api/learning/daily-summary', dateIso],
    queryFn: async () => {
      const result = await getDailyLearningSummary(dateIso);
      if (result === null) throw new Error('Failed to load daily summary');
      return result;
    },
    staleTime: 60_000,
  });

  const summary = data?.summary;

  const goBack = () => setSelectedDate(d => subDays(d, 1));
  const goForward = () => {
    if (!isToday) setSelectedDate(d => addDays(d, 1));
  };

  const hebrewDate = format(selectedDate, 'EEEE, d בMMMM', { locale: he });

  return (
    <Card data-testid="daily-activity-summary-card" className="rounded-2xl border border-border card-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-primary" />
            סיכום פעילות יומי
          </CardTitle>
          {isToday && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-today">
              היום
            </Badge>
          )}
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-between mt-1" data-testid="date-navigation">
          <button
            onClick={goForward}
            disabled={isToday}
            aria-label="יום הבא"
            data-testid="button-next-day"
            className={cn(
              'p-1 rounded-full transition-colors',
              isToday
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-secondary',
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-sm text-muted-foreground" data-testid="text-selected-date">
            {hebrewDate}
          </span>

          <button
            onClick={goBack}
            aria-label="יום קודם"
            data-testid="button-prev-day"
            className="p-1 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && (
          <div
            data-testid="loading-summary"
            className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm"
          >
            <RefreshCw className="w-4 h-4 animate-spin" />
            טוען נתונים...
          </div>
        )}

        {isError && (
          <p data-testid="error-summary" className="text-center text-destructive text-sm py-4">
            שגיאה בטעינת הסיכום
          </p>
        )}

        {!isLoading && !isError && summary && (
          <>
            {/* Main stat pills */}
            <div className="flex gap-2" data-testid="stat-pills">
              <StatPill
                icon={<CheckCircle2 className="w-4 h-4 text-success" />}
                label="הושלמו"
                value={summary.completedCount}
                colorClass="bg-success/10"
                testId="stat-completed"
              />
              <StatPill
                icon={<PlusCircle className="w-4 h-4 text-primary" />}
                label="נוצרו"
                value={summary.createdCount}
                colorClass="bg-primary/10"
                testId="stat-created"
              />
              <StatPill
                icon={<MoveRight className="w-4 h-4 text-warning" />}
                label="הוזזו"
                value={summary.rescheduledCount}
                colorClass="bg-warning/10"
                testId="stat-rescheduled"
              />
              <StatPill
                icon={<Trash2 className="w-4 h-4 text-destructive" />}
                label="נמחקו"
                value={summary.deletedCount}
                colorClass="bg-destructive/10"
                testId="stat-deleted"
              />
              <StatPill
                icon={<CalendarCheck className="w-4 h-4 text-purple-500" />}
                label="שיבוצים"
                value={summary.scheduleAppliedCount}
                colorClass="bg-purple-500/10"
                testId="stat-schedule-applied"
              />
            </div>

            {/* Notes (Hebrew insight strings) */}
            {summary.notes.length > 0 && (
              <div className="space-y-1.5" data-testid="summary-notes">
                {summary.notes.map((note, i) => (
                  <div
                    key={i}
                    data-testid={`summary-note-${i}`}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                    {note}
                  </div>
                ))}
              </div>
            )}

            {/* Most moved tasks */}
            {summary.mostMovedTasks.length > 0 && (
              <div data-testid="most-moved-tasks">
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">הוזזו הכי הרבה:</p>
                <div className="space-y-1">
                  {summary.mostMovedTasks.map((t) => (
                    <div
                      key={t.taskId}
                      data-testid={`moved-task-${t.taskId}`}
                      className="flex items-center justify-between text-sm bg-secondary/50 rounded-lg px-3 py-1.5"
                    >
                      <span className="truncate flex-1 ml-2">{t.title}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {t.rescheduleCount}×
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {summary.totalEvents === 0 && (
              <p data-testid="empty-summary" className="text-center text-muted-foreground text-sm py-2">
                לא נמצאה פעילות ליום זה
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
