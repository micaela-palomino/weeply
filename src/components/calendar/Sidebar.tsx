'use client';

import * as React from 'react';
import { addDays, format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';
import type { ActivityCategoryKey, ScheduleEvent } from '@/types/schedule';
import { ACTIVITY_CATEGORIES, WEEKLY_TARGETS } from '@/constants/schedule';
import { findRescheduleSlots } from '@/lib/suggestions';

type Props = {
  events: ScheduleEvent[];
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onClose?: () => void;
  onMarkDone: (id: string, done: boolean | undefined) => void;
  onReschedule: (event: ScheduleEvent, newStartAtMs: number) => void;
};

const EXERCISE_MIN = WEEKLY_TARGETS.exercise.min;
const WORK_MAX     = WEEKLY_TARGETS.work.max;
const UNI_MAX      = WEEKLY_TARGETS.university.max;

function calcScore(byCategory: Record<ActivityCategoryKey, number>): number {
  const exercisePts = Math.min(40, Math.round(byCategory.exercise / EXERCISE_MIN * 40));
  const workPts = byCategory.work <= WORK_MAX
    ? 30
    : Math.max(0, Math.round(30 - (byCategory.work - WORK_MAX) / 600 * 30));
  const uniPts = byCategory.university <= UNI_MAX
    ? 20
    : Math.max(0, Math.round(20 - (byCategory.university - UNI_MAX) / 660 * 20));
  const leisurePts = Math.min(10, Math.round(byCategory.leisure / 120 * 10));
  return exercisePts + workPts + uniPts + leisurePts;
}

function getScoreInfo(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Saludable', color: '#4ade80' };
  if (score >= 65) return { label: 'Equilibrado', color: '#ff6eb5' };
  if (score >= 45) return { label: 'Sostenible', color: '#f59e0b' };
  if (score >= 25) return { label: 'Cargado', color: '#f97316' };
  return { label: 'Agotador', color: '#ef4444' };
}

function toH(min: number) {
  return Math.round((min / 60) * 10) / 10;
}

function buildRecommendation(
  byCategory: Record<ActivityCategoryKey, number>,
  totalMinutes: number,
  score: number,
): string {
  if (totalMinutes === 0) return 'No hay actividades esta semana. ¡Empezá agregando bloques!';
  const exerciseLeft = EXERCISE_MIN - byCategory.exercise;
  if (exerciseLeft > 0) {
    return `Te faltan ${toH(exerciseLeft)}h de ejercicio. Las 4h semanales son obligatorias para una semana saludable.`;
  }
  if (byCategory.work > WORK_MAX) {
    return `Superaste las 40h de trabajo (${toH(byCategory.work)}h). Considerá reducir para mantener un ritmo sostenible.`;
  }
  if (byCategory.university > UNI_MAX) {
    return `Excediste las 22h de facultad (${toH(byCategory.university)}h). Incluí tiempo de recuperación.`;
  }
  if (byCategory.leisure === 0) return 'Sin ocio planificado. Descansar también es productivo — agregá al menos un bloque libre.';
  if (score >= 85) return '¡Semana saludable! Ejercicio completo y carga equilibrada.';
  if (score >= 65) return 'Buen balance. Ajustá trabajo o facultad para acercarte al óptimo.';
  return 'Tu semana tiene desequilibrio. Revisá trabajo y ejercicio primero.';
}

type SectionProps = {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function Section({ title, open, onToggle, children }: SectionProps) {
  return (
    <div style={{ borderBottom: '1px solid #1e1e1e' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {title}
        </span>
        <ChevronRight
          size={13}
          color="#444"
          style={{
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        />
      </button>
      {open && children}
    </div>
  );
}

type EventRowProps = {
  event: ScheduleEvent;
  allEvents: ScheduleEvent[];
  weekEnd: Date;
  onMarkDone: (id: string, done: boolean | undefined) => void;
  onReschedule: (event: ScheduleEvent, newStartAtMs: number) => void;
};

function EventRow({ event, allEvents, weekEnd, onMarkDone, onReschedule }: EventRowProps) {
  const isDone = event.isDone;
  const notDone = isDone === false;
  const done = isDone === true;

  const catInfo = ACTIVITY_CATEGORIES.find(c => c.key === event.category);
  const accentColor = catInfo?.color ?? '#888';

  const dayLabel = format(new Date(event.startAtMs), 'EEE HH:mm', { locale: es });

  const suggestions = React.useMemo(() => {
    if (!notDone) return [];
    return findRescheduleSlots(event, allEvents, weekEnd);
  }, [notDone, event, allEvents, weekEnd]);

  const btnBase: React.CSSProperties = {
    border: 'none',
    borderRadius: 6,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'opacity 0.15s',
  };

  return (
    <div style={{
      padding: '10px 16px',
      borderBottom: '1px solid #161616',
    }}>
      {/* Row: dot + title + day */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: done ? '#4ade80' : notDone ? '#ef4444' : accentColor,
          flexShrink: 0,
          opacity: done ? 1 : notDone ? 1 : 0.6,
        }} />
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: done ? '#4ade80' : notDone ? '#666' : '#d4d4d4',
          textDecoration: done ? 'line-through' : 'none',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {event.title}
        </span>
        <span style={{ fontSize: 10, color: '#444', flexShrink: 0 }}>{dayLabel}</span>
      </div>

      {/* Toggle buttons */}
      <div style={{ display: 'flex', gap: 5 }}>
        <button
          type="button"
          onClick={() => onMarkDone(event.id, done ? undefined : true)}
          style={{
            ...btnBase,
            background: done ? '#4ade8022' : '#1e1e1e',
            color: done ? '#4ade80' : '#666',
            border: `1px solid ${done ? '#4ade8040' : '#2a2a2a'}`,
          }}
        >
          ✓ Hice
        </button>
        <button
          type="button"
          onClick={() => onMarkDone(event.id, notDone ? undefined : false)}
          style={{
            ...btnBase,
            background: notDone ? '#ef444418' : '#1e1e1e',
            color: notDone ? '#ef4444' : '#666',
            border: `1px solid ${notDone ? '#ef444440' : '#2a2a2a'}`,
          }}
        >
          ✗ No hice
        </button>
      </div>

      {/* Suggestions when not done */}
      {notDone && (
        <div style={{ marginTop: 8 }}>
          {suggestions.length === 0 ? (
            <p style={{ fontSize: 10, color: '#555', margin: 0 }}>
              Sin espacio libre esta semana para reagendar.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 10, color: '#555', margin: '0 0 5px' }}>Reagendar en:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {suggestions.map(slotMs => (
                  <button
                    key={slotMs}
                    type="button"
                    onClick={() => onReschedule(event, slotMs)}
                    style={{
                      ...btnBase,
                      background: '#ff6eb510',
                      color: '#ff6eb5',
                      border: '1px solid #ff6eb530',
                      padding: '4px 9px',
                    }}
                  >
                    {format(new Date(slotMs), 'EEE HH:mm', { locale: es })}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ events, weekStart, onPrevWeek, onNextWeek, onToday, onClose, onMarkDone, onReschedule }: Props) {
  const [metricsOpen, setMetricsOpen] = React.useState(false);
  const [calOpen, setCalOpen] = React.useState(true);
  const [goalsOpen, setGoalsOpen] = React.useState(true);

  const ws = weekStart.getTime();
  const weekEnd = addDays(weekStart, 7);
  const we = weekEnd.getTime();
  const weekEvents = events.filter(e => e.startAtMs >= ws && e.startAtMs < we);

  const totalMinutes = weekEvents.reduce((s, e) => s + e.durationMinutes, 0);
  const byCategory: Record<ActivityCategoryKey, number> = { work: 0, exercise: 0, leisure: 0, university: 0 };
  for (const e of weekEvents) byCategory[e.category] += e.durationMinutes;

  const score = calcScore(byCategory);
  const scoreInfo = getScoreInfo(score);
  const recommendation = buildRecommendation(byCategory, totalMinutes, score);
  const rangeLabel = `${format(weekStart, 'd MMM', { locale: es })} — ${format(addDays(weekStart, 6), 'd MMM', { locale: es })}`;

  // Completion stats
  const doneCount = weekEvents.filter(e => e.isDone === true).length;
  const notDoneCount = weekEvents.filter(e => e.isDone === false).length;
  const markedCount = doneCount + notDoneCount;
  const completionPct = weekEvents.length > 0
    ? Math.round(doneCount / weekEvents.length * 100)
    : 0;

  const sortedWeekEvents = [...weekEvents].sort((a, b) => a.startAtMs - b.startAtMs);

  return (
    <aside
      style={{
        width: 280,
        height: '100%',
        flexShrink: 0,
        background: '#0f0f0f',
        borderRight: '1px solid #1e1e1e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Brand */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #1e1e1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f5f5f5', letterSpacing: -0.5 }}>Weeply</div>
          <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>Planificación semanal</div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#555',
              fontSize: 20,
              lineHeight: 1,
              padding: 4,
              fontFamily: 'inherit',
            }}
          >
            ×
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Calendario */}
        <Section title="Calendario" open={calOpen} onToggle={() => setCalOpen(v => !v)}>
          <div style={{ padding: '4px 16px 14px' }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>{rangeLabel}</div>
            <div style={{ display: 'flex', gap: 5 }}>
              {([
                { label: '← Ant', onClick: onPrevWeek, pink: false },
                { label: 'Hoy', onClick: onToday, pink: true },
                { label: 'Sig →', onClick: onNextWeek, pink: false },
              ] as const).map(({ label, onClick, pink }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  style={{
                    flex: 1,
                    padding: '5px 0',
                    borderRadius: 7,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    background: pink ? '#ff6eb515' : '#1e1e1e',
                    border: `1px solid ${pink ? '#ff6eb540' : '#2a2a2a'}`,
                    color: pink ? '#ff6eb5' : '#888',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Métricas */}
        <Section title="Métricas" open={metricsOpen} onToggle={() => setMetricsOpen(v => !v)}>
          <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: -2, lineHeight: 1, color: '#f5f5f5' }}>
                  {score}
                </span>
                <div style={{ marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 9, color: '#444' }}>/100</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: `${scoreInfo.color}18`,
                    color: scoreInfo.color,
                    border: `1px solid ${scoreInfo.color}40`,
                    whiteSpace: 'nowrap',
                  }}>
                    {scoreInfo.label}
                  </span>
                </div>
              </div>
              <div style={{ height: 3, background: '#1e1e1e', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  width: `${score}%`, height: '100%', borderRadius: 99,
                  background: `linear-gradient(90deg, #c94fa8, ${scoreInfo.color})`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>

            <p style={{ fontSize: 11, color: '#777', lineHeight: 1.55, borderTop: '1px solid #1e1e1e', paddingTop: 12, margin: 0 }}>
              {recommendation}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #1e1e1e', paddingTop: 12 }}>
              {ACTIVITY_CATEGORIES.map(c => {
                const mins = byCategory[c.key];
                const hours = toH(mins);
                let barPct: number;
                let targetLabel: string;
                let overLimit = false;

                if (c.key === 'exercise') {
                  barPct = Math.min(100, Math.round(mins / EXERCISE_MIN * 100));
                  targetLabel = `/ ${WEEKLY_TARGETS.exercise.label}`;
                } else if (c.key === 'work') {
                  barPct = Math.min(100, Math.round(mins / WORK_MAX * 100));
                  targetLabel = `/ ${WEEKLY_TARGETS.work.label}`;
                  overLimit = mins > WORK_MAX;
                } else if (c.key === 'university') {
                  barPct = Math.min(100, Math.round(mins / UNI_MAX * 100));
                  targetLabel = `/ ${WEEKLY_TARGETS.university.label}`;
                  overLimit = mins > UNI_MAX;
                } else {
                  barPct = Math.min(100, Math.round(mins / 600 * 100));
                  targetLabel = 'libre';
                }

                const barColor = overLimit ? '#f97316' : c.color;

                return (
                  <div key={c.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: barColor }}>{c.label}</span>
                        {c.key === 'exercise' && mins < EXERCISE_MIN && (
                          <span style={{ fontSize: 9, color: '#ef4444' }}>⚠</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 10, color: overLimit ? '#f97316' : '#666', fontWeight: overLimit ? 700 : 400 }}>{hours}h</span>
                        <span style={{ fontSize: 9, color: '#444' }}>{targetLabel}</span>
                      </div>
                    </div>
                    <div style={{ height: 3, background: '#1e1e1e', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        width: `${barPct}%`, height: '100%', background: barColor,
                        borderRadius: 99, transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Objetivos */}
        <Section title="Objetivos" open={goalsOpen} onToggle={() => setGoalsOpen(v => !v)}>
          {weekEvents.length === 0 ? (
            <p style={{ fontSize: 11, color: '#555', padding: '8px 16px 16px', margin: 0 }}>
              Sin actividades esta semana.
            </p>
          ) : (
            <>
              {/* Completion summary */}
              <div style={{ padding: '6px 16px 10px', borderBottom: '1px solid #161616' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: '#666' }}>
                    {doneCount}/{weekEvents.length} completadas
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: completionPct >= 80 ? '#4ade80' : completionPct >= 50 ? '#ff6eb5' : '#f97316',
                  }}>
                    {completionPct}%
                  </span>
                </div>
                <div style={{ height: 3, background: '#1e1e1e', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    width: `${completionPct}%`, height: '100%', borderRadius: 99,
                    background: completionPct >= 80 ? '#4ade80' : completionPct >= 50 ? '#ff6eb5' : '#f97316',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                {markedCount < weekEvents.length && (
                  <p style={{ fontSize: 10, color: '#444', margin: '6px 0 0' }}>
                    {weekEvents.length - markedCount} sin marcar
                  </p>
                )}
              </div>

              {/* Event list */}
              {sortedWeekEvents.map(event => (
                <EventRow
                  key={event.id}
                  event={event}
                  allEvents={events}
                  weekEnd={weekEnd}
                  onMarkDone={onMarkDone}
                  onReschedule={onReschedule}
                />
              ))}
            </>
          )}
        </Section>
      </div>
    </aside>
  );
}
