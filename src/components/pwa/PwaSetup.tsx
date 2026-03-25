'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed' | 'unknown';
    platform: string;
  }>;
};

export const PwaSetup = () => {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallVisible, setIsInstallVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const onBeforeInstallPrompt = (e: Event) => {
      const evt = e as BeforeInstallPromptEvent;
      e.preventDefault();
      setDeferredPrompt(evt);
      setIsInstallVisible(true);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallVisible(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
    });
  }, []);

  const onInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      // User dismissed prompt or browser blocked it; we just hide the UI.
    }

    setDeferredPrompt(null);
    setIsInstallVisible(false);
  };

  if (!isInstallVisible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/95 p-3 shadow-sm backdrop-blur">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">Instala Weeply</div>
          <div className="truncate text-xs text-muted-foreground">Para usarlo offline y más rápido.</div>
        </div>
        <Button onClick={onInstall} type="button">
          Instalar
        </Button>
      </div>
    </div>
  );
};

