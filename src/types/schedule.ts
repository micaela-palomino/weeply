export type ActivityCategoryKey = 'work' | 'exercise' | 'leisure' | 'university';

export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'custom';
export type WeekDayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface RecurrenceRule {
  type: RecurrenceType;
  days?: WeekDayKey[];   // 'custom': specific days of week
  interval?: number;      // 'weekly': every N weeks (default 1)
}

export interface ScheduleEvent {
  id: string;
  title: string;
  category: ActivityCategoryKey;
  startAtMs: number;
  durationMinutes: number;
  notes?: string;
  isImportant?: boolean;
  isDone?: boolean;
  recurrence?: RecurrenceRule;
  completedDates?: string[];  // YYYY-MM-DD — which recurring instances are done
  recurrenceId?: string;      // virtual instances only: ID of the base event
}

export interface CreateScheduleEventInput {
  title: string;
  category: ActivityCategoryKey;
  startAtMs: number;
  durationMinutes: number;
  isImportant?: boolean;
  recurrence?: RecurrenceRule;
}

export interface UpdateScheduleEventInput {
  title?: string;
  category?: ActivityCategoryKey;
  startAtMs?: number;
  durationMinutes?: number;
  isImportant?: boolean;
  isDone?: boolean;
}

export interface DailyTotals {
  dayIndex: number;
  minutesByCategory: Record<ActivityCategoryKey, number>;
  totalMinutes: number;
}

export interface WeeklyBalance {
  weekStartAtMs: number;
  daily: DailyTotals[];
  score: number;
  label: 'low' | 'balanced' | 'high';
}
