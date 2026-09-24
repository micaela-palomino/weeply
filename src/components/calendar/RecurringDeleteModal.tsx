'use client';

import * as React from 'react';
import { X } from 'lucide-react';

export type RecurringDeleteMode = 'single' | 'thisAndFuture' | 'all';

type Props = {
  onSelect: (mode: RecurringDeleteMode) => void;
  onClose: () => void;
};

export function RecurringDeleteModal({ onSelect, onClose }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#151515',
          border: '1px solid #2a2a2a',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 360,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f5', margin: 0 }}>
            Eliminar evento recurrente
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 2, display: 'flex', alignItems: 'center' }}
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
          ¿Qué instancias querés eliminar?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([
            { mode: 'single' as const, label: 'Solo este día', desc: 'Elimina únicamente esta ocurrencia' },
            { mode: 'thisAndFuture' as const, label: 'Este y siguientes', desc: 'Elimina esta y todas las futuras' },
            { mode: 'all' as const, label: 'Todos', desc: 'Elimina todos los eventos de la serie' },
          ]).map(({ mode, label, desc }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSelect(mode)}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: mode === 'all' ? '#ef444410' : '#1e1e1e',
                border: `1px solid ${mode === 'all' ? '#ef444440' : '#2a2a2a'}`,
                transition: 'border-color 0.12s, background 0.12s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: mode === 'all' ? '#ef4444' : '#d4d4d4', marginBottom: 2 }}>
                {label}
              </div>
              <div style={{ fontSize: 11, color: '#555' }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
