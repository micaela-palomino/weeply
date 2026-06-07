'use client';

import * as React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { ScheduleEvent } from '@/types/schedule';

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'ref'> & {
  event: ScheduleEvent;
  disabled?: boolean;
};

export function DraggableEvent({ event, disabled, children, style, className, onClick, ...rest }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
    disabled: disabled ?? false,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...(!disabled ? listeners : {})}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (!disabled) {
          (listeners as unknown as Record<string, (e: React.PointerEvent) => void>)?.onPointerDown?.(e);
        }
      }}
      style={{
        ...style,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.2 : undefined,
        cursor: disabled ? 'pointer' : isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      className={className}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
