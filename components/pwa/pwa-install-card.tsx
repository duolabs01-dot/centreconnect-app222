'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Share2, Smartphone } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

function getPlatform() {
  if (typeof window === 'undefined') return { ios: false, android: false, desktop: false }
  const ua = window.navigator.userAgent
  const lowerUa = ua.toLowerCase()
  const isAppleTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  const ios = /iphone|ipad|ipod/.test(lowerUa) || isAppleTouchMac
  const android = /android/.test(lowerUa)
  return {
    ios,
    android,
    desktop: !ios && !android,
  }
}

export function PwaInstallCard() {
  const installedKey = 'cc-pwa-installed'
  const dismissedKey = 'cc-pwa-install-dismissed'
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const platform = useMemo(() => getPlatform(), [])
  const heading = platform.desktop
    ? 'Install CentreConnect on your computer'
    : 'Add CentreConnect to your home screen'
  const installButtonLabel = platform.desktop ? 'Install on this computer' : 'Install CentreConnect'

  useEffect(() => {
    if (typeof window === 'undefined') return

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silent fail: install UX still works where possible.
      })
    }

    const isStandaloneMode = isStandalone()
    try {
      const wasInstalled = window.localStorage.getItem(installedKey) === '1'
      setInstalled(isStandaloneMode || wasInstalled)
      setDismissed(window.localStorage.getItem(dismissedKey) === '1')
    } catch {
      setInstalled(isStandaloneMode)
      setDismissed(false)
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    const onAppInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
      try {
        window.localStorage.setItem(installedKey, '1')
        window.localStorage.removeItem(dismissedKey)
      } catch {
        // no-op
      }
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [dismissedKey, installedKey])

  async function handleInstallClick() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
      try {
        window.localStorage.setItem(installedKey, '1')
        window.localStorage.removeItem(dismissedKey)
      } catch {
        // no-op
      }
    }
    setInstallPrompt(null)
  }

  function dismissCard() {
    setDismissed(true)
    try {
      window.localStorage.setItem(dismissedKey, '1')
    } catch {
      // no-op
    }
  }

  if (installed || dismissed) return null

  return (
    <section className="rounded-2xl border border-cyan-100 bg-white/80 p-4 shadow-[var(--shadow-elevation-1)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-700">Install App</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{heading}</p>
        </div>
        <button
          type="button"
          onClick={dismissCard}
          className="rounded-full px-2 py-0.5 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Dismiss install tips"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
        {installPrompt ? (
          <p className="flex items-center gap-2">
            <Download className="h-3.5 w-3.5 text-cyan-600" />
            {platform.desktop
              ? 'Install in one click for a cleaner desktop app experience.'
              : 'Install in one tap for faster loading, full-screen use, and app-like experience.'}
          </p>
        ) : null}

        {platform.ios ? (
          <p className="flex items-center gap-2">
            <Share2 className="h-3.5 w-3.5 text-cyan-600" />
            On iPhone/iPad: tap Share, then choose <span className="font-semibold text-slate-700">Add to Home Screen</span>.
          </p>
        ) : null}

        {platform.android && !installPrompt ? (
          <p className="flex items-center gap-2">
            <Smartphone className="h-3.5 w-3.5 text-cyan-600" />
            On Android: open browser menu, then tap <span className="font-semibold text-slate-700">Install app</span> or <span className="font-semibold text-slate-700">Add to Home screen</span>.
          </p>
        ) : null}

        {platform.desktop && !installPrompt ? (
          <p className="flex items-center gap-2">
            <Download className="h-3.5 w-3.5 text-cyan-600" />
            On desktop: use your browser address bar install icon, or menu &rarr; <span className="font-semibold text-slate-700">Install app</span>.
          </p>
        ) : null}
      </div>

      {installPrompt ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-700"
        >
          <Download className="h-3.5 w-3.5" />
          {installButtonLabel}
        </button>
      ) : null}
    </section>
  )
}
