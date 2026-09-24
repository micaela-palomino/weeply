'use client';

import * as React from 'react';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, Repeat } from 'lucide-react';
import type { ActivityCategoryKey, RecurrenceRule, ScheduleEvent, WeekDayKey } from '@/types/schedule';
import { ACTIVITY_CATEGORIES } from '@/constants/schedule';
import { UI_WEEKDAY_KEYS, UI_WEEKDAY_LABELS } from '@/lib/recurrence';

export type SavePayload = {
  title: string;
  category: ActivityCategoryKey;
  startAtMs: number;
  durationMinutes: number;
  notes?: string;
  recurrence?: RecurrenceRule;
  recurrenceEndDate?: string;
};

type Props = {
  mode: 'create' | 'edit';
  weekStart: Date;
  initialStartAtMs: number;
  event?: ScheduleEvent;
  onClose: () => void;
  onSave: (payloads: SavePayload[]) => void;
  onDelete?: () => void;
};

const INPUT: React.CSSProperties = {
  width: '100%',
  background: '#0f0f0f',
  border: '1px solid #2a2a2a',
  borderRadius: 7,
  padding: '8px 10px',
  fontSize: 13,
  color: '#f5f5f5',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#555',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  display: 'block',
  marginBottom: 6,
};

function normalizeTime(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length < 1) return null;
  const h = parseInt(digits.slice(0, 2), 10);
  const m = parseInt(digits.slice(2, 4) || '0', 10);
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function isEventRecurring(ev?: ScheduleEvent): boolean {
  return !!(ev?.recurrence && ev.recurrence.type !== 'once');
}

function getRecurringWeekdays(ev?: ScheduleEvent): number[] {
  if (!ev?.recurrence?.days) return [];
  return ev.recurrence.days.map(k => UI_WEEKDAY_KEYS.indexOf(k)).filter(i => i >= 0);
}

