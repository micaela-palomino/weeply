'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ActivityCategoryKey, RecurrenceRule, RecurrenceType, ScheduleEvent, WeekDayKey } from '@/types/schedule';
import { ACTIVITY_CATEGORIES } from '@/constants/schedule';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SavePayload = {
  title: string;
  category: ActivityCategoryKey;
  startAtMs: number;
  durationMinutes: number;
  isImportant: boolean;
  isDone: boolean;
  recurrence?: RecurrenceRule;
};

export type EventDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialStartAtMs: number;
  initialDurationMinutes: number;
  event?: ScheduleEvent;
  onClose: () => void;
  onSave: (payload: SavePayload) => Promise<void>;
  onDelete?: () => Promise<void>;
  onFindFreeSlots?: (durationMinutes: number) => Promise<number[]>;
  isSaving: boolean;
  isDeleting: boolean;
};

const toDateString = (ms: number) => {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toTimeString = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const combineDateTime = (dateStr: string, timeStr: string): number => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year!, month! - 1, day, hours, minutes, 0, 0).getTime();
};

const categoryLabel = (key: ActivityCategoryKey): string => {
  const map: Record<ActivityCategoryKey, string> = {
    work: 'Trabajo',
    exercise: 'Ejercicio',
    leisure: 'Ocio',
    university: 'Facultad',
  };
  return map[key];
};

const WEEK_DAYS: { key: WeekDayKey; label: string }[] = [
  { key: 'mon', label: 'Lu' },
  { key: 'tue', label: 'Ma' },
  { key: 'wed', label: 'Mi' },
  { key: 'thu', label: 'Ju' },
  { key: 'fri', label: 'Vi' },
  { key: 'sat', label: 'Sa' },
  { key: 'sun', label: 'Do' },
];

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'once', label: 'Una vez' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'custom', label: 'Personalizado' },
];

const inputStyle: React.CSSProperties = {
  background: '#0f0f0f',
  border: '1px solid #2a2a2a',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 13,
  color: '#f5f5f5',
  fontFamily: 'inherit',
  width: '100%',
  outline: 'none',
};

