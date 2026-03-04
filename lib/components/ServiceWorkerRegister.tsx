'use client'

import { useEffect } from 'react';
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { OfflineBanner } from '@/components/layout/offline-banner'

export function ServiceWorkerRegister() {
  useEffect(() => {
    const shouldEnableServiceWorker = process.env.NEXT_PUBLIC_ENABLE_SW === '1'
    const shouldHardResetServiceWorker = process.env.NEXT_PUBLIC_SW_HARD_RESET === '1'

    const onLoad = async () => {
      try {
        if (!('serviceWorker' in navigator)) return

        const getRegistrations = navigator.serviceWorker.getRegistrations?.bind(navigator.serviceWorker)
        const registrations = getRegistrations ? await getRegistrations() : []

        if (!shouldEnableServiceWorker) {
          await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)))
          return
        }

        if (shouldHardResetServiceWorker) {
          await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)))

          if ('caches' in globalThis && globalThis.caches?.keys) {
            const keys = await globalThis.caches.keys()
            await Promise.all(
              keys.filter((key) => key.startsWith('cc-')).map((key) => globalThis.caches.delete(key))
            )
          }
        }

        const registration = await navigator.serviceWorker.register('/sw.js')
        await registration.update?.()
      } catch (error) {
        console.error('Service Worker setup failed:', error)
      }
    }

    if (document.readyState === 'complete') {
      void onLoad()
      return
    }

    window.addEventListener('load', onLoad, { once: true })
    return () => window.removeEventListener('load', onLoad)
  }, []);

  return (
    <>
      <InstallPrompt />
      <OfflineBanner />
    </>
  );
}
