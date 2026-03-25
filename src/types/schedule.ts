export type ActivityCategoryKey = 'work' | 'exercise' | 'leisure';

export interface ScheduleEvent {
  id: string;
  title: string;
  category: ActivityCategoryKey;
  /**
   * Start time as an absolute timestamp (ms since epoch).
   * We keep it epoch-based to simplify week navigation and storage.
   */
  startAtMs: number;
  durationMinutes: number;
}

export interface CreateScheduleEventInput {
  title: string;
  category: ActivityCategoryKey;
  /** Start time as epoch ms. */
  startAtMs: number;
  durationMinutes: number;
}

export interface UpdateScheduleEventInput {
  title?: string;
  category?: ActivityCategoryKey;
  durationMinutes?: number;
}

export interface DailyTotals {
  dayIndex: number; // 0..6 within the displayed week
  minutesByCategory: Record<ActivityCategoryKey, number>;
  totalMinutes: number;
}

export interface WeeklyBalance {
  weekStartAtMs: number; // start of week in epoch ms
  daily: DailyTotals[];
  /**
   * Simple score derived from how balanced the distribution of category minutes is.
   * Range: 0..100
   */
  score: number;
  /**
   * A coarse label to show feedback to the user.
   */
  label: 'low' | 'balanced' | 'high';
}