export const EventDialog = ({
  open,
  mode,
  initialStartAtMs,
  initialDurationMinutes,
  event,
  onClose,
  onSave,
  onDelete,
  onFindFreeSlots,
  isSaving,
  isDeleting,
}: EventDialogProps) => {
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState<ActivityCategoryKey>('work');
  const [dateStr, setDateStr] = React.useState('');
  const [startTime, setStartTime] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [isImportant, setIsImportant] = React.useState(false);
  const [isDone, setIsDone] = React.useState(false);
  const [recurrenceType, setRecurrenceType] = React.useState<RecurrenceType>('once');
  const [weeklyInterval, setWeeklyInterval] = React.useState(1);
  const [selectedDays, setSelectedDays] = React.useState<Set<WeekDayKey>>(new Set());
  const [freeSlots, setFreeSlots] = React.useState<number[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setFreeSlots([]);
    setRecurrenceType('once');
    setWeeklyInterval(1);
    setSelectedDays(new Set());

    const startMs = event ? event.startAtMs : initialStartAtMs;
    const endMs = event
      ? event.startAtMs + event.durationMinutes * 60_000
      : initialStartAtMs + initialDurationMinutes * 60_000;

    setTitle(event?.title ?? '');
    setCategory(event?.category ?? 'work');
    setDateStr(toDateString(startMs));
    setStartTime(toTimeString(startMs));
    setEndTime(toTimeString(endMs));
    setIsImportant(event?.isImportant ?? false);
    setIsDone(event?.isDone ?? false);

    if (event?.recurrence) {
      setRecurrenceType(event.recurrence.type);
      setWeeklyInterval(event.recurrence.interval ?? 1);
      setSelectedDays(new Set(event.recurrence.days ?? []));
    }
  }, [open, event, initialStartAtMs, initialDurationMinutes]);

  const toggleDay = (day: WeekDayKey) =>
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });

  const computedStartAtMs = React.useMemo(
    () => (dateStr && startTime ? combineDateTime(dateStr, startTime) : 0),
    [dateStr, startTime],
  );

  const computedEndAtMs = React.useMemo(
    () => (dateStr && endTime ? combineDateTime(dateStr, endTime) : 0),
    [dateStr, endTime],
  );

  const durationMinutes = React.useMemo(() => {
    if (!computedStartAtMs || !computedEndAtMs) return 0;
    return Math.max(15, Math.round((computedEndAtMs - computedStartAtMs) / 60_000));
  }, [computedStartAtMs, computedEndAtMs]);

  const buildRecurrence = (): RecurrenceRule | undefined => {
    if (mode !== 'create' || recurrenceType === 'once') return undefined;
    return {
      type: recurrenceType,
      interval: recurrenceType === 'weekly' ? weeklyInterval : undefined,
      days: recurrenceType === 'custom' ? [...selectedDays] : undefined,
    };
  };

  const handleFindFreeSlots = async () => {
    if (!onFindFreeSlots) return;
    setLoadingSlots(true);
    try {
      const slots = await onFindFreeSlots(durationMinutes || 60);
      setFreeSlots(slots);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleMoveToSlot = (slotMs: number) => {
    setDateStr(toDateString(slotMs));
    setStartTime(toTimeString(slotMs));
    const endMs = slotMs + Math.max(15, durationMinutes) * 60_000;
    setEndTime(toTimeString(endMs));
    setFreeSlots([]);
  };

  const isValid = durationMinutes >= 15 && !!computedStartAtMs;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nueva actividad' : 'Editar actividad'}
          </DialogTitle>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitError(null);
            if (!isValid) {
              setSubmitError('Duración mínima 15 minutos.');
              return;
            }
            try {
              await onSave({
                title,
                category,
                startAtMs: computedStartAtMs,
                durationMinutes,
                isImportant,
                isDone,
                recurrence: buildRecurrence(),
              });
              onClose();
            } catch (err) {
              setSubmitError(
                err instanceof Error ? err.message : 'No se pudo guardar la actividad.',
              );
            }
          }}
        >
          {/* Title + important star */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="ev-title">
                Nombre
              </label>
              <button
                type="button"
                className={`text-xl transition-opacity ${isImportant ? 'opacity-100' : 'opacity-25 hover:opacity-60'}`}
                onClick={() => setIsImportant((v) => !v)}
                title="Marcar como importante"
              >
                ⭐
              </button>
            </div>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Trabajo profundo"
              required
              maxLength={80}
            />
          </div>

          {/* Category */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Categoría</label>
            <Select value={category} onValueChange={(v) => setCategory(v as ActivityCategoryKey)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {categoryLabel(c.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date + time range */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Fecha y horario</label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              style={inputStyle}
            />
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ ...inputStyle, flex: 1, width: 'auto' }}
              />
              <span className="text-sm text-muted-foreground">→</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ ...inputStyle, flex: 1, width: 'auto' }}
              />
            </div>
            {durationMinutes > 0 && (
              <p className="text-xs text-muted-foreground">{durationMinutes} min</p>
            )}
          </div>

          {/* Recurrence (create only) */}
          {mode === 'create' && (
            <div className="space-y-3 rounded-lg border border-border/50 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Repetición
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {RECURRENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRecurrenceType(opt.value)}
                    style={{
                      background: recurrenceType === opt.value ? '#ff6eb515' : '#1e1e1e',
                      border: `1px solid ${recurrenceType === opt.value ? '#ff6eb560' : '#2a2a2a'}`,
                      borderRadius: 7,
                      padding: '5px 10px',
                      fontSize: 12,
                      fontWeight: recurrenceType === opt.value ? 600 : 400,
                      color: recurrenceType === opt.value ? '#ff6eb5' : '#888',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'center',
                      transition: 'all 0.12s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {recurrenceType === 'weekly' && (
                <div className="flex items-center gap-2 pl-1">
                  <span style={{ fontSize: 12, color: '#888' }}>Cada</span>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={weeklyInterval}
                    onChange={(e) => setWeeklyInterval(Math.max(1, Number(e.target.value)))}
                    style={{
                      width: 52,
                      background: '#0f0f0f',
                      border: '1px solid #2a2a2a',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 13,
                      color: '#f5f5f5',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 12, color: '#888' }}>semana(s)</span>
                </div>
              )}

              {recurrenceType === 'custom' && (
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {WEEK_DAYS.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDay(d.key)}
                      style={{
                        background: selectedDays.has(d.key) ? '#ff6eb515' : '#1e1e1e',
                        border: `1px solid ${selectedDays.has(d.key) ? '#ff6eb560' : '#2a2a2a'}`,
                        borderRadius: 6,
                        width: 34,
                        height: 34,
                        fontSize: 11,
                        fontWeight: 600,
                        color: selectedDays.has(d.key) ? '#ff6eb5' : '#555',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.12s',
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Done + free slot (edit only) */}
          {mode === 'edit' && (
            <div className="space-y-3 rounded-lg border border-border/50 p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={(e) => {
                    setIsDone(e.target.checked);
                    setFreeSlots([]);
                  }}
                  className="accent-primary"
                />
                <span className="text-sm font-medium">
                  {isDone ? '✅ Realizada' : 'Marcar como realizada'}
                </span>
              </label>

              {!isDone && onFindFreeSlots && (
                <button
                  type="button"
                  className="text-xs text-primary underline underline-offset-2 disabled:opacity-50"
                  disabled={loadingSlots}
                  onClick={handleFindFreeSlots}
                >
                  {loadingSlots ? 'Buscando...' : 'Buscar otro espacio libre esta semana'}
                </button>
              )}

              {freeSlots.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Espacios disponibles:</p>
                  {freeSlots.map((slotMs) => (
                    <button
                      key={slotMs}
                      type="button"
                      className="block w-full text-left rounded-md border border-primary/40 px-2 py-1.5 text-xs hover:bg-primary/10 transition-colors"
                      onClick={() => handleMoveToSlot(slotMs)}
                    >
                      {format(new Date(slotMs), "EEE d MMM · HH:mm", { locale: es })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          <DialogFooter>
            {mode === 'edit' && onDelete && (
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleting || isSaving}
                onClick={async () => {
                  setSubmitError(null);
                  try {
                    await onDelete();
                    onClose();
                  } catch (err) {
                    setSubmitError(
                      err instanceof Error ? err.message : 'No se pudo borrar la actividad.',
                    );
                  }
                }}
              >
                {isDeleting ? 'Borrando...' : 'Borrar'}
              </Button>
            )}
            <Button type="submit" disabled={isSaving || !isValid}>
              {isSaving ? 'Guardando...' : mode === 'create' ? 'Crear' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
