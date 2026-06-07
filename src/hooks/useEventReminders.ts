import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScheduleEvent } from '@/types/schedule';

export interface ReminderSettings {
  enabled: boolean;
  minutesBefore: number;
  emailEnabled: boolean;
  email: string;
}

export const MINUTES_OPTIONS = [5, 15, 30, 60] as const;
export type MinutesOption = (typeof MINUTES_OPTIONS)[number];

const SETTINGS_KEY = 'weeply:reminderSettings';

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  minutesBefore: 15,
  emailEnabled: false,
  email: '',
};

function loadSettings(): ReminderSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<ReminderSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(s: ReminderSettings): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }
}

export function useEventReminders(events: ScheduleEvent[]) {
  const [settings, setSettingsState] = useState<ReminderSettings>(loadSettings);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  // Tracks already-fired notifications to prevent double-firing
  const notifiedRef = useRef<Set<string>>(new Set());

  // Sync permission state from browser
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const updateSettings = useCallback((patch: Partial<ReminderSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      persistSettings(next);
      return next;
    });
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission | undefined> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return undefined;
    const perm = await Notification.requestPermission();
    setPermission(perm);
    return perm;
  }, []);

  // Main reminder loop — checks every minute
  useEffect(() => {
    if (!settings.enabled) return;

    const check = () => {
      const now = Date.now();
      const reminderMs = settings.minutesBefore * 60_000;

      for (const ev of events) {
        if (ev.isDone) continue;

        const msUntilEvent = ev.startAtMs - now;
        // Only fire if event is in the future and within the reminder window
        if (msUntilEvent <= 0 || msUntilEvent > reminderMs) continue;

        const key = `${ev.id}__${settings.minutesBefore}`;
        if (notifiedRef.current.has(key)) continue;
        notifiedRef.current.add(key);

        const minutesLeft = Math.max(1, Math.ceil(msUntilEvent / 60_000));
        const bodyText =
          minutesLeft <= 1 ? 'Empieza ahora' : `Empieza en ${minutesLeft} min`;

        // Browser notification
        if (permission === 'granted') {
          new Notification(`⏰ ${ev.title}`, {
            body: bodyText,
            icon: '/icon-192.png',
            tag: key,
          });
        }

        // Email fallback: open mailto in a new tab (no backend — user's email client)
        if (settings.emailEnabled && settings.email) {
          const subject = encodeURIComponent(`Recordatorio Weeply: ${ev.title}`);
          const body = encodeURIComponent(
            `Tu actividad "${ev.title}" ${bodyText.toLowerCase()}.`,
          );
          window.open(
            `mailto:${settings.email}?subject=${subject}&body=${body}`,
            '_blank',
          );
        }
      }
    };

    check(); // immediate pass on mount/settings change
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [events, settings, permission]);

  return { settings, updateSettings, permission, requestPermission };
}
