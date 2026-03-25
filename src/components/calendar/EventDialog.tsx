'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ActivityCategoryKey } from '@/types/schedule';
import type { ScheduleEvent } from '@/types/schedule';
import {
  ACTIVITY_CATEGORIES,
  EVENT_DURATION_OPTIONS_MINUTES,
  TIME_SLOT_MINUTES,
} from '@/constants/schedule';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

type SavePayload = {
  title: string;
  category: ActivityCategoryKey;
  durationMinutes: number;
};

export type EventDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  startAtMs: number;
  event?: ScheduleEvent;
  onClose: () => void;
  onSave: (payload: SavePayload) => Promise<void>;
  onDelete?: () => Promise<void>;
  isSaving: boolean;
  isDeleting: boolean;
};

const endAtLabel = (startAtMs: number, durationMinutes: number) =>
  format(new Date(startAtMs + durationMinutes * 60_000), 'HH:mm', { locale: es });

export const EventDialog = ({
  open,
  mode,
  startAtMs,
  event,
  onClose,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: EventDialogProps) => {
  const [title, setTitle] = React.useState(event?.title ?? '');
  const [category, setCategory] = React.useState<ActivityCategoryKey>(event?.category ?? 'work');
  const [durationMinutes, setDurationMinutes] = React.useState<number>(
    event?.durationMinutes ?? EVENT_DURATION_OPTIONS_MINUTES[1] ?? 60,
  );
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setTitle(event?.title ?? '');
    setCategory(event?.category ?? 'work');
    setDurationMinutes(event?.durationMinutes ?? EVENT_DURATION_OPTIONS_MINUTES[1] ?? 60);
  }, [open, event]);

  const endLabel = endAtLabel(startAtMs, durationMinutes);
  const startLabel = format(new Date(startAtMs), 'HH:mm', { locale: es });

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nueva actividad' : 'Editar actividad'}</DialogTitle>
          <DialogDescription>
            {format(new Date(startAtMs), 'EEEE d MMMM', { locale: es })} · {startLabel} - {endLabel}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitError(null);
            try {
              await onSave({ title, category, durationMinutes });
              onClose();
            } catch (err) {
              setSubmitError(err instanceof Error ? err.message : 'No se pudo guardar la actividad.');
            }
          }}
        >
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="title">
              Nombre
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Trabajo profundo"
              required
              maxLength={80}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Categoría</label>
            <Select value={category} onValueChange={(v) => setCategory(v as ActivityCategoryKey)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.key === 'work' ? 'Trabajo' : c.key === 'exercise' ? 'Ejercicio' : 'Ocio'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Duración</label>
            <Select
              value={String(durationMinutes)}
              onValueChange={(v) => setDurationMinutes(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar duración" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_DURATION_OPTIONS_MINUTES.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              Alineado a la grilla de {TIME_SLOT_MINUTES} min.
            </div>
          </div>

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
                    setSubmitError(err instanceof Error ? err.message : 'No se pudo borrar la actividad.');
                  }
                }}
              >
                {isDeleting ? 'Borrando...' : 'Borrar'}
              </Button>
            )}

            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando...' : mode === 'create' ? 'Crear' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

