'use client';

import * as React from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ActivityCategoryKey, WeeklyBalance } from '@/types/schedule';
import { ACTIVITY_CATEGORIES, TARGET_CATEGORY_SHARE } from '@/constants/schedule';

// ─── Types ───────────────────────────────────────────────────────────────────

export type WeeklyAnalysisProps = {
  balance: WeeklyBalance;
  previousBalance?: WeeklyBalance | null;
};

type ScoreLevel = {
  label: string;
  color: string;
  bg: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SCORE_LEVELS: ScoreLevel[] = [
  { label: 'Agotador',   color: '#ef4444', bg: '#ef444420' },
  { label: 'Cargado',    color: '#f97316', bg: '#f9731620' },
  { label: 'Sostenible', color: '#eab308', bg: '#eab30820' },
  { label: 'Equilibrado',color: '#4ade80', bg: '#4ade8020' },
  { label: 'Liviano',    color: '#22d3ee', bg: '#22d3ee20' },
];

const getScoreLevel = (score: number): ScoreLevel => {
  const idx = Math.min(4, Math.floor(score / 20));
  return SCORE_LEVELS[idx]!;
};

const minutesToHours = (m: number) => Math.round((m / 60) * 10) / 10;

const categoryWeekTotal = (balance: WeeklyBalance, key: ActivityCategoryKey) =>
  balance.daily.reduce((acc, d) => acc + (d.minutesByCategory[key] ?? 0), 0);

// ─── Recommendation engine ────────────────────────────────────────────────────

const buildRecommendation = (
  ratios: Record<ActivityCategoryKey, number>,
  score: number,
  totalMinutes: number,
): string => {
  if (totalMinutes === 0) return 'No hay actividades planificadas. ¡Empezá agregando bloques a tu semana!';

  const workPct = Math.round(ratios.work * 100);
  const exercisePct = Math.round(ratios.exercise * 100);
  const leisurePct = Math.round(ratios.leisure * 100);
  const uniPct = Math.round(ratios.university * 100);

  if (workPct >= 60)
    return `Tenés ${workPct}% de tu tiempo en trabajo. Considerá agregar al menos 1 bloque de ocio o ejercicio para recuperarte.`;
  if (exercisePct === 0)
    return 'No hay ejercicio esta semana. Incluso 30 min de actividad física marcan la diferencia.';
  if (leisurePct === 0)
    return 'Sin ocio planificado. Descansar también es productivo — agregá al menos un bloque libre.';
  if (uniPct >= 50)
    return `Semana cargada de facultad (${uniPct}%). Asegurate de incluir tiempo de recuperación y ejercicio.`;
  if (score >= 80)
    return '¡Excelente distribución! Tu semana está muy bien balanceada entre todas las categorías.';
  if (score >= 60)
    return 'Buen balance general. Ajustá ligeramente las categorías con más desvío del objetivo para llegar a 80+.';
  if (exercisePct < 10)
    return `Solo ${exercisePct}% de tiempo en ejercicio. Intentá llegar al objetivo del 25% para una semana más saludable.`;
  return 'Tu semana tiene bastante desequilibrio entre categorías. Revisá la distribución e intentá acercarla a los objetivos.';
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: '#151515',
  border: '1px solid #1e1e1e',
  borderRadius: 12,
  padding: '1.25rem',
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#444',
  marginBottom: 14,
};

type DeltaProps = { current: number; previous: number | null };

const Delta = ({ current, previous }: DeltaProps) => {
  if (previous === null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.1) return <span style={{ fontSize: 10, color: '#555' }}>—</span>;
  const up = diff > 0;
  return (
    <span style={{ fontSize: 10, color: up ? '#4ade80' : '#f87171', fontWeight: 600 }}>
      {up ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}h
    </span>
  );
};

// Custom tooltip for the stacked bar chart
const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div style={{
      background: '#1e1e1e',
      border: '1px solid #2a2a2a',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 11,
    }}>
      <p style={{ color: '#f5f5f5', fontWeight: 600, marginBottom: 6 }}>{label}</p>
      {payload.map((p) =>
        p.value > 0 ? (
          <p key={p.name} style={{ color: p.color, marginBottom: 2 }}>
            {p.name}: {p.value.toFixed(1)}h
          </p>
        ) : null,
      )}
      <p style={{ color: '#888', marginTop: 4, borderTop: '1px solid #2a2a2a', paddingTop: 4 }}>
        Total: {total.toFixed(1)}h
      </p>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const WeeklyAnalysis = ({ balance, previousBalance }: WeeklyAnalysisProps) => {
  const weekStart = new Date(balance.weekStartAtMs);

  const totalMinutes = balance.daily.reduce((acc, d) => acc + d.totalMinutes, 0);
  const totalHours = minutesToHours(totalMinutes);

  // Category totals (current + previous)
  const categoryData = ACTIVITY_CATEGORIES.map((c) => {
    const minutes = categoryWeekTotal(balance, c.key);
    const hours = minutesToHours(minutes);
    const ratio = totalMinutes > 0 ? minutes / totalMinutes : 0;
    const target = TARGET_CATEGORY_SHARE[c.key];
    const prevMinutes = previousBalance ? categoryWeekTotal(previousBalance, c.key) : null;
    const prevHours = prevMinutes !== null ? minutesToHours(prevMinutes) : null;
    return { ...c, minutes, hours, ratio, target, prevHours };
  });

  // Score
  const level = getScoreLevel(balance.score);

  // Ratios for recommendation
  const ratios = Object.fromEntries(
    categoryData.map((c) => [c.key, c.ratio]),
  ) as Record<ActivityCategoryKey, number>;

  // Best (most equilibrated) & most loaded day
  const dayStats = balance.daily.map((d) => {
    const cats = ACTIVITY_CATEGORIES.map((c) => d.minutesByCategory[c.key] ?? 0);
    const nonZero = cats.filter((v) => v > 0).length;
    const entropy = nonZero; // proxy: more categories = more balanced
    return { ...d, entropy };
  });

  const activeDays = dayStats.filter((d) => d.totalMinutes > 0);
  const bestDay = activeDays.length
    ? activeDays.reduce((a, b) => (a.entropy > b.entropy ? a : b))
    : null;
  const worstDay = activeDays.length
    ? activeDays.reduce((a, b) => (a.totalMinutes > b.totalMinutes ? a : b))
    : null;

  const dayName = (idx: number) =>
    format(addDays(weekStart, idx), 'EEE d', { locale: es });

  // Chart data — convert minutes to hours for readability
  const chartData = balance.daily.map((d, i) => ({
    day: format(addDays(weekStart, i), 'EEE', { locale: es }),
    Trabajo: minutesToHours(d.minutesByCategory.work ?? 0),
    Ejercicio: minutesToHours(d.minutesByCategory.exercise ?? 0),
    Ocio: minutesToHours(d.minutesByCategory.leisure ?? 0),
    Facultad: minutesToHours(d.minutesByCategory.university ?? 0),
  }));

  const CHART_COLORS: Record<string, string> = {
    Trabajo: '#60a5fa',
    Ejercicio: '#4ade80',
    Ocio: '#ff6eb5',
    Facultad: '#a78bfa',
  };

  const recommendation = buildRecommendation(ratios, balance.score, totalMinutes);

  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Row 1: Score + Recommendation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Score card */}
        <div style={CARD}>
          <div style={LABEL}>Balance semanal</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 60, fontWeight: 700, letterSpacing: -3, lineHeight: 1, color: '#f5f5f5' }}>
              {balance.score}
            </span>
            <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                background: level.bg, color: level.color, border: `1px solid ${level.color}40`,
                letterSpacing: '0.03em', whiteSpace: 'nowrap',
              }}>
                {level.label}
              </span>
              <span style={{ fontSize: 11, color: '#444' }}>{totalHours}h planificadas</span>
            </div>
          </div>

          {/* Score track */}
          <div style={{ height: 5, background: '#1e1e1e', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{
              width: `${balance.score}%`, height: '100%', borderRadius: 99,
              background: `linear-gradient(90deg, #c94fa8, ${level.color})`,
              transition: 'width 0.5s ease',
            }} />
          </div>

          {/* Scale labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            {SCORE_LEVELS.map((l) => (
              <span key={l.label} style={{
                fontSize: 9, color: l.color === level.color ? l.color : '#333',
                fontWeight: l.color === level.color ? 700 : 400,
                letterSpacing: '0.02em',
              }}>
                {l.label}
              </span>
            ))}
          </div>

          {/* Best / worst day */}
          {(bestDay || worstDay) && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px solid #1e1e1e' }}>
              {bestDay && (
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 9, color: '#444', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
                    Más equilibrado
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#4ade80' }}>
                    {dayName(bestDay.dayIndex)}
                  </p>
                </div>
              )}
              {worstDay && (
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 9, color: '#444', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
                    Más cargado
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#f97316' }}>
                    {dayName(worstDay.dayIndex)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recommendation card */}
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={LABEL}>Recomendación</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#ccc', flex: 1, display: 'flex', alignItems: 'center' }}>
            {recommendation}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: '1px solid #1e1e1e' }}>
            {categoryData.map((c) => {
              const targetPct = Math.round(c.target * 100);
              const actualPct = Math.round(c.ratio * 100);
              const ok = Math.abs(actualPct - targetPct) <= 8;
              return (
                <span key={c.key} style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                  background: ok ? `${c.color}18` : '#1e1e1e',
                  color: ok ? c.color : '#444',
                  border: `1px solid ${ok ? c.color + '40' : '#2a2a2a'}`,
                }}>
                  {c.label} {actualPct}%
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Categories + Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12 }}>

        {/* Category breakdown */}
        <div style={CARD}>
          <div style={LABEL}>
            Por categoría
            {previousBalance && (
              <span style={{ marginLeft: 6, color: '#333', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                vs semana anterior
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {categoryData.map((c) => {
              const pct = Math.round(c.ratio * 100);
              const targetPct = Math.round(c.target * 100);
              const deviation = pct - targetPct;
              return (
                <div key={c.key}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: c.color }}>
                      {c.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Delta current={c.hours} previous={c.prevHours} />
                      <span style={{ fontSize: 11, color: '#888' }}>{c.hours}h</span>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 99,
                        background: '#1e1e1e',
                        color: Math.abs(deviation) <= 8 ? '#4ade80' : deviation > 0 ? '#f97316' : '#888',
                      }}>
                        {pct}% <span style={{ color: '#333' }}>/ {targetPct}%</span>
                      </span>
                    </div>
                  </div>

                  {/* Dual bar: actual vs target */}
                  <div style={{ position: 'relative', height: 5, background: '#1e1e1e', borderRadius: 99, overflow: 'hidden' }}>
                    {/* Target marker */}
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, left: 0,
                      width: `${targetPct}%`,
                      borderRight: `1.5px solid ${c.color}40`,
                      pointerEvents: 'none',
                      zIndex: 2,
                    }} />
                    {/* Actual fill */}
                    <div style={{
                      width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 99,
                      background: c.color,
                      opacity: 0.85,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stacked bar chart */}
        <div style={CARD}>
          <div style={LABEL}>Distribución diaria (horas)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={20} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="day"
                tick={{ fill: '#555', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#444', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}h`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              {Object.entries(CHART_COLORS).map(([name, color]) => (
                <Bar key={name} dataKey={name} stackId="a" fill={color} fillOpacity={0.85} />
              ))}
            </BarChart>
          </ResponsiveContainer>

          {/* Chart legend */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            {Object.entries(CHART_COLORS).map(([name, color]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color, opacity: 0.85 }} />
                <span style={{ fontSize: 10, color: '#555' }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