export function EventModal({ mode, weekStart, initialStartAtMs, event, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState<ActivityCategoryKey>('work');
  const [selectedDays, setSelectedDays] = React.useState<number[]>([0]);
  const [startTime, setStartTime] = React.useState('09:00');
  const [startTimeRaw, setStartTimeRaw] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('10:00');
  const [endTimeRaw, setEndTimeRaw] = React.useState('10:00');
  const [notes, setNotes] = React.useState('');
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Recurrence state
  const [isRecurring, setIsRecurring] = React.useState(false);
  const [recurringDays, setRecurringDays] = React.useState<number[]>([]);
  const [recurringEndDate, setRecurringEndDate] = React.useState('');

  React.useEffect(() => {
    setConfirmDelete(false);
    if (event) {
      const idx = Math.max(0, Math.min(6, differenceInCalendarDays(new Date(event.startAtMs), weekStart)));
      setTitle(event.title);
      setCategory(event.category);
      setSelectedDays([idx]);
      const st = format(new Date(event.startAtMs), 'HH:mm');
      const et = format(new Date(event.startAtMs + event.durationMinutes * 60_000), 'HH:mm');
      setStartTime(st); setStartTimeRaw(st);
      setEndTime(et); setEndTimeRaw(et);
      setNotes(event.notes ?? '');
      const rec = isEventRecurring(event);
      setIsRecurring(rec);
      setRecurringDays(rec ? getRecurringWeekdays(event) : []);
      setRecurringEndDate(event.recurrenceEndDate ?? '');
    } else {
      const idx = Math.max(0, Math.min(6, differenceInCalendarDays(new Date(initialStartAtMs), weekStart)));
      setTitle('');
      setCategory('work');
      setSelectedDays([idx]);
      const st = format(new Date(initialStartAtMs), 'HH:mm');
      const et = format(new Date(initialStartAtMs + 60 * 60_000), 'HH:mm');
      setStartTime(st); setStartTimeRaw(st);
      setEndTime(et); setEndTimeRaw(et);
      setNotes('');
      setIsRecurring(false);
      setRecurringDays([idx]); // default: same weekday as selected
      setRecurringEndDate('');
    }
  }, [event, initialStartAtMs, weekStart]);

  const toggleDay = (i: number) => {
    if (mode === 'edit') {
      setSelectedDays([i]);
      return;
    }
    setSelectedDays(prev => {
      if (prev.includes(i)) return prev.length > 1 ? prev.filter(d => d !== i) : prev;
      return [...prev, i];
    });
  };

  const toggleRecurringDay = (i: number) => {
    setRecurringDays(prev => {
      if (prev.includes(i)) return prev.length > 1 ? prev.filter(d => d !== i) : prev;
      return [...prev, i];
    });
  };

  const days = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const durationMinutes = React.useMemo(() => {
    const diff = timeToMinutes(endTime) - timeToMinutes(startTime);
    return Math.max(15, diff);
  }, [startTime, endTime]);

  const handleBlurTime = (
    raw: string,
    setter: (v: string) => void,
    rawSetter: (v: string) => void,
  ) => {
    const normalized = normalizeTime(raw);
    if (normalized) {
      setter(normalized);
      rawSetter(normalized);
    } else {
      rawSetter(startTime); // revert to last valid
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const [sh, sm] = startTime.split(':').map(Number);

    if (isRecurring && recurringDays.length > 0) {
      if (recurringDays.length === 0) return;
      // Create ONE recurring event (the parent)
      // startAtMs = first matching day in the current week
      const sortedDays = [...recurringDays].sort((a, b) => a - b);
      const firstDay = addDays(weekStart, sortedDays[0]!);
      firstDay.setHours(sh!, sm!, 0, 0);

      const recurrence: RecurrenceRule = {
        type: 'custom',
        days: sortedDays.map(i => UI_WEEKDAY_KEYS[i] as WeekDayKey),
      };

      onSave([{
        title: title.trim(),
        category,
        startAtMs: firstDay.getTime(),
        durationMinutes,
        notes: notes.trim() || undefined,
        recurrence,
        recurrenceEndDate: recurringEndDate || undefined,
      }]);
      return;
    }

    if (selectedDays.length === 0) return;
    const payloads: SavePayload[] = [...selectedDays].sort((a, b) => a - b).map(i => {
      const dayDate = new Date(addDays(weekStart, i));
      dayDate.setHours(sh!, sm!, 0, 0);
      return {
        title: title.trim(),
        category,
        startAtMs: dayDate.getTime(),
        durationMinutes,
        notes: notes.trim() || undefined,
      };
    });
    onSave(payloads);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#151515',
          border: '1px solid #2a2a2a',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 440,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f5f5f5', margin: 0 }}>
            {mode === 'create' ? 'Nueva actividad' : 'Editar actividad'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 2, display: 'flex', alignItems: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <label style={LABEL}>Nombre</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Deep work"
              required
              maxLength={80}
              autoFocus
              style={INPUT}
            />
          </div>

          {/* Category */}
          <div>
            <label style={LABEL}>Categoría</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {ACTIVITY_CATEGORIES.map(c => {
                const active = category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                      background: active ? `${c.color}18` : '#1e1e1e',
                      border: `1px solid ${active ? c.color + '60' : '#2a2a2a'}`,
                      color: active ? c.color : '#555',
                      transition: 'all 0.12s',
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recurrence toggle (create mode only) */}
          {mode === 'create' && (
            <div>
              <button
                type="button"
                onClick={() => setIsRecurring(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 12px',
                  borderRadius: 8,
                  fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  background: isRecurring ? '#ff6eb515' : '#1e1e1e',
                  border: `1px solid ${isRecurring ? '#ff6eb560' : '#2a2a2a'}`,
                  color: isRecurring ? '#ff6eb5' : '#555',
                  transition: 'all 0.12s',
                }}
              >
                <Repeat size={13} />
                Repetir semanalmente
              </button>
            </div>
          )}

          {/* Day selector */}
          {!isRecurring ? (
            <div>
              <label style={LABEL}>
                {mode === 'create' ? 'Días' : 'Día'}
                {mode === 'create' && selectedDays.length > 1 && (
                  <span style={{ marginLeft: 6, color: '#ff6eb5', fontWeight: 700, textTransform: 'none', letterSpacing: 0 }}>
                    ×{selectedDays.length}
                  </span>
                )}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {days.map((day, i) => {
                  const active = selectedDays.includes(i);
                  const dayLabel = format(day, 'EEE d', { locale: es }).replace('.', '');
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      style={{
                        padding: '5px 9px',
                        borderRadius: 7,
                        fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                        background: active ? '#ff6eb515' : '#1e1e1e',
                        border: `1px solid ${active ? '#ff6eb560' : '#2a2a2a'}`,
                        color: active ? '#ff6eb5' : '#666',
                        transition: 'all 0.12s',
                      }}
                    >
                      {dayLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Recurring weekday selector */
            <div>
              <label style={LABEL}>Días de la semana</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {UI_WEEKDAY_LABELS.map((label, i) => {
                  const active = recurringDays.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleRecurringDay(i)}
                      style={{
                        width: 32, height: 32,
                        borderRadius: 8,
                        fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        background: active ? '#ff6eb515' : '#1e1e1e',
                        border: `1px solid ${active ? '#ff6eb560' : '#2a2a2a'}`,
                        color: active ? '#ff6eb5' : '#555',
                        transition: 'all 0.12s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* End date */}
              <div style={{ marginTop: 10 }}>
                <label style={{ ...LABEL, marginBottom: 5 }}>
                  Fecha de fin{' '}
                  <span style={{ color: '#444', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    (opcional)
                  </span>
                </label>
                <input
                  type="date"
                  value={recurringEndDate}
                  onChange={e => setRecurringEndDate(e.target.value)}
                  style={{
                    ...INPUT,
                    colorScheme: 'dark',
                  }}
                />
              </div>
            </div>
          )}

          {/* Time range */}
          <div>
            <label style={LABEL}>Horario</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                inputMode="numeric"
                value={startTimeRaw}
                onChange={e => setStartTimeRaw(e.target.value)}
                onBlur={() => handleBlurTime(startTimeRaw, setStartTime, setStartTimeRaw)}
                placeholder="HH:MM"
                maxLength={5}
                style={{ ...INPUT, flex: 1, width: 'auto' }}
              />
              <span style={{ color: '#444', fontSize: 12, flexShrink: 0 }}>→</span>
              <input
                type="text"
                inputMode="numeric"
                value={endTimeRaw}
                onChange={e => setEndTimeRaw(e.target.value)}
                onBlur={() => handleBlurTime(endTimeRaw, setEndTime, setEndTimeRaw)}
                placeholder="HH:MM"
                maxLength={5}
                style={{ ...INPUT, flex: 1, width: 'auto' }}
              />
            </div>
            {durationMinutes > 0 && (
              <p style={{ fontSize: 11, color: '#555', marginTop: 5 }}>{durationMinutes} min</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={LABEL}>
              Notas{' '}
              <span style={{ color: '#444', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                (opcional)
              </span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Agregar notas..."
              rows={2}
              style={{ ...INPUT, resize: 'vertical', minHeight: 60 }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            {mode === 'edit' && onDelete && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  background: '#ef444415', border: '1px solid #ef444440', color: '#ef4444',
                  marginRight: 'auto',
                }}
              >
                Eliminar
              </button>
            )}
            {confirmDelete && (
              <button
                type="button"
                onClick={onDelete}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  background: '#ef4444', border: 'none', color: '#fff',
                  marginRight: 'auto',
                }}
              >
                ¿Confirmar eliminación?
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                background: 'transparent', border: '1px solid #2a2a2a', color: '#888',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                background: '#ff6eb5', border: 'none', color: '#0f0f0f',
              }}
            >
              {mode === 'create'
                ? (isRecurring
                  ? `Crear recurrente (${recurringDays.length} días)`
                  : (selectedDays.length > 1 ? `Crear (${selectedDays.length} días)` : 'Crear'))
                : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
