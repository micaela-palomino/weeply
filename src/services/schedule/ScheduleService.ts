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
import { formatDateKey, generateWeekEvents } from '@/lib/recurrence';
import {
  ACTIVITY_CATEGORIES,
  DISPLAY_END_HOUR,
  DISPLAY_START_HOUR,
  TARGET_CATEGORY_SHARE,
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

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && bStart < aEnd;

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

  return { ok: true, data: null };
};

export class ScheduleService {
  constructor(private readonly store: EventStore) {}

  async getWeekWithBalance(weekStartAtMs: number): Promise<{ events: ScheduleEvent[]; balance: WeeklyBalance; allStoredEvents: ScheduleEvent[] }> {
    const all = await this.store.getAllEvents();
    const weekStart = startOfWeek(new Date(weekStartAtMs), { weekStartsOn: WEEK_STARTS_ON });

    const events: ScheduleEvent[] = [];
    for (const e of all) {
      events.push(...generateWeekEvents(e, weekStart));
    }

    const balance = this.calculateWeeklyBalance(weekStart.getTime(), events);
    return { events, balance, allStoredEvents: all };
  }

  async createEvent(input: CreateScheduleEventInput): Promise<ServiceResult<ScheduleEvent>> {
    const parsed = eventInputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Entrada inválida.' };

    const windowCheck = validateEventWindow(parsed.data);
    if (!windowCheck.ok) return { ok: false, error: windowCheck.error };

    const all = await this.store.getAllEvents();

    const sameDayExisting = all.filter(
      (e) => getLocalDayKey(e.startAtMs) === getLocalDayKey(parsed.data.startAtMs),
    );
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
      isImportant: input.isImportant,
      recurrence: input.recurrence,
    };

    await this.store.setAllEvents([...all, event]);
    return { ok: true, data: event };
  }

  async toggleInstanceDone(baseEventId: string, instanceStartAtMs: number, isDone: boolean): Promise<ServiceResult<ScheduleEvent>> {
    const all = await this.store.getAllEvents();
    const base = all.find((e) => e.id === baseEventId);
    if (!base) return { ok: false, error: 'No existe el evento base.' };

    const dateKey = formatDateKey(new Date(instanceStartAtMs));
    const current = base.completedDates ?? [];
    const nextDates = isDone
      ? [...new Set([...current, dateKey])]
      : current.filter((d) => d !== dateKey);

    const updated = { ...base, completedDates: nextDates };
    await this.store.setAllEvents(all.map((e) => (e.id === baseEventId ? updated : e)));
    return { ok: true, data: updated };
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
      startAtMs: input.startAtMs ?? existing.startAtMs,
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
      isImportant: input.isImportant !== undefined ? input.isImportant : existing.isImportant,
      isDone: input.isDone !== undefined ? input.isDone : existing.isDone,
    };

    await this.store.setAllEvents(all.map((e) => (e.id === eventId ? nextEvent : e)));
    return { ok: true, data: nextEvent };
  }

  async findFreeSlots(weekStartAtMs: number, durationMinutes: number, maxResults = 3): Promise<number[]> {
    const { events } = await this.getWeekWithBalance(weekStartAtMs);
    const weekStart = startOfWeek(new Date(weekStartAtMs), { weekStartsOn: WEEK_STARTS_ON });

    const results: number[] = [];

    for (let dayOffset = 0; dayOffset < 7 && results.length < maxResults; dayOffset++) {
      const dayDate = addDays(weekStart, dayOffset);
      const displayStartMs = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), DISPLAY_START_HOUR, 0, 0, 0).getTime();
      const displayEndMs = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), DISPLAY_END_HOUR, 0, 0, 0).getTime();

      const dayKey = getLocalDayKey(displayStartMs);
      const dayEvents = events
        .filter((e) => getLocalDayKey(e.startAtMs) === dayKey)
        .sort((a, b) => a.startAtMs - b.startAtMs);

      let cursor = displayStartMs;
      let found = false;

      for (const ev of dayEvents) {
        if (cursor + durationMinutes * MS_PER_MINUTE <= ev.startAtMs) {
          results.push(cursor);
          found = true;
          break;
        }
        cursor = ev.startAtMs + ev.durationMinutes * MS_PER_MINUTE;
      }

      if (!found && cursor + durationMinutes * MS_PER_MINUTE <= displayEndMs) {
        results.push(cursor);
      }
    }

    return results;
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
        university: 0,
      };

      for (const e of events) {
        const eStart = e.startAtMs;
        const eEnd = getEndAtMs(e);
        const minutes = Math.max(0, Math.min(eEnd, dayEnd) - Math.max(eStart, dayStart)) / MS_PER_MINUTE;
        if (minutes <= 0) continue;
        minutesByCategory[e.category] += Math.round(minutes);
      }

      const totalMinutes = Object.values(minutesByCategory).reduce((acc, v) => acc + v, 0);
      return { dayIndex, minutesByCategory, totalMinutes };
    });

    const totalMinutesWeek = daily.reduce((acc, d) => acc + d.totalMinutes, 0);
    const minutesByCategoryWeek = (Object.keys(TARGET_CATEGORY_SHARE) as ActivityCategoryKey[]).reduce(
      (acc, key) => {
        acc[key] = daily.reduce((s, d) => s + d.minutesByCategory[key], 0);
        return acc;
      },
      {} as Record<ActivityCategoryKey, number>,
    );

    let score = 0;
    if (totalMinutesWeek > 0) {
      const deviations = (Object.keys(TARGET_CATEGORY_SHARE) as ActivityCategoryKey[]).reduce((acc, key) => {
        const ratio = minutesByCategoryWeek[key] / totalMinutesWeek;
        const target = TARGET_CATEGORY_SHARE[key];
        return acc + Math.abs(ratio - target);
      }, 0);
      score = Math.max(0, Math.min(100, Math.round((1 - deviations / 2) * 100)));
    }

    const label: WeeklyBalance['label'] =
      score < WEEK_SCORE_LABEL_THRESHOLDS.low
        ? 'low'
        : score < WEEK_SCORE_LABEL_THRESHOLDS.balanced
          ? 'balanced'
          : 'high';

    return { weekStartAtMs, daily, score, label };
  }

  private makeId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `evt_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
}
