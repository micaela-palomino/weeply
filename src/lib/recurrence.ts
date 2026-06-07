import { addDays, differenceInWeeks, startOfWeek } from 'date-fns';
import type { ScheduleEvent, WeekDayKey } from '@/types/schedule';
import { WEEK_STARTS_ON } from '@/constants/schedule';

const WEEKDAY_INDEX: Record<WeekDayKey, number> = {
  mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0,
};

export const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export function generateWeekEvents(baseEvent: ScheduleEvent, weekStart: Date): ScheduleEvent[] {
  const weekEnd = addDays(weekStart, 7);
  const { recurrence } = baseEvent;

  if (!recurrence || recurrence.type === 'once') {
    if (baseEvent.startAtMs >= weekStart.getTime() && baseEvent.startAtMs < weekEnd.getTime()) {
      return [baseEvent];
    }
    return [];
  }

  const baseDate = new Date(baseEvent.startAtMs);
  const hours = baseDate.getHours();
  const minutes = baseDate.getMinutes();

  const makeInstance = (dayDate: Date): ScheduleEvent => {
    const d = new Date(dayDate);
    d.setHours(hours, minutes, 0, 0);
    const dateKey = formatDateKey(d);
    return {
      ...baseEvent,
      id: `${baseEvent.id}__${dateKey}`,
      startAtMs: d.getTime(),
      recurrenceId: baseEvent.id,
      isDone: baseEvent.completedDates?.includes(dateKey) ?? false,
    };
  };

  if (recurrence.type === 'daily') {
    return Array.from({ length: 7 }, (_, i) => makeInstance(addDays(weekStart, i)));
  }

  if (recurrence.type === 'weekly') {
    const interval = recurrence.interval ?? 1;
    const targetDayOfWeek = baseDate.getDay();
    const baseWeekStart = startOfWeek(baseDate, { weekStartsOn: WEEK_STARTS_ON });

    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      if (d.getDay() !== targetDayOfWeek) continue;
      const currentWeekStart = startOfWeek(d, { weekStartsOn: WEEK_STARTS_ON });
      const weeksDiff = differenceInWeeks(currentWeekStart, baseWeekStart);
      if (weeksDiff >= 0 && weeksDiff % interval === 0) {
        return [makeInstance(d)];
      }
    }
    return [];
  }

  if (recurrence.type === 'custom') {
    const targetDays = new Set((recurrence.days ?? []).map((d) => WEEKDAY_INDEX[d]));
    const instances: ScheduleEvent[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      if (targetDays.has(d.getDay())) {
        instances.push(makeInstance(d));
      }
    }
    return instances;
  }

  return [];
}
