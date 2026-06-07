'use client';

import * as React from 'react';
import { addDays, differenceInCalendarDays, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ScheduleEvent } from '@/types/schedule';
import { CATEGORY_COLOR_MAP } from '@/constants/schedule';

const DISPLAY_START_HOUR = 7;
const DISPLAY_END_HOUR = 22;
const TOTAL_HOURS = DISPLAY_END_HOUR - DISPLAY_START_HOUR; // 15
const HOUR_PX = 48;
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_PX; // 720px
const HOURS_COL_WIDTH = 48;
const DISPLAY_HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => DISPLAY_START_HOUR + i);

export type CalendarTimelineProps = {
  events: ScheduleEvent[];
  weekStart: Date;
  onSlotClick: (startAtMs: number) => void;
  onEventClick: (event: ScheduleEvent) => void;
};

function minutesToPx(minutes: number): number {
  return (minutes / 60) * HOUR_PX;
}

function getLocalMinutes(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

function getNowTop(): number | null {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < DISPLAY_START_HOUR || h >= DISPLAY_END_HOUR) return null;
  return minutesToPx((h - DISPLAY_START_HOUR) * 60 + m);
}

export function CalendarTimeline({ events, weekStart, onSlotClick, onEventClick }: CalendarTimelineProps) {
  const today = React.useMemo(() => new Date(), []);

  const days = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const eventsByDay = React.useMemo(() => {
    const map = new Map<number, ScheduleEvent[]>();
    for (const e of events) {
      const idx = differenceInCalendarDays(new Date(e.startAtMs), weekStart);
      if (idx < 0 || idx > 6) continue;
      const list = map.get(idx) ?? [];
      map.set(idx, [...list, e]);
    }
    return map;
  }, [events, weekStart]);

  const nowTop = getNowTop();

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>, dayDate: Date) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    // snap to 30-min slots (24px each)
    const slotIndex = Math.floor(y / 24);
    const minutesFromStart = slotIndex * 30;
    const totalMinutes = DISPLAY_START_HOUR * 60 + minutesFromStart;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const d = new Date(dayDate);
    d.setHours(hours, minutes, 0, 0);
    onSlotClick(d.getTime());
  };

  return (
    <div style={{ display: 'flex', minWidth: 600 }}>
      {/* Hours column */}
      <div style={{ width: HOURS_COL_WIDTH, flexShrink: 0, borderRight: '1px solid #1e1e1e' }}>
        {/* Spacer aligns with day headers */}
        <div style={{ height: 52, borderBottom: '1px solid #1e1e1e' }} />
        <div style={{ position: 'relative', height: TOTAL_HEIGHT }}>
          {DISPLAY_HOURS.map((h, i) => (
            <div
              key={h}
              style={{
                position: 'absolute',
                top: i * HOUR_PX - 7,
                right: 6,
                fontSize: 10,
                color: '#3a3a3a',
                letterSpacing: '0.02em',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                userSelect: 'none',
              }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>
      </div>

      {/* Day columns */}
      <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
        {days.map((dayDate, dayIndex) => {
          const isToday = isSameDay(dayDate, today);
          const dayEvents = eventsByDay.get(dayIndex) ?? [];
          const dayLabel = format(dayDate, 'EEE', { locale: es }).replace('.', '');
          const dayNum = format(dayDate, 'd');

          return (
            <div
              key={dayIndex}
              style={{
                flex: 1,
                minWidth: 0,
                borderRight: dayIndex < 6 ? '1px solid #2a2a2a' : 'none',
              }}
            >
              {/* Day header */}
              <div
                style={{
                  height: 52,
                  borderBottom: '1px solid #1e1e1e',
                  borderTop: isToday ? '2px solid #ff6eb5' : '2px solid transparent',
                  background: isToday ? '#ff6eb510' : 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  userSelect: 'none',
                }}
              >
                <span style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: isToday ? '#ff6eb5' : '#555',
                }}>
                  {dayLabel}
                </span>
                <span style={{
                  fontSize: 17,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: isToday ? '#ff6eb5' : '#f5f5f5',
                  letterSpacing: -0.5,
                }}>
                  {dayNum}
                </span>
              </div>

              {/* Timeline body */}
              <div
                style={{
                  position: 'relative',
                  height: TOTAL_HEIGHT,
                  background: isToday ? '#ff6eb504' : 'transparent',
                  cursor: 'crosshair',
                }}
                onClick={(e) => handleColumnClick(e, dayDate)}
              >
                {/* Hour grid lines */}
                {DISPLAY_HOURS.map((_, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <div style={{
                        position: 'absolute', left: 0, right: 0,
                        top: i * HOUR_PX, height: 0,
                        borderTop: '1px solid #1e1e1e',
                        pointerEvents: 'none',
                      }} />
                    )}
                    <div style={{
                      position: 'absolute', left: 0, right: 0,
                      top: i * HOUR_PX + HOUR_PX / 2, height: 0,
                      borderTop: '1px dashed #161616',
                      pointerEvents: 'none',
                    }} />
                  </React.Fragment>
                ))}
                {/* Bottom border (22:00) */}
                <div style={{
                  position: 'absolute', left: 0, right: 0,
                  top: TOTAL_HEIGHT, height: 0,
                  borderTop: '1px solid #1e1e1e',
                  pointerEvents: 'none',
                }} />

                {/* Current time indicator */}
                {isToday && nowTop !== null && (
                  <div style={{
                    position: 'absolute', left: 0, right: 0, top: nowTop,
                    zIndex: 20, pointerEvents: 'none',
                    display: 'flex', alignItems: 'center',
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#ff6eb5', marginLeft: -3, flexShrink: 0,
                    }} />
                    <div style={{
                      flex: 1, height: 1,
                      background: 'linear-gradient(90deg, #ff6eb5, #ff6eb540)',
                    }} />
                  </div>
                )}

                {/* Events */}
                {dayEvents.map(ev => {
                  const startMins = getLocalMinutes(ev.startAtMs) - DISPLAY_START_HOUR * 60;
                  const top = minutesToPx(Math.max(0, startMins));
                  const height = Math.max(24, minutesToPx(ev.durationMinutes));
                  const color = CATEGORY_COLOR_MAP[ev.category];
                  const endMs = ev.startAtMs + ev.durationMinutes * 60_000;

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                      style={{
                        position: 'absolute',
                        left: 3,
                        right: 3,
                        top,
                        height,
                        background: `${color}26`,
                        borderLeft: `3px solid ${color}`,
                        borderTop: 'none',
                        borderRight: 'none',
                        borderBottom: 'none',
                        borderRadius: 6,
                        padding: '4px 8px',
                        textAlign: 'left',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        zIndex: 10,
                        fontFamily: 'inherit',
                      }}
                    >
                      <div style={{
                        fontSize: 12, fontWeight: 600, color,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        lineHeight: 1.3,
                      }}>
                        {ev.title}
                      </div>
                      {height >= 40 && (
                        <div style={{ fontSize: 10, color, opacity: 0.6, marginTop: 2 }}>
                          {format(new Date(ev.startAtMs), 'HH:mm')} – {format(new Date(endMs), 'HH:mm')}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
