'use client';

import * as React from 'react';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { WeeklyBalance } from '@/types/schedule';
import { ACTIVITY_CATEGORIES, CATEGORY_COLOR_MAP } from '@/constants/schedule';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export type WeeklyIndicatorsProps = {
  balance: WeeklyBalance;
};

const scoreColor = (label: WeeklyBalance['label']) => {
  switch (label) {
    case 'low':
      return '#ef4444'; // red-500
    case 'balanced':
      return '#f59e0b'; // amber-500
    case 'high':
      return '#22c55e'; // green-500
  }
};

export const WeeklyIndicators = ({ balance }: WeeklyIndicatorsProps) => {
  const weekStart = React.useMemo(() => new Date(balance.weekStartAtMs), [balance.weekStartAtMs]);
  const color = scoreColor(balance.label);

  const totalMinutesWeek = balance.daily.reduce((acc, d) => acc + d.totalMinutes, 0);

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Balance semanal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Badge
              className="border-none"
              style={{
                backgroundColor: color,
                color: 'white',
              }}
            >
              {balance.label === 'low' ? 'Carga baja' : balance.label === 'balanced' ? 'Balance' : 'Carga saludable'}
            </Badge>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Score</div>
              <div className="text-2xl font-semibold">{balance.score}</div>
            </div>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${balance.score}%`,
                backgroundColor: color,
              }}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Minutos planificados esta semana: <span className="font-semibold text-foreground">{totalMinutesWeek}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Totales por día</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {balance.daily.map((day) => {
            const dayDate = addDays(weekStart, day.dayIndex);
            return (
              <div key={day.dayIndex} className="rounded-lg border border-border/50 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {format(dayDate, 'EEE d', { locale: es })}
                  </div>
                  <div className="text-xs text-muted-foreground">{day.totalMinutes} min</div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {ACTIVITY_CATEGORIES.map((c) => {
                    const minutes = day.minutesByCategory[c.key];
                    const cColor = CATEGORY_COLOR_MAP[c.key];

                    return (
                      <div
                        key={c.key}
                        className="rounded-full px-2 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: `${cColor}22`,
                          color: cColor,
                          border: `1px solid ${cColor}55`,
                        }}
                        title={`${c.key}: ${minutes} min`}
                      >
                        {c.key === 'work' ? 'Trabajo' : c.key === 'exercise' ? 'Ejercicio' : 'Ocio'}: {minutes}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

