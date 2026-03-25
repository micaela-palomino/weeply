'use client';

import * as React from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarTimeline } from '@/components/calendar/CalendarTimeline';
import { WeeklyIndicators } from '@/components/calendar/WeeklyIndicators';
import { EventDialog } from '@/components/calendar/EventDialog';
import type { CreateScheduleEventInput, ScheduleEvent } from '@/types/schedule';
import type { UpdateScheduleEventInput } from '@/types/schedule';
import {
  WEEK_STARTS_ON,
} from '@/constants/schedule';
import { MockEventStore } from '@/services/schedule/MockEventStore';
import { ScheduleService } from '@/services/schedule/ScheduleService';
import type { ServiceResult } from '@/services/schedule/ScheduleService';
import { Button } from '@/components/ui/button';

type DialogState =
  | { mode: 'create'; startAtMs: number }
  | { mode: 'edit'; event: ScheduleEvent };

const getInitialWeekStartAtMs = () =>
  startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON }).getTime();

export const WeekCalendar = () => {
  const queryClient = useQueryClient();

  const [weekStartAtMs, setWeekStartAtMs] = React.useState(() => getInitialWeekStartAtMs());
  const [dialogState, setDialogState] = React.useState<DialogState | null>(null);
  const weekStartDate = React.useMemo(() => new Date(weekStartAtMs), [weekStartAtMs]);

  const store = React.useMemo(() => new MockEventStore(), []);
  const service = React.useMemo(() => new ScheduleService(store), [store]);

  const query = useQuery({
    queryKey: ['week', weekStartAtMs],
    queryFn: () => service.getWeekWithBalance(weekStartAtMs),
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateScheduleEventInput) => {
      const res: ServiceResult<ScheduleEvent> = await service.createEvent(input);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['week', weekStartAtMs] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ eventId, input }: { eventId: string; input: UpdateScheduleEventInput }) => {
      const res = await service.updateEvent(eventId, input);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['week', weekStartAtMs] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await service.deleteEvent(eventId);
      if (!res.ok) throw new Error(res.error);
      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['week', weekStartAtMs] });
    },
  });

  const rangeLabel = React.useMemo(() => {
    const end = addDays(weekStartDate, 6);
    return `${format(weekStartDate, 'd MMM', { locale: es })} - ${format(end, 'd MMM', { locale: es })}`;
  }, [weekStartDate]);

  const events = query.data?.events ?? [];
  const balance = query.data?.balance;

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Calendario semanal</h1>
          <p className="mt-1 text-sm text-muted-foreground">{rangeLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setWeekStartAtMs((prev) => addDays(new Date(prev), -7).getTime())}
          >
            ← Semana
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setWeekStartAtMs(getInitialWeekStartAtMs())}
          >
            Hoy
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setWeekStartAtMs((prev) => addDays(new Date(prev), 7).getTime())}
          >
            Semana →
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border/50 bg-card p-3">
        <CalendarTimeline
          weekStartAtMs={weekStartAtMs}
          events={events}
          onSlotClick={(startAtMs) => setDialogState({ mode: 'create', startAtMs })}
          onEventClick={(event) => setDialogState({ mode: 'edit', event })}
        />
      </div>

      {balance && <WeeklyIndicators balance={balance} />}

      <EventDialog
        open={dialogState !== null}
        mode={dialogState?.mode ?? 'create'}
        startAtMs={dialogState?.mode === 'edit' ? dialogState.event.startAtMs : dialogState?.startAtMs ?? weekStartAtMs}
        event={dialogState?.mode === 'edit' ? dialogState.event : undefined}
        isSaving={createMutation.isPending || updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        onClose={() => setDialogState(null)}
        onSave={async (payload) => {
          if (!dialogState) return;
          if (dialogState.mode === 'create') {
            await createMutation.mutateAsync({
              title: payload.title,
              category: payload.category,
              startAtMs: dialogState.startAtMs,
              durationMinutes: payload.durationMinutes,
            });
            return;
          }

          await updateMutation.mutateAsync({
            eventId: dialogState.event.id,
            input: {
              title: payload.title,
              category: payload.category,
              durationMinutes: payload.durationMinutes,
            },
          });
        }}
        onDelete={
          dialogState?.mode === 'edit' && dialogState.event
            ? async () => {
                await deleteMutation.mutateAsync(dialogState.event.id);
              }
            : undefined
        }
      />
    </div>
  );
};

