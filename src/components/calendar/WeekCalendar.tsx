'use client';

import * as React from 'react';
import { startOfWeek, addDays } from 'date-fns';
import type { ScheduleEvent } from '@/types/schedule';
import { WEEK_STARTS_ON } from '@/constants/schedule';
import { Sidebar } from './Sidebar';
import { CalendarTimeline } from './CalendarTimeline';
import { EventModal, type SavePayload } from './EventModal';

type DialogState =
  | { mode: 'create'; startAtMs: number }
  | { mode: 'edit'; event: ScheduleEvent };

const getWeekStart = () => startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON });

let _nextId = 1;
const makeId = () => `ev-${_nextId++}`;

const makeSampleEvents = (ws: Date): ScheduleEvent[] => {
  const at = (dayOffset: number, hours: number, minutes = 0): number => {
    const d = new Date(ws);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hours, minutes, 0, 0);
    return d.getTime();
  };
  return [
    { id: makeId(), title: 'Deep work', category: 'work', startAtMs: at(0, 9), durationMinutes: 120 },
    { id: makeId(), title: 'Análisis', category: 'university', startAtMs: at(1, 16), durationMinutes: 120 },
    { id: makeId(), title: 'Gym', category: 'exercise', startAtMs: at(2, 18), durationMinutes: 60 },
    { id: makeId(), title: 'Lectura', category: 'leisure', startAtMs: at(4, 20), durationMinutes: 60 },
  ];
};

const getDefaultStartAtMs = (): number => {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  if (h >= 7 && h < 21) {
    const snappedMin = Math.ceil(m / 30) * 30;
    const d = new Date(now);
    if (snappedMin === 60) {
      d.setHours(h + 1, 0, 0, 0);
    } else {
      d.setMinutes(snappedMin, 0, 0);
    }
    return d.getTime();
  }
  const d = new Date(now);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
};

export const WeekCalendar = () => {
  const [weekStart, setWeekStart] = React.useState(getWeekStart);
  const [events, setEvents] = React.useState<ScheduleEvent[]>(() => makeSampleEvents(getWeekStart()));
  const [dialog, setDialog] = React.useState<DialogState | null>(null);

  const handleSave = (payloads: SavePayload[]) => {
    if (!dialog) return;
    if (dialog.mode === 'create') {
      const newEvents = payloads.map(p => ({ ...p, id: makeId() }));
      setEvents(prev => [...prev, ...newEvents]);
    } else {
      const payload = payloads[0];
      if (payload) {
        setEvents(prev =>
          prev.map(e => e.id === dialog.event.id ? { ...e, ...payload } : e),
        );
      }
    }
    setDialog(null);
  };

  const handleDelete = () => {
    if (dialog?.mode !== 'edit') return;
    const id = dialog.event.id;
    setEvents(prev => prev.filter(e => e.id !== id));
    setDialog(null);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#0f0f0f',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans, Inter, sans-serif)',
    }}>
      <Sidebar
        events={events}
        weekStart={weekStart}
        onPrevWeek={() => setWeekStart(prev => addDays(prev, -7))}
        onNextWeek={() => setWeekStart(prev => addDays(prev, 7))}
        onToday={() => setWeekStart(getWeekStart())}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid #1e1e1e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexShrink: 0,
          background: '#0f0f0f',
        }}>
          <button
            type="button"
            onClick={() => setDialog({ mode: 'create', startAtMs: getDefaultStartAtMs() })}
            style={{
              background: '#ff6eb5',
              color: '#0f0f0f',
              border: 'none',
              borderRadius: 8,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            + Nueva actividad
          </button>
        </div>

        {/* Calendar scroll area */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <CalendarTimeline
            events={events}
            weekStart={weekStart}
            onSlotClick={(startAtMs) => setDialog({ mode: 'create', startAtMs })}
            onEventClick={(event) => setDialog({ mode: 'edit', event })}
          />
        </div>
      </div>

      {dialog !== null && (
        <EventModal
          mode={dialog.mode}
          weekStart={weekStart}
          initialStartAtMs={dialog.mode === 'create' ? dialog.startAtMs : dialog.event.startAtMs}
          event={dialog.mode === 'edit' ? dialog.event : undefined}
          onClose={() => setDialog(null)}
          onSave={handleSave}
          onDelete={dialog.mode === 'edit' ? handleDelete : undefined}
        />
      )}
    </div>
  );
};
