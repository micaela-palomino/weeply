'use client';

import * as React from 'react';
import { addDays, addMinutes, differenceInCalendarDays, format, setHours } from 'date-fns';
import type { ScheduleEvent } from '@/types/schedule';
import {
  CATEGORY_COLOR_MAP,
  DISPLAY_END_HOUR,
  DISPLAY_START_HOUR,
  TIME_SLOT_MINUTES,
  TIMELINE_HOURS_COLUMN_WIDTH_PX,
  TIMELINE_HEADER_HEIGHT_PX,
  TIMELINE_SLOT_HEIGHT_PX,
  TIMELINE_HOUR_LABEL_OFFSET_PX,
} from '@/constants/schedule';
import { es } from 'date-fns/locale';

const MS_PER_MINUTE = 60_000;

const getLocalMinutesSinceMidnight = (ms: number) => {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
};

const getEndAtMs = (e: ScheduleEvent) => e.startAtMs + e.durationMinutes * MS_PER_MINUTE;

export type CalendarTimelineProps = {
  weekStartAtMs: number;
  events: ScheduleEvent[];
  onSlotClick: (startAtMs: number) => void;
  onEventClick: (event: ScheduleEvent) => void;
};

export const CalendarTimeline = ({ weekStartAtMs, events, onSlotClick, onEventClick }: CalendarTimelineProps) => {
  const weekStart = React.useMemo(() => new Date(weekStartAtMs), [weekStartAtMs]);

  const slotCount = React.useMemo(
    () => ((DISPLAY_END_HOUR - DISPLAY_START_HOUR) * 60) / TIME_SLOT_MINUTES,
    [],
  );
  const timelineHeightPx = slotCount * TIMELINE_SLOT_HEIGHT_PX;

  const dayColumnMinWidthPx = 180;

  const days = React.useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);

  const eventsByDay = React.useMemo(() => {
    const map = new Map<number, ScheduleEvent[]>();
    for (const e of events) {
      const eDayIndex = differenceInCalendarDays(new Date(e.startAtMs), weekStart);
      if (eDayIndex < 0 || eDayIndex > 6) continue;
      const existing = map.get(eDayIndex) ?? [];
      map.set(eDayIndex, [...existing, e]);
    }
    return map;
  }, [events, weekStart]);

  return (
    <div className="overflow-x-auto">
      <div className="flex">
        <div
          className="shrink-0 border-r border-border/50 bg-muted/20"
          style={{ width: TIMELINE_HOURS_COLUMN_WIDTH_PX }}
        >
          <div className="border-b border-border/50" style={{ height: TIMELINE_HEADER_HEIGHT_PX }} />
          <div className="relative" style={{ height: timelineHeightPx }}>
            {Array.from({ length: DISPLAY_END_HOUR - DISPLAY_START_HOUR }).map((_, hourOffset) => {
              const hour = DISPLAY_START_HOUR + hourOffset;
              const topPx = hourOffset * (60 / TIME_SLOT_MINUTES) * TIMELINE_SLOT_HEIGHT_PX;
              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0 pr-2 text-right text-xs text-muted-foreground"
                  style={{ top: topPx - TIMELINE_HOUR_LABEL_OFFSET_PX }}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex">
          {days.map((dayDate, dayIndex) => {
            const eventsForDay = eventsByDay.get(dayIndex) ?? [];

            return (
              <div
                key={dayIndex}
                className="relative shrink-0 border-r border-border/50 last:border-r-0"
                style={{ width: dayColumnMinWidthPx }}
              >
                <div
                  className="flex flex-col items-center justify-center gap-0.5 border-b border-border/50 px-2"
                  style={{ height: TIMELINE_HEADER_HEIGHT_PX }}
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    {format(dayDate, 'EEE', { locale: es })}
                  </div>
                  <div className="text-sm font-semibold">
                    {format(dayDate, 'd', { locale: es })}
                  </div>
                </div>

                <div className="relative" style={{ height: timelineHeightPx }}>
                  {(() => {
                    const dayStart = setHours(new Date(dayDate), DISPLAY_START_HOUR);
                    return Array.from({ length: slotCount }).map((_, slotIndex) => {
                      const slotStartAt = addMinutes(dayStart, slotIndex * TIME_SLOT_MINUTES).getTime();

                      return (
                        <button
                          key={slotIndex}
                          type="button"
                          className="absolute left-0 right-0 z-0 cursor-pointer bg-transparent hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                          style={{
                            top: slotIndex * TIMELINE_SLOT_HEIGHT_PX,
                            height: TIMELINE_SLOT_HEIGHT_PX,
                          }}
                          onClick={() => onSlotClick(slotStartAt)}
                          aria-label={`Crear actividad ${format(slotStartAt, 'HH:mm', { locale: es })}`}
                        />
                      );
                    });
                  })()}

                  {eventsForDay.map((e) => {
                    const startMinutes = getLocalMinutesSinceMidnight(e.startAtMs);
                    const minutesFromDisplayStart = startMinutes - DISPLAY_START_HOUR * 60;

                    const topPx = (minutesFromDisplayStart / TIME_SLOT_MINUTES) * TIMELINE_SLOT_HEIGHT_PX;
                    const heightPx = (e.durationMinutes / TIME_SLOT_MINUTES) * TIMELINE_SLOT_HEIGHT_PX;

                    const endAtMs = getEndAtMs(e);

                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => onEventClick(e)}
                        className="absolute left-1 right-1 z-10 overflow-hidden rounded-lg p-1 text-left shadow-sm transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring/50"
                        style={{
                          top: topPx,
                          height: heightPx,
                          backgroundColor: CATEGORY_COLOR_MAP[e.category],
                          border: '1px solid rgba(255,255,255,0.25)',
                        }}
                        aria-label={`Editar actividad ${e.title}`}
                      >
                        <div className="line-clamp-1 text-xs font-semibold text-white">{e.title}</div>
                        <div className="mt-1 text-[10px] text-white/90">
                          {format(new Date(e.startAtMs), 'HH:mm', { locale: es })} -{' '}
                          {format(new Date(endAtMs), 'HH:mm', { locale: es })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

