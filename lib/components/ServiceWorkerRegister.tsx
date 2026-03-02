'use client'

import { useEffect } from 'react';
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { OfflineBanner } from '@/components/layout/offline-banner'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const shouldEnableServiceWorker = process.env.NEXT_PUBLIC_ENABLE_SW === '1';

    window.addEventListener('load', () => {
      // Always clear stale registrations/caches first to avoid serving old portal shells.
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => undefined);

      if ('caches' in window) {
        caches.keys()
          .then((keys) => Promise.all(keys.filter((key) => key.startsWith('cc-')).map((key) => caches.delete(key))))
          .catch(() => undefined);
      }

      if (!shouldEnableServiceWorker) return;

      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => registration.update())
        .catch(error => console.error('Service Worker registration failed:', error));
    });
  }, []);

  return (
    <>
      <InstallPrompt />
      <OfflineBanner />
    </>
  );
}
