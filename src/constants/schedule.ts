import type { ActivityCategoryKey } from '@/types/schedule';

export const WEEK_STARTS_ON = 1; // Monday (date-fns: 0=Sunday, 1=Monday)

export const DISPLAY_START_HOUR = 7; // 07:00
export const DISPLAY_END_HOUR = 22; // 22:00

export const TIME_SLOT_MINUTES = 30;

// Timeline UI layout (v1).
export const TIMELINE_SLOT_HEIGHT_PX = 28;
export const TIMELINE_HOURS_COLUMN_WIDTH_PX = 64;
export const TIMELINE_HEADER_HEIGHT_PX = 52;
export const TIMELINE_HOUR_LABEL_OFFSET_PX = 6;

export const ACTIVITY_CATEGORIES: Array<{
  key: ActivityCategoryKey;
  labelKey: string;
  color: string; // CSS color (hex) for timeline blocks
}> = [
  { key: 'work', labelKey: 'work', color: '#2563eb' }, // blue-600
  { key: 'exercise', labelKey: 'exercise', color: '#16a34a' }, // green-600
  { key: 'leisure', labelKey: 'leisure', color: '#f59e0b' }, // amber-500
];

export const DEFAULT_EVENT_DURATION_MINUTES = 60;

export const EVENT_DURATION_OPTIONS_MINUTES = [30, 60, 90, 120, 150, 180] as const;

export const CATEGORY_COLOR_MAP: Record<ActivityCategoryKey, string> = ACTIVITY_CATEGORIES.reduce(
  (acc, c) => {
    acc[c.key] = c.color;
    return acc;
  },
  { work: '#2563eb', exercise: '#16a34a', leisure: '#f59e0b' } satisfies Record<ActivityCategoryKey, string>,
);

/**
 * Distribución objetivo (aprox.) para el score de balance semanal.
 * Expresada como proporciones que suman 1.
 */
export const TARGET_CATEGORY_SHARE: Record<ActivityCategoryKey, number> = {
  work: 0.4,
  exercise: 0.3,
  leisure: 0.3,
};

export const WEEK_SCORE_LABEL_THRESHOLDS = {
  low: 50, // < 50 => 'low'
  balanced: 80, // >= 50 and < 80 => 'balanced'
} as const;

