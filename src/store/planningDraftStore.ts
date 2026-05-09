import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PlanningDraftTask, PlanningDraftTaskPatch } from '@/types/planningDraft';
import { TaskPriority, TaskFlexibility } from '@/types/task';
import { format } from 'date-fns';

function genId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function genSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface PlanningDraftState {
  sessionId: string;
  draftTasks: PlanningDraftTask[];
  createdAt: string;
  updatedAt: string;

  addDraftTasks: (tasks: Array<{
    title: string;
    durationMinutes?: number;
    priority?: TaskPriority;
    flexibility?: TaskFlexibility;
    dateIso?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    location?: string;
    source?: PlanningDraftTask['source'];
    rawInput?: string;
  }>) => void;

  updateDraftTask: (id: string, patch: PlanningDraftTaskPatch) => void;
  removeDraftTask: (id: string) => void;
  clearDraftTasks: () => void;
  resetSession: () => void;
  hasUnconfirmedDrafts: () => boolean;
  markAllForToday: (dateIso: string) => void;
}

export const usePlanningDraftStore = create<PlanningDraftState>()(
  persist(
    (set, get) => ({
      sessionId: genSessionId(),
      draftTasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      addDraftTasks: (tasks) => {
        const now = new Date().toISOString();
        const newDrafts: PlanningDraftTask[] = tasks.map(t => ({
          id: genId(),
          title: t.title,
          durationMinutes: t.durationMinutes ?? 30,
          priority: t.priority ?? 'medium',
          flexibility: t.flexibility ?? 'flexible',
          status: 'draft',
          source: t.source ?? 'ai_parse',
          dateIso: t.dateIso,
          startTime: t.startTime,
          endTime: t.endTime,
          notes: t.notes,
          location: t.location,
          rawInput: t.rawInput,
          createdAt: now,
          updatedAt: now,
        }));
        set(s => ({
          draftTasks: [...s.draftTasks, ...newDrafts],
          updatedAt: now,
        }));
      },

      updateDraftTask: (id, patch) => {
        const now = new Date().toISOString();
        set(s => ({
          draftTasks: s.draftTasks.map(t =>
            t.id === id ? { ...t, ...patch, updatedAt: now } : t
          ),
          updatedAt: now,
        }));
      },

      removeDraftTask: (id) => {
        set(s => ({
          draftTasks: s.draftTasks.filter(t => t.id !== id),
          updatedAt: new Date().toISOString(),
        }));
      },

      clearDraftTasks: () => {
        set({
          draftTasks: [],
          updatedAt: new Date().toISOString(),
        });
      },

      resetSession: () => {
        set({
          sessionId: genSessionId(),
          draftTasks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      },

      hasUnconfirmedDrafts: () => {
        return get().draftTasks.length > 0;
      },

      markAllForToday: (dateIso: string) => {
        const now = new Date().toISOString();
        set(s => ({
          draftTasks: s.draftTasks.map(t =>
            t.dateIso ? t : { ...t, dateIso, updatedAt: now }
          ),
          updatedAt: now,
        }));
      },
    }),
    {
      name: 'synco-planning-drafts',
      partialize: (s) => ({
        sessionId: s.sessionId,
        draftTasks: s.draftTasks,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }),
    }
  )
);
