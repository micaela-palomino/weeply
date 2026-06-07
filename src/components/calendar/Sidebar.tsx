'use client';

import * as React from 'react';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';
import type { ActivityCategoryKey, ScheduleEvent } from '@/types/schedule';
import { ACTIVITY_CATEGORIES, WEEKLY_TARGETS } from '@/constants/schedule';

type Props = {
  events: ScheduleEvent[];
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
};

const EXERCISE_MIN = WEEKLY_TARGETS.exercise.min;  // 240 min = 4h
const WORK_MAX     = WEEKLY_TARGETS.work.max;        // 2400 min = 40h
const UNI_MAX      = WEEKLY_TARGETS.university.max;  // 1320 min = 22h

function calcScore(byCategory: Record<ActivityCategoryKey, number>): number {
  // Exercise: 40 pts — mandatory minimum 4h/week
  const exercisePts = Math.min(40, Math.round(byCategory.exercise / EXERCISE_MIN * 40));
  // Work: 30 pts — penalized if >40h/week
  const workPts = byCategory.work <= WORK_MAX
    ? 30
    : Math.max(0, Math.round(30 - (byCategory.work - WORK_MAX) / 600 * 30));
  // University: 20 pts — penalized if >22h/week
  const uniPts = byCategory.university <= UNI_MAX
    ? 20
    : Math.max(0, Math.round(20 - (byCategory.university - UNI_MAX) / 660 * 20));
  // Leisure: 10 pts — reward having at least 2h
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

export function Sidebar({ events, weekStart, onPrevWeek, onNextWeek, onToday }: Props) {
  const [metricsOpen, setMetricsOpen] = React.useState(false);
  const [calOpen, setCalOpen] = React.useState(true);

  const ws = weekStart.getTime();
  const we = addDays(weekStart, 7).getTime();
  const weekEvents = events.filter(e => e.startAtMs >= ws && e.startAtMs < we);

  const totalMinutes = weekEvents.reduce((s, e) => s + e.durationMinutes, 0);
  const byCategory: Record<ActivityCategoryKey, number> = { work: 0, exercise: 0, leisure: 0, university: 0 };
  for (const e of weekEvents) byCategory[e.category] += e.durationMinutes;

  const score = calcScore(byCategory);

  const scoreInfo = getScoreInfo(score);
  const recommendation = buildRecommendation(byCategory, totalMinutes, score);
  const rangeLabel = `${format(weekStart, 'd MMM', { locale: es })} — ${format(addDays(weekStart, 6), 'd MMM', { locale: es })}`;

  return (
    <aside
      style={{
        width: 280,
        flexShrink: 0,
        background: '#0f0f0f',
        borderRight: '1px solid #1e1e1e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Brand */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #1e1e1e' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#f5f5f5', letterSpacing: -0.5 }}>Weeply</div>
        <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>Planificación semanal</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Calendario section */}
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

        {/* Métricas section */}
        <Section title="Métricas" open={metricsOpen} onToggle={() => setMetricsOpen(v => !v)}>
          <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Score */}
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

            {/* Recommendation */}
            <p style={{ fontSize: 11, color: '#777', lineHeight: 1.55, borderTop: '1px solid #1e1e1e', paddingTop: 12, margin: 0 }}>
              {recommendation}
            </p>

            {/* Category bars */}
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
                  // leisure: show relative to 10h as reference
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
      </div>
    </aside>
  );
}
