import { addDays, startOfWeek } from 'date-fns';
import { z } from 'zod';
import type { EventStore } from '@/services/schedule/EventStore';
import type {
  ActivityCategoryKey,
  CreateScheduleEventInput,
  ScheduleEvent,
  UpdateScheduleEventInput,
  WeeklyBalance,
} from '@/types/schedule';
import {
  ACTIVITY_CATEGORIES,
  DISPLAY_END_HOUR,
  DISPLAY_START_HOUR,
  TARGET_CATEGORY_SHARE,
  TIME_SLOT_MINUTES,
  WEEK_SCORE_LABEL_THRESHOLDS,
  WEEK_STARTS_ON,
} from '@/constants/schedule';

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

const CATEGORY_KEYS = new Set(ACTIVITY_CATEGORIES.map((c) => c.key));

const MS_PER_MINUTE = 60_000;

const getLocalMinutesSinceMidnight = (ms: number) => {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
};

const getLocalDayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const getEndAtMs = (event: Pick<ScheduleEvent, 'startAtMs' | 'durationMinutes'>) =>
  event.startAtMs + event.durationMinutes * MS_PER_MINUTE;

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

const eventInputSchema = z.object({
  title: z.string().min(1, 'El nombre del evento es requerido.'),
  category: z.custom<ActivityCategoryKey>((v) => CATEGORY_KEYS.has(v as ActivityCategoryKey)),
  startAtMs: z.number().int().finite(),
  durationMinutes: z.number().int().positive(),
});

const validateEventWindow = (input: CreateScheduleEventInput): ServiceResult<unknown> => {
  const startMinutes = getLocalMinutesSinceMidnight(input.startAtMs);
  const endMinutes = startMinutes + input.durationMinutes;

  const minStartMinutes = DISPLAY_START_HOUR * 60;
  const maxEndMinutes = DISPLAY_END_HOUR * 60;

  if (startMinutes < minStartMinutes) return { ok: false, error: 'El evento empieza fuera del rango visual.' };
  if (endMinutes > maxEndMinutes) return { ok: false, error: 'El evento termina fuera del rango visual.' };

  if (startMinutes % TIME_SLOT_MINUTES !== 0) return { ok: false, error: 'El inicio debe alinearse a la grilla.' };
  if (input.durationMinutes % TIME_SLOT_MINUTES !== 0)
    return { ok: false, error: 'La duración debe alinearse a la grilla.' };

  return { ok: true, data: null };
};

export class ScheduleService {
  constructor(private readonly store: EventStore) {}

  async getWeekWithBalance(weekStartAtMs: number): Promise<{ events: ScheduleEvent[]; balance: WeeklyBalance }> {
    const all = await this.store.getAllEvents();

    const weekStart = startOfWeek(new Date(weekStartAtMs), { weekStartsOn: WEEK_STARTS_ON });
    const weekEnd = addDays(weekStart, 7);

    const events = all.filter((e) => overlaps(e.startAtMs, getEndAtMs(e), weekStart.getTime(), weekEnd.getTime()));

    const balance = this.calculateWeeklyBalance(weekStart.getTime(), events);
    return { events, balance };
  }

  async createEvent(input: CreateScheduleEventInput): Promise<ServiceResult<ScheduleEvent>> {
    const parsed = eventInputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Entrada inválida.' };

    const windowCheck = validateEventWindow(parsed.data);
    if (!windowCheck.ok) return { ok: false, error: windowCheck.error };

    const all = await this.store.getAllEvents();

    // Conflict rule (v1): no solapamientos en el mismo día (cualquier categoría).
    const sameDayExisting = all.filter((e) => getLocalDayKey(e.startAtMs) === getLocalDayKey(parsed.data.startAtMs));
    const newEndAt = parsed.data.startAtMs + parsed.data.durationMinutes * MS_PER_MINUTE;
    const hasOverlap = sameDayExisting.some((e) =>
      overlaps(e.startAtMs, getEndAtMs(e), parsed.data.startAtMs, newEndAt),
    );
    if (hasOverlap) return { ok: false, error: 'Ese horario se solapa con otra actividad.' };

    const event: ScheduleEvent = {
      id: this.makeId(),
      title: parsed.data.title,
      category: parsed.data.category,
      startAtMs: parsed.data.startAtMs,
      durationMinutes: parsed.data.durationMinutes,
    };

    await this.store.setAllEvents([...all, event]);
    return { ok: true, data: event };
  }

  async deleteEvent(eventId: string): Promise<ServiceResult<void>> {
    const all = await this.store.getAllEvents();
    const next = all.filter((e) => e.id !== eventId);

    if (next.length === all.length) return { ok: false, error: 'No existe el evento.' };

    await this.store.setAllEvents(next);
    return { ok: true, data: undefined };
  }

