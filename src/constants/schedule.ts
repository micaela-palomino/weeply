import type { ActivityCategoryKey } from '@/types/schedule';

export const WEEK_STARTS_ON = 1; // Monday

export const DISPLAY_START_HOUR = 7; // 07:00
export const DISPLAY_END_HOUR = 22; // 22:00

export const TIME_SLOT_MINUTES = 30;

export const TIMELINE_SLOT_HEIGHT_PX = 24; // 48px/hour
export const TIMELINE_HOURS_COLUMN_WIDTH_PX = 64;
export const TIMELINE_HEADER_HEIGHT_PX = 52;
export const TIMELINE_HOUR_LABEL_OFFSET_PX = 6;

export const ACTIVITY_CATEGORIES: Array<{
  key: ActivityCategoryKey;
  label: string;
  color: string;
}> = [
  { key: 'work', label: 'Trabajo', color: '#60a5fa' },       // blue-400
  { key: 'exercise', label: 'Ejercicio', color: '#4ade80' }, // green-400
  { key: 'leisure', label: 'Ocio', color: '#ff6eb5' },       // pink principal
  { key: 'university', label: 'Facultad', color: '#a78bfa' }, // violet-400
];

export const DEFAULT_EVENT_DURATION_MINUTES = 60;

export const CATEGORY_COLOR_MAP: Record<ActivityCategoryKey, string> = Object.fromEntries(
  ACTIVITY_CATEGORIES.map((c) => [c.key, c.color]),
) as Record<ActivityCategoryKey, string>;

export const CATEGORY_LABEL_MAP: Record<ActivityCategoryKey, string> = Object.fromEntries(
  ACTIVITY_CATEGORIES.map((c) => [c.key, c.label]),
) as Record<ActivityCategoryKey, string>;

export const TARGET_CATEGORY_SHARE: Record<ActivityCategoryKey, number> = {
  work: 0.30,
  exercise: 0.25,
  leisure: 0.20,
  university: 0.25,
};

// Absolute weekly targets (minutes). Sleep = 8h/day implicit.
export const WEEKLY_TARGETS = {
  exercise: { min: 240, label: '4h' },     // mandatory
  work:     { max: 2400, label: '40h' },   // cap
  university: { max: 1320, label: '22h' }, // cap
  leisure:  { min: 0, label: 'libre' },
} as const;

export const WEEK_SCORE_LABEL_THRESHOLDS = {
  low: 50,
  balanced: 80,
} as const;
