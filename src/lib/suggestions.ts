import { addDays, startOfDay, getDay } from 'date-fns';
import type { ScheduleEvent } from '@/types/schedule';

// Tuesday = 2, Thursday = 4 (getDay: 0=Sun…6=Sat)
const BLOCKED_DAYS = new Set([2, 4]);

function totalMinutesOnDay(dayMs: number, events: ScheduleEvent[]): number {
  const dayEnd = dayMs + 86_400_000;
  return events.reduce((sum, e) => {
    if (e.startAtMs >= dayMs && e.startAtMs < dayEnd) return sum + e.durationMinutes;
    return sum;
  }, 0);
}

function firstFreeSlot(
  dayMs: number,
  event: ScheduleEvent,
  allEvents: ScheduleEvent[],
): number | null {
  const durationMs = event.durationMinutes * 60_000;
  const limitMs = dayMs + 22 * 3_600_000 - durationMs; // last start so event ends by 22:00

  for (let t = dayMs + 9 * 3_600_000; t <= limitMs; t += 30 * 60_000) {
    const tEnd = t + durationMs;
    const blocked = allEvents.some(e => {
      if (e.id === event.id) return false;
      return t < e.startAtMs + e.durationMinutes * 60_000 && tEnd > e.startAtMs;
    });
    if (!blocked) return t;
  }
  return null;
}

export function findRescheduleSlots(
  event: ScheduleEvent,
  allEvents: ScheduleEvent[],
  weekEnd: Date,
  max = 3,
): number[] {
  const eventDayStart = startOfDay(new Date(event.startAtMs));
  const candidates: { dayMs: number; load: number }[] = [];

  let day = addDays(eventDayStart, 1);
  while (day < weekEnd) {
    const dow = getDay(day);
    if (!BLOCKED_DAYS.has(dow)) {
      const dayMs = day.getTime();
      candidates.push({ dayMs, load: totalMinutesOnDay(dayMs, allEvents) });
    }
    day = addDays(day, 1);
  }

  // Prefer lighter days — consider week balance
  candidates.sort((a, b) => a.load - b.load);

  const slots: number[] = [];
  for (const { dayMs } of candidates) {
    if (slots.length >= max) break;
    const slot = firstFreeSlot(dayMs, event, allEvents);
    if (slot !== null) slots.push(slot);
  }

  // Return chronologically
  return slots.sort((a, b) => a - b);
}
