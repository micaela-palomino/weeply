import { useCallback, useState } from 'react';
import { DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { ScheduleEvent } from '@/types/schedule';

export type UseDragCalendarOptions = {
  onMoveEvent: (eventId: string, newStartAtMs: number) => void;
};

export function useDragCalendar({ onMoveEvent }: UseDragCalendarOptions) {
  const [draggingEvent, setDraggingEvent] = useState<ScheduleEvent | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // require 8px movement before drag activates — click still fires normally
      activationConstraint: { distance: 8 },
    }),
  );

  const onDragStart = useCallback((e: DragStartEvent) => {
    const ev = e.active.data.current?.event as ScheduleEvent | undefined;
    setDraggingEvent(ev ?? null);
  }, []);

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { over } = e;
      const ev = e.active.data.current?.event as ScheduleEvent | undefined;
      if (over && ev) {
        const data = over.data.current as { newStartAtMs: number } | undefined;
        if (data?.newStartAtMs != null) {
          onMoveEvent(ev.id, data.newStartAtMs);
        }
      }
      setDraggingEvent(null);
    },
    [onMoveEvent],
  );

  const onDragCancel = useCallback(() => setDraggingEvent(null), []);

  return { sensors, draggingEvent, onDragStart, onDragEnd, onDragCancel };
}
