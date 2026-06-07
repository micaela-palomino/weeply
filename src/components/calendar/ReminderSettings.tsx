'use client';

import * as React from 'react';
import type { ReminderSettings } from '@/hooks/useEventReminders';
import { MINUTES_OPTIONS } from '@/hooks/useEventReminders';

type Props = {
  settings: ReminderSettings;
  permission: NotificationPermission;
  onUpdate: (patch: Partial<ReminderSettings>) => void;
  onRequestPermission: () => Promise<NotificationPermission | undefined>;
};

const pill: React.CSSProperties = {
  flex: 1,
  padding: '5px 0',
  borderRadius: 7,
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  border: '1px solid transparent',
  transition: 'all 0.12s',
};

export function ReminderSettings({ settings, permission, onUpdate, onRequestPermission }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell toggle */}
      <button
        type="button"
        title="Recordatorios"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'relative',
          background: settings.enabled ? '#ff6eb515' : '#151515',
          border: `1px solid ${settings.enabled ? '#ff6eb540' : '#2a2a2a'}`,
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 15,
          lineHeight: 1,
          color: settings.enabled ? '#ff6eb5' : '#555',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#ff6eb5')}
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = settings.enabled ? '#ff6eb540' : '#2a2a2a')
        }
      >
        🔔
        {settings.enabled && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#ff6eb5',
              display: 'block',
              border: '1.5px solid #0f0f0f',
            }}
          />
        )}
      </button>

      {open && (
        <>
          {/* Click-away backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              zIndex: 50,
              background: '#151515',
              border: '1px solid #2a2a2a',
              borderRadius: 12,
              padding: 16,
              width: 272,
              boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#f5f5f5',
                letterSpacing: 0.5,
                marginBottom: 12,
                textTransform: 'uppercase',
              }}
            >
              Recordatorios
            </p>

            {/* Enable toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 14,
                cursor: 'pointer',
              }}
              onClick={() => onUpdate({ enabled: !settings.enabled })}
            >
              <div
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: settings.enabled ? '#ff6eb5' : '#2a2a2a',
                  position: 'relative',
                  flexShrink: 0,
                  transition: 'background 0.2s',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: settings.enabled ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.18s',
                  }}
                />
              </div>
              <span style={{ fontSize: 13, color: settings.enabled ? '#f5f5f5' : '#666' }}>
                {settings.enabled ? 'Activados' : 'Desactivados'}
              </span>
            </div>

            {settings.enabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Permission state */}
                {permission === 'default' && (
                  <div
                    style={{
                      background: '#ff6eb510',
                      border: '1px solid #ff6eb530',
                      borderRadius: 8,
                      padding: '8px 10px',
                    }}
                  >
                    <p style={{ fontSize: 11, color: '#ff9ccc', marginBottom: 6 }}>
                      Permitir notificaciones del navegador para recibir alertas.
                    </p>
                    <button
                      type="button"
                      onClick={() => void onRequestPermission()}
                      style={{
                        background: '#ff6eb5',
                        color: '#0f0f0f',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 12px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Permitir
                    </button>
                  </div>
                )}

                {permission === 'denied' && (
                  <p style={{ fontSize: 11, color: '#666' }}>
                    Permiso denegado. Habilitalo en la configuración del navegador.
                  </p>
                )}

                {permission === 'granted' && (
                  <p style={{ fontSize: 11, color: '#4ade80' }}>
                    ✓ Notificaciones activas
                  </p>
                )}

                {/* Minutes before */}
                <div>
                  <p style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
                    Avisar con anticipación
                  </p>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {MINUTES_OPTIONS.map((min) => {
                      const active = settings.minutesBefore === min;
                      return (
                        <button
                          key={min}
                          type="button"
                          onClick={() => onUpdate({ minutesBefore: min })}
                          style={{
                            ...pill,
                            background: active ? '#ff6eb515' : '#1e1e1e',
                            borderColor: active ? '#ff6eb560' : '#2a2a2a',
                            color: active ? '#ff6eb5' : '#555',
                          }}
                        >
                          {min}m
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Email section */}
                <div
                  style={{
                    borderTop: '1px solid #1e1e1e',
                    paddingTop: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={settings.emailEnabled}
                      onChange={(e) => onUpdate({ emailEnabled: e.target.checked })}
                      style={{ accentColor: '#ff6eb5' }}
                    />
                    <span style={{ fontSize: 12, color: '#ccc' }}>Aviso por email</span>
                  </label>

                  {settings.emailEnabled && (
                    <>
                      <input
                        type="email"
                        value={settings.email}
                        onChange={(e) => onUpdate({ email: e.target.value })}
                        placeholder="tu@email.com"
                        style={{
                          background: '#0f0f0f',
                          border: '1px solid #2a2a2a',
                          borderRadius: 6,
                          padding: '6px 10px',
                          fontSize: 12,
                          color: '#f5f5f5',
                          fontFamily: 'inherit',
                          outline: 'none',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      />
                      <p style={{ fontSize: 10, color: '#444' }}>
                        Sin backend: abre tu cliente de email al disparar el recordatorio.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
