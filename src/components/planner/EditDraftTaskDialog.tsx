import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlanningDraftTask, PlanningDraftTaskPatch } from '@/types/planningDraft';
import { TaskPriority, TaskFlexibility } from '@/types/task';
import { cn } from '@/lib/utils';

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'דחוף',
  medium: 'רגיל',
  low: 'נמוך',
};
const FLEX_LABELS: Record<TaskFlexibility, string> = {
  fixed: 'נעוץ',
  flexible: 'גמיש',
  anytime: 'חופשי',
};

interface Props {
  draft: PlanningDraftTask;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, patch: PlanningDraftTaskPatch) => void;
}

export function EditDraftTaskDialog({ draft, open, onClose, onSave }: Props) {
  const [title, setTitle]             = useState(draft.title);
  const [description, setDescription] = useState(draft.description ?? '');
  const [dateIso, setDateIso]         = useState(draft.dateIso ?? '');
  const [startTime, setStartTime]     = useState(draft.startTime ?? '');
  const [endTime, setEndTime]         = useState(draft.endTime ?? '');
  const [duration, setDuration]       = useState(draft.durationMinutes);
  const [priority, setPriority]       = useState<TaskPriority>(draft.priority);
  const [flexibility, setFlexibility] = useState<TaskFlexibility>(draft.flexibility);
  const [notes, setNotes]             = useState(draft.notes ?? '');
  const [location, setLocation]       = useState(draft.location ?? '');

  const handleSave = () => {
    if (!title.trim()) return;
    onSave(draft.id, {
      title:          title.trim(),
      description:    description || undefined,
      dateIso:        dateIso || undefined,
      startTime:      startTime || undefined,
      endTime:        endTime || undefined,
      durationMinutes: duration,
      priority,
      flexibility,
      notes:          notes || undefined,
      location:       location || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm w-full" dir="rtl" data-testid="dialog-edit-draft">
        <DialogHeader>
          <DialogTitle className="text-base">עריכת משימה</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">שם המשימה *</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="שם המשימה"
              dir="rtl"
              data-testid="edit-draft-title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">תיאור</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="תיאור (אופציונלי)"
              dir="rtl"
              className="min-h-[60px] text-sm resize-none"
              data-testid="edit-draft-description"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">תאריך</label>
            <Input
              type="date"
              value={dateIso}
              onChange={e => setDateIso(e.target.value)}
              data-testid="edit-draft-date"
            />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">שעת התחלה</label>
              <Input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                data-testid="edit-draft-start-time"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">שעת סיום</label>
              <Input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                data-testid="edit-draft-end-time"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">משך (דקות)</label>
            <Input
              type="number"
              min={5}
              step={5}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              data-testid="edit-draft-duration"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">עדיפות</label>
            <div className="flex gap-1.5">
              {(['high', 'medium', 'low'] as TaskPriority[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    'flex-1 py-1.5 text-xs rounded-md border transition-all',
                    priority === p
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-muted text-muted-foreground hover:border-primary/40'
                  )}
                  data-testid={`edit-draft-priority-${p}`}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Flexibility */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">גמישות</label>
            <div className="flex gap-1.5">
              {(['fixed', 'flexible', 'anytime'] as TaskFlexibility[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFlexibility(f)}
                  className={cn(
                    'flex-1 py-1.5 text-xs rounded-md border transition-all',
                    flexibility === f
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-muted text-muted-foreground hover:border-primary/40'
                  )}
                  data-testid={`edit-draft-flex-${f}`}
                >
                  {FLEX_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">מיקום</label>
            <Input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="מיקום (אופציונלי)"
              dir="rtl"
              data-testid="edit-draft-location"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">הערות</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="הערות (אופציונלי)"
              dir="rtl"
              className="min-h-[50px] text-sm resize-none"
              data-testid="edit-draft-notes"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!title.trim()}
            data-testid="button-save-draft-edit"
          >
            שמור
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            data-testid="button-cancel-draft-edit"
          >
            ביטול
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
