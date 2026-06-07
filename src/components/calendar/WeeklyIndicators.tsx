'use client';

import * as React from 'react';
import type { WeeklyBalance } from '@/types/schedule';
import { ACTIVITY_CATEGORIES, TARGET_CATEGORY_SHARE } from '@/constants/schedule';
import type { ActivityCategoryKey } from '@/types/schedule';

export type WeeklyIndicatorsProps = {
  balance: WeeklyBalance;
};

const scoreLabel = (label: WeeklyBalance['label']) => {
  switch (label) {
    case 'low': return 'Carga baja';
    case 'balanced': return 'Balanceado';
    case 'high': return 'Saludable';
  }
};

const scoreColor = (label: WeeklyBalance['label']) => {
  switch (label) {
    case 'low': return '#ef4444';
    case 'balanced': return '#f59e0b';
    case 'high': return '#4ade80';
  }
};

const CARD: React.CSSProperties = {
  background: '#151515',
  border: '1px solid #1e1e1e',
  borderRadius: 12,
  padding: '1.25rem',
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#555',
  marginBottom: 16,
};

export const WeeklyIndicators = ({ balance }: WeeklyIndicatorsProps) => {
  const totalMinutesWeek = balance.daily.reduce((acc, d) => acc + d.totalMinutes, 0);

  const weeklyByCategory = ACTIVITY_CATEGORIES.map((c) => ({
    ...c,
    minutes: balance.daily.reduce(
      (acc, d) => acc + (d.minutesByCategory[c.key as ActivityCategoryKey] ?? 0),
      0,
    ),
  }));

  const color = scoreColor(balance.label);
  const label = scoreLabel(balance.label);

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {/* Score card */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>Balance semanal</div>

        <div className="flex items-end gap-3 mb-4">
          <span
            style={{
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: -3,
              lineHeight: 1,
              color: '#f5f5f5',
            }}
          >
            {balance.score}
          </span>
          <div className="mb-1.5">
            <span
              style={{
                display: 'inline-block',
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 99,
                background: `${color}20`,
                color,
                border: `1px solid ${color}40`,
                letterSpacing: '0.02em',
              }}
            >
              {label}
            </span>
          </div>
        </div>

        <div style={{ height: 5, background: '#1e1e1e', borderRadius: 99, overflow: 'hidden' }}>
          <div
            style={{
              width: `${balance.score}%`,
              height: '100%',
              borderRadius: 99,
              background: 'linear-gradient(90deg, #c94fa8, #ff6eb5)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        <p style={{ marginTop: 10, fontSize: 12, color: '#555' }}>
          {totalMinutesWeek} min planificados esta semana
        </p>
      </div>

      {/* Categories card */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>Por categoría</div>

        <div className="space-y-3">
          {weeklyByCategory.map((c) => {
            const pct =
              totalMinutesWeek > 0 ? Math.round((c.minutes / totalMinutesWeek) * 100) : 0;
            const targetPct = Math.round(TARGET_CATEGORY_SHARE[c.key as ActivityCategoryKey] * 100);

            return (
              <div key={c.key}>
                <div
                  className="flex items-center justify-between"
                  style={{ marginBottom: 5 }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: c.color }}>
                    {c.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 11, color: '#555' }}>
                      {c.minutes} min
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: '#333',
                        background: '#1e1e1e',
                        padding: '1px 6px',
                        borderRadius: 99,
                      }}
                    >
                      {pct}% / {targetPct}%
                    </span>
                  </div>
                </div>

                <div style={{ height: 4, background: '#1e1e1e', borderRadius: 99, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      borderRadius: 99,
                      background: c.color,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
