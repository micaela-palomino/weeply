'use client';

import * as React from 'react';
import { startOfWeek, addDays } from 'date-fns';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Goal, GoalCompletion, ScheduleEvent } from '@/types/schedule';
import { WEEK_STARTS_ON } from '@/constants/schedule';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';
import { expandWeekEvents, formatDateKey } from '@/lib/recurrence';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { Sidebar } from './Sidebar';
import { CalendarTimeline } from './CalendarTimeline';
import { EventModal, type SavePayload } from './EventModal';
import { RecurringDeleteModal, type RecurringDeleteMode } from './RecurringDeleteModal';

type DialogState =
  | { mode: 'create'; startAtMs: number }
  | { mode: 'edit'; event: ScheduleEvent; virtualInstance?: ScheduleEvent };

const getWeekStart = () => startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON });

let _nextId = 1;
const makeId = () => `ev-${_nextId++}`;

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
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
};

const saveDataToFirestore = async (
  uid: string,
  events: ScheduleEvent[],
  goals: Goal[],
  goalCompletions: GoalCompletion[],
) => {
  const clean = JSON.parse(JSON.stringify({ events, goals, goalCompletions }));
  await setDoc(doc(db, 'users', uid), clean);
};

export const WeekCalendar = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [weekStart, setWeekStart] = React.useState(getWeekStart);
  const [events, setEvents] = React.useState<ScheduleEvent[]>([]);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [goalCompletions, setGoalCompletions] = React.useState<GoalCompletion[]>([]);
  const [dialog, setDialog] = React.useState<DialogState | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [firestoreLoading, setFirestoreLoading] = React.useState(true);
  const [recurringDeletePending, setRecurringDeletePending] = React.useState(false);
  const loadedRef = React.useRef(false);

  React.useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Load from Firestore when user logs in
  React.useEffect(() => {
    if (!user) {
      loadedRef.current = false;
      setEvents([]);
      setGoals([]);
      setGoalCompletions([]);
      setFirestoreLoading(true);
      return;
    }
    setFirestoreLoading(true);
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      const data = snap.data();
      if (data?.events && Array.isArray(data.events)) {
        setEvents(data.events as ScheduleEvent[]);
      }
      if (data?.goals && Array.isArray(data.goals)) {
        setGoals(data.goals as Goal[]);
      }
      if (data?.goalCompletions && Array.isArray(data.goalCompletions)) {
        setGoalCompletions(data.goalCompletions as GoalCompletion[]);
      }
      loadedRef.current = true;
      setFirestoreLoading(false);
    });
  }, [user]);

  // Save to Firestore on every change (after initial load)
  React.useEffect(() => {
    if (!user || !loadedRef.current) return;
    saveDataToFirestore(user.uid, events, goals, goalCompletions);
  }, [events, goals, goalCompletions, user]);

  // Expanded events for the current week (includes virtual recurring instances)
  const expandedEvents = React.useMemo(
    () => expandWeekEvents(events, weekStart),
    [events, weekStart],
  );

  const handleSave = (payloads: SavePayload[]) => {
    if (!dialog) return;
    if (dialog.mode === 'create') {
      const newEvents = payloads.map(p => ({ ...p, id: makeId() }));
      setEvents(prev => [...prev, ...newEvents]);
    } else {
      const payload = payloads[0];
      if (payload) {
        const targetId = dialog.event.id;
        setEvents(prev =>
          prev.map(e => e.id === targetId ? { ...e, ...payload } : e),
        );
      }
    }
    setDialog(null);
  };

  const handleDeleteRequest = () => {
    if (dialog?.mode !== 'edit') return;
    if (dialog.virtualInstance) {
      // Recurring instance: show options modal
      setRecurringDeletePending(true);
    } else if (dialog.event.recurrence) {
      // Editing parent directly: show options modal
      setRecurringDeletePending(true);
    } else {
      // Normal event: delete immediately
      setEvents(prev => prev.filter(e => e.id !== dialog.event.id));
      setDialog(null);
    }
  };

  const handleRecurringDelete = (mode: RecurringDeleteMode) => {
    if (dialog?.mode !== 'edit') return;
    const virtualInstance = dialog.virtualInstance;
    const parentId = virtualInstance?.recurrenceId ?? dialog.event.id;
    const instanceDate = virtualInstance
      ? formatDateKey(new Date(virtualInstance.startAtMs))
      : formatDateKey(new Date(dialog.event.startAtMs));

    setRecurringDeletePending(false);

    if (mode === 'all') {
      setEvents(prev => prev.filter(e => e.id !== parentId));
    } else if (mode === 'single') {
      setEvents(prev =>
        prev.map(e =>
          e.id === parentId
            ? { ...e, skippedDates: [...(e.skippedDates ?? []), instanceDate] }
            : e,
        ),
      );
    } else if (mode === 'thisAndFuture') {
      // Set end date to the day before this instance
      const dayBefore = new Date(virtualInstance?.startAtMs ?? dialog.event.startAtMs);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const endDate = formatDateKey(dayBefore);
      setEvents(prev =>
        prev.map(e =>
          e.id === parentId ? { ...e, recurrenceEndDate: endDate } : e,
        ),
      );
    }

    setDialog(null);
  };

  const handleMarkDone = (id: string, done: boolean | undefined) => {
    // id may be a virtual instance id (parentId__dateKey) or a real event id
    const parts = id.split('__');
    if (parts.length === 2) {
      const [parentId, dateKey] = parts as [string, string];
      if (done === true) {
        setEvents(prev =>
          prev.map(e =>
            e.id === parentId
              ? { ...e, completedDates: [...new Set([...(e.completedDates ?? []), dateKey])] }
              : e,
          ),
        );
      } else {
        setEvents(prev =>
          prev.map(e =>
            e.id === parentId
              ? { ...e, completedDates: (e.completedDates ?? []).filter(d => d !== dateKey) }
              : e,
          ),
        );
      }
    } else {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, isDone: done } : e));
    }
  };

  const handleReschedule = (event: ScheduleEvent, newStartAtMs: number) => {
    setEvents(prev => [...prev, { ...event, id: makeId(), startAtMs: newStartAtMs, isDone: undefined, recurrenceId: undefined, recurrence: undefined }]);
  };

  const handleEventClick = (ev: ScheduleEvent) => {
    if (ev.recurrenceId) {
      // Virtual instance: edit parent but remember the instance
      const parent = events.find(e => e.id === ev.recurrenceId);
      if (parent) {
        setDialog({ mode: 'edit', event: parent, virtualInstance: ev });
        return;
      }
    }
    setDialog({ mode: 'edit', event: ev });
  };

  // Goals handlers
  const handleAddGoal = (goal: Goal) => {
    setGoals(prev => [...prev, goal]);
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    setGoalCompletions(prev => prev.filter(gc => gc.goalId !== goalId));
  };

  const handleToggleGoalItem = (goalId: string, date: string, item: string, checked: boolean) => {
    setGoalCompletions(prev => {
      const existing = prev.find(gc => gc.goalId === goalId && gc.date === date);
      if (checked) {
        if (existing) {
          return prev.map(gc =>
            gc.goalId === goalId && gc.date === date
              ? { ...gc, completedItems: [...new Set([...gc.completedItems, item])] }
              : gc,
          );
        }
        return [...prev, { goalId, date, completedItems: [item] }];
      } else {
        if (existing) {
          const newItems = existing.completedItems.filter(i => i !== item);
          if (newItems.length === 0) {
            return prev.filter(gc => !(gc.goalId === goalId && gc.date === date));
          }
          return prev.map(gc =>
            gc.goalId === goalId && gc.date === date
              ? { ...gc, completedItems: newItems }
              : gc,
          );
        }
        return prev;
      }
    });
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#0f0f0f' }}>
        <span style={{ color: '#555', fontSize: 14 }}>Cargando...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (firestoreLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#0f0f0f' }}>
        <span style={{ color: '#555', fontSize: 14 }}>Cargando tu agenda...</span>
      </div>
    );
  }

  const editEvent = dialog?.mode === 'edit' ? dialog.event : undefined;
  const editVirtual = dialog?.mode === 'edit' ? dialog.virtualInstance : undefined;

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
          events={expandedEvents}
          weekStart={weekStart}
          onPrevWeek={() => setWeekStart(prev => addDays(prev, -7))}
          onNextWeek={() => setWeekStart(prev => addDays(prev, 7))}
          onToday={() => setWeekStart(getWeekStart())}
          onClose={isMobile ? () => setSidebarOpen(false) : undefined}
          onMarkDone={handleMarkDone}
          onReschedule={handleReschedule}
          goals={goals}
          goalCompletions={goalCompletions}
          onAddGoal={handleAddGoal}
          onDeleteGoal={handleDeleteGoal}
          onToggleGoalItem={handleToggleGoalItem}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            <button
              type="button"
              onClick={signOut}
              title={`Cerrar sesión (${user.email})`}
              style={{
                background: 'none',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                padding: '6px 10px',
                cursor: 'pointer',
                color: '#555',
                fontSize: 12,
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              Salir
            </button>
          </div>
        </div>

        {/* Calendar scroll area */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <CalendarTimeline
            events={expandedEvents}
            weekStart={weekStart}
            onSlotClick={(startAtMs) => setDialog({ mode: 'create', startAtMs })}
            onEventClick={handleEventClick}
          />
        </div>
      </div>

      {dialog !== null && (
        <EventModal
          mode={dialog.mode}
          weekStart={weekStart}
          initialStartAtMs={dialog.mode === 'create' ? dialog.startAtMs : (editVirtual?.startAtMs ?? editEvent!.startAtMs)}
          event={editEvent}
          onClose={() => setDialog(null)}
          onSave={handleSave}
          onDelete={dialog.mode === 'edit' ? handleDeleteRequest : undefined}
        />
      )}

      {recurringDeletePending && (
        <RecurringDeleteModal
          onSelect={handleRecurringDelete}
          onClose={() => setRecurringDeletePending(false)}
        />
      )}
    </div>
  );
};
