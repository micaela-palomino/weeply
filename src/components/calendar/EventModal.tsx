'use client';

import * as React from 'react';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X } from 'lucide-react';
import type { ActivityCategoryKey, ScheduleEvent } from '@/types/schedule';
import { ACTIVITY_CATEGORIES } from '@/constants/schedule';

export type SavePayload = {
  title: string;
  category: ActivityCategoryKey;
  startAtMs: number;
  durationMinutes: number;
  notes?: string;
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

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function EventModal({ mode, weekStart, initialStartAtMs, event, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState<ActivityCategoryKey>('work');
  const [selectedDays, setSelectedDays] = React.useState<number[]>([0]);
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('10:00');
  const [notes, setNotes] = React.useState('');
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    setConfirmDelete(false);
    if (event) {
      const idx = Math.max(0, Math.min(6, differenceInCalendarDays(new Date(event.startAtMs), weekStart)));
      setTitle(event.title);
      setCategory(event.category);
      setSelectedDays([idx]);
      setStartTime(format(new Date(event.startAtMs), 'HH:mm'));
      setEndTime(format(new Date(event.startAtMs + event.durationMinutes * 60_000), 'HH:mm'));
      setNotes(event.notes ?? '');
    } else {
      const idx = Math.max(0, Math.min(6, differenceInCalendarDays(new Date(initialStartAtMs), weekStart)));
      setTitle('');
      setCategory('work');
      setSelectedDays([idx]);
      setStartTime(format(new Date(initialStartAtMs), 'HH:mm'));
      setEndTime(format(new Date(initialStartAtMs + 60 * 60_000), 'HH:mm'));
      setNotes('');
    }
  }, [event, initialStartAtMs, weekStart]);

  const toggleDay = (i: number) => {
    if (mode === 'edit') {
      setSelectedDays([i]);
      return;
    }
    setSelectedDays(prev => {
      if (prev.includes(i)) {
        return prev.length > 1 ? prev.filter(d => d !== i) : prev;
      }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedDays.length === 0) return;
    const [sh, sm] = startTime.split(':').map(Number);
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

          {/* Day */}
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

          {/* Time range */}
          <div>
            <label style={LABEL}>Horario</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                style={{ ...INPUT, flex: 1, width: 'auto' }}
              />
              <span style={{ color: '#444', fontSize: 12, flexShrink: 0 }}>→</span>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
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
                ? selectedDays.length > 1 ? `Crear (${selectedDays.length} días)` : 'Crear'
                : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
