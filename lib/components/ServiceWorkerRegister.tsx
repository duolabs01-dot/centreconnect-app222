'use client'

import { useEffect } from 'react';
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { OfflineBanner } from '@/components/layout/offline-banner'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => console.log('Service Worker registered with scope:', registration.scope))
          .catch(error => console.error('Service Worker registration failed:', error));
      });
    }
  }, []);

  return (
    <>
      <InstallPrompt />
      <OfflineBanner />
    </>
  );
}
