'use client'

import { useEffect } from 'react';
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { OfflineBanner } from '@/components/layout/offline-banner'

export function ServiceWorkerRegister() {
  useEffect(() => {
    const shouldEnableServiceWorker = process.env.NEXT_PUBLIC_ENABLE_SW === '1' && process.env.NODE_ENV === 'production'
    const shouldHardResetServiceWorker = process.env.NEXT_PUBLIC_SW_HARD_RESET === '1'
    const shouldResetOnly = process.env.NODE_ENV !== 'production'

    const onLoad = async () => {
      try {
        if (!('serviceWorker' in navigator)) return

        const getRegistrations = navigator.serviceWorker.getRegistrations?.bind(navigator.serviceWorker)
        const registrations = getRegistrations ? await getRegistrations() : []
        const clearCcCaches = async () => {
          if ('caches' in globalThis && globalThis.caches?.keys) {
            const keys = await globalThis.caches.keys()
            await Promise.all(
              keys.filter((key) => key.startsWith('cc-')).map((key) => globalThis.caches.delete(key))
            )
          }
        }

        if (!shouldEnableServiceWorker || shouldResetOnly) {
          await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)))
          if (shouldResetOnly) {
            await clearCcCaches()
          }
          return
        }

        if (shouldHardResetServiceWorker) {
          await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)))
          await clearCcCaches()
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
