// Entity extraction type definitions

export interface TimeEntity {
  raw: string;
  iso: string;
  hour: number | null;
  minute: number | null;
  confidence: number;
}

export interface DateEntity {
  raw: string;
  iso: string;
  dayOfWeek: string | null;
  relative: 'today' | 'tomorrow' | 'day_after' | 'this_week' | 'next_week' | 'specific' | null;
  confidence: number;
}

export interface DurationEntity {
  raw: string;
  minutes: number;
  confidence: number;
}

export interface PersonEntity {
  raw: string;
  normalized: string;
  confidence: number;
}

export interface LocationEntity {
  raw: string;
  normalized: string;
  locationType: 'home' | 'work' | 'city' | 'venue' | 'phone' | 'other';
  confidence: number;
}

export interface TaskNameEntity {
  raw: string;
  normalized: string;
  verb: string | null;
  object: string | null;
  confidence: number;
}

export interface ExtractedEntityResult {
  time: TimeEntity | null;
  date: DateEntity | null;
  duration: DurationEntity | null;
  people: PersonEntity[];
  location: LocationEntity | null;
  taskName: TaskNameEntity | null;
  urgency: { raw: string; level: 'low' | 'medium' | 'high'; confidence: number } | null;
  must: { raw: string; value: boolean; confidence: number } | null;
}
