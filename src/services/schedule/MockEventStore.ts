import { addDays, addMinutes, isValid, startOfWeek, setHours } from 'date-fns';
import type { EventStore } from '@/services/schedule/EventStore';
import type { ScheduleEvent } from '@/types/schedule';
import {
  ACTIVITY_CATEGORIES,
  DISPLAY_END_HOUR,
  DISPLAY_START_HOUR,
  TIME_SLOT_MINUTES,
  WEEK_STARTS_ON,
} from '@/constants/schedule';

const STORAGE_KEY = 'weeply:scheduleEvents:v1';

const toSafeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
};

const ScheduleEventLike = (raw: unknown): raw is ScheduleEvent => {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;

  const id = r.id;
  const title = r.title;
  const category = r.category;
  const startAtMs = toSafeNumber(r.startAtMs);
  const durationMinutes = toSafeNumber(r.durationMinutes);

  if (typeof id !== 'string' || id.length === 0) return false;
  if (typeof title !== 'string' || title.length === 0) return false;
  if (typeof category !== 'string') return false;
  if (!startAtMs || !durationMinutes) return false;
  if (!isValid(new Date(startAtMs))) return false;

  const categoryKeys = new Set<ScheduleEvent['category']>(ACTIVITY_CATEGORIES.map((c) => c.key));
  if (!categoryKeys.has(category as ScheduleEvent['category'])) return false;

  if (durationMinutes <= 0) return false;
  if (durationMinutes % TIME_SLOT_MINUTES !== 0) return false;
  return true;
};

const makeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `evt_${Math.random().toString(16).slice(2)}_${Date.now()}`;
};

const alignToSlot = (date: Date) => {
  const minutes = date.getMinutes();
  const alignedMinutes = Math.floor(minutes / TIME_SLOT_MINUTES) * TIME_SLOT_MINUTES;
  const copy = new Date(date);
  copy.setMinutes(alignedMinutes, 0, 0);
  return copy;
};

const buildSeedEvents = (): ScheduleEvent[] => {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON });

  const mk = (dayOffset: number, hour: number, minute: number, durationMinutes: number, title: string, category: ScheduleEvent['category']): ScheduleEvent => {
    const d = addDays(weekStart, dayOffset);
    const withHour = setHours(d, hour);
    const withMinute = addMinutes(withHour, minute);
    const startAt = alignToSlot(withMinute);

    // Ensure seed stays within display window; if not, just clamp to the window.
    const localStartMinutes = startAt.getHours() * 60 + startAt.getMinutes();
    const minStartMinutes = DISPLAY_START_HOUR * 60;
    const maxEndMinutes = DISPLAY_END_HOUR * 60;
    const duration = Math.max(TIME_SLOT_MINUTES, durationMinutes);
    const durationAligned = Math.floor(duration / TIME_SLOT_MINUTES) * TIME_SLOT_MINUTES;
    const clampedStartMinutes = Math.max(minStartMinutes, Math.min(localStartMinutes, maxEndMinutes - durationAligned));

    const startAtClamped = new Date(startAt);
    startAtClamped.setHours(Math.floor(clampedStartMinutes / 60), clampedStartMinutes % 60, 0, 0);

    return {
      id: makeId(),
      title,
      category,
      startAtMs: startAtClamped.getTime(),
      durationMinutes: durationAligned,
    };
  };

  return [
    mk(0, 9, 0, 120, 'Reuniones y foco', 'work'),
    mk(2, 18, 0, 60, 'Entrenamiento', 'exercise'),
    mk(5, 19, 0, 60, 'Tiempo personal', 'leisure'),
    mk(6, 10, 30, 90, 'Ocio liviano', 'leisure'),
  ];
};

export class MockEventStore implements EventStore {
  async getAllEvents(): Promise<ScheduleEvent[]> {
    if (typeof window === 'undefined') return [];

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = buildSeedEvents();
      await this.setAllEvents(seed);
      return seed;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(ScheduleEventLike);
    } catch {
      return [];
    }
  }

  async setAllEvents(events: ScheduleEvent[]): Promise<void> {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }
}

