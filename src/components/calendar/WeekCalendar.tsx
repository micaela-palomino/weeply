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

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false); // false on SSR — updated after mount
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
};

export const WeekCalendar = () => {
  const isMobile = useIsMobile();
  const [weekStart, setWeekStart] = React.useState(getWeekStart);
  const [events, setEvents] = React.useState<ScheduleEvent[]>(() => makeSampleEvents(getWeekStart()));
  const [dialog, setDialog] = React.useState<DialogState | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true); // open by default (matches SSR)

  React.useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

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

  const handleMarkDone = (id: string, done: boolean | undefined) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, isDone: done } : e));
  };

  const handleReschedule = (event: ScheduleEvent, newStartAtMs: number) => {
    setEvents(prev => [...prev, { ...event, id: makeId(), startAtMs: newStartAtMs, isDone: undefined }]);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100dvh',
      background: '#0f0f0f',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans, Inter, sans-serif)',
      position: 'relative',
    }}>
      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 10,
          }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        height: '100%',
        zIndex: isMobile ? 20 : 'auto',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        flexShrink: 0,
        width: 280,
        display: isMobile ? 'block' : (sidebarOpen ? 'block' : 'none'),
      }}>
        <Sidebar
          events={events}
          weekStart={weekStart}
          onPrevWeek={() => setWeekStart(prev => addDays(prev, -7))}
          onNextWeek={() => setWeekStart(prev => addDays(prev, 7))}
          onToday={() => setWeekStart(getWeekStart())}
          onClose={isMobile ? () => setSidebarOpen(false) : undefined}
          onMarkDone={handleMarkDone}
          onReschedule={handleReschedule}
        />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid #1e1e1e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: '#0f0f0f',
          gap: 10,
        }}>
          <button
            type="button"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Menú"
            style={{
              background: 'none',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              color: '#888',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <span style={{ display: 'block', width: 16, height: 1.5, background: '#888', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 16, height: 1.5, background: '#888', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 16, height: 1.5, background: '#888', borderRadius: 2 }} />
          </button>

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
              whiteSpace: 'nowrap',
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