  async updateEvent(eventId: string, input: UpdateScheduleEventInput): Promise<ServiceResult<ScheduleEvent>> {
    const all = await this.store.getAllEvents();
    const existing = all.find((e) => e.id === eventId);
    if (!existing) return { ok: false, error: 'No existe el evento.' };

    const merged: CreateScheduleEventInput = {
      title: input.title ?? existing.title,
      category: input.category ?? existing.category,
      startAtMs: existing.startAtMs,
      durationMinutes: input.durationMinutes ?? existing.durationMinutes,
    };

    const parsed = eventInputSchema.safeParse(merged);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Entrada inválida.' };

    const windowCheck = validateEventWindow(parsed.data);
    if (!windowCheck.ok) return { ok: false, error: windowCheck.error };

    const sameDayExisting = all.filter(
      (e) => e.id !== eventId && getLocalDayKey(e.startAtMs) === getLocalDayKey(parsed.data.startAtMs),
    );

    const newEndAt = parsed.data.startAtMs + parsed.data.durationMinutes * MS_PER_MINUTE;
    const hasOverlap = sameDayExisting.some((e) =>
      overlaps(e.startAtMs, getEndAtMs(e), parsed.data.startAtMs, newEndAt),
    );
    if (hasOverlap) return { ok: false, error: 'El nuevo horario se solapa con otra actividad.' };

    const nextEvent: ScheduleEvent = {
      ...existing,
      title: parsed.data.title,
      category: parsed.data.category,
      startAtMs: parsed.data.startAtMs,
      durationMinutes: parsed.data.durationMinutes,
    };

    await this.store.setAllEvents(all.map((e) => (e.id === eventId ? nextEvent : e)));
    return { ok: true, data: nextEvent };
  }

  private calculateWeeklyBalance(weekStartAtMs: number, events: ScheduleEvent[]): WeeklyBalance {
    const weekStart = new Date(weekStartAtMs);
    const daily = Array.from({ length: 7 }).map((_, dayIndex) => {
      const dayStart = addDays(weekStart, dayIndex).getTime();
      const dayEnd = addDays(weekStart, dayIndex + 1).getTime();

      const minutesByCategory: Record<ActivityCategoryKey, number> = {
        work: 0,
        exercise: 0,
        leisure: 0,
      };

      for (const e of events) {
        const eStart = e.startAtMs;
        const eEnd = getEndAtMs(e);
        const minutes = Math.max(0, Math.min(eEnd, dayEnd) - Math.max(eStart, dayStart)) / MS_PER_MINUTE;
        if (minutes <= 0) continue;

        // Events in MVP are grid-aligned, so rounding is safe.
        const alignedMinutes = Math.round(minutes / TIME_SLOT_MINUTES) * TIME_SLOT_MINUTES;
        minutesByCategory[e.category] += alignedMinutes;
      }

      const totalMinutes = Object.values(minutesByCategory).reduce((acc, v) => acc + v, 0);
      return { dayIndex, minutesByCategory, totalMinutes };
    });

    const totalMinutesWeek = daily.reduce((acc, d) => acc + d.totalMinutes, 0);
    const minutesByCategoryWeek: Record<ActivityCategoryKey, number> = {
      work: daily.reduce((acc, d) => acc + d.minutesByCategory.work, 0),
      exercise: daily.reduce((acc, d) => acc + d.minutesByCategory.exercise, 0),
      leisure: daily.reduce((acc, d) => acc + d.minutesByCategory.leisure, 0),
    };

    let score = 0;
    if (totalMinutesWeek > 0) {
      const deviations = (Object.keys(TARGET_CATEGORY_SHARE) as ActivityCategoryKey[]).reduce((acc, key) => {
        const ratio = minutesByCategoryWeek[key] / totalMinutesWeek;
        const target = TARGET_CATEGORY_SHARE[key];
        return acc + Math.abs(ratio - target);
      }, 0);

      // deviations ranges roughly 0..2; normalize to 0..100.
      score = Math.max(0, Math.min(100, Math.round((1 - deviations / 2) * 100)));
    }

    const label: WeeklyBalance['label'] =
      score < WEEK_SCORE_LABEL_THRESHOLDS.low
        ? 'low'
        : score < WEEK_SCORE_LABEL_THRESHOLDS.balanced
          ? 'balanced'
          : 'high';

    return {
      weekStartAtMs,
      daily,
      score,
      label,
    };
  }

  private makeId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `evt_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
}

