'use client';

import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';

type Props = {
  id: string;
  newStartAtMs: number;
  style?: React.CSSProperties;
};

export function DroppableCell({ id, newStartAtMs, style }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { newStartAtMs },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        // pointerEvents none = transparent to mouse — dnd uses getBoundingClientRect()
        pointerEvents: 'none',
        background: isOver ? 'rgba(255,110,181,0.18)' : 'transparent',
        borderRadius: isOver ? 6 : 0,
        transition: 'background 0.1s',
      }}
    />
  );
}
