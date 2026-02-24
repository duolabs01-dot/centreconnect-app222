'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Laptop, Smartphone } from 'lucide-react'

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

function IosShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 text-cyan-600">
      <path
        d="M12 3v9m0-9 3 3m-3-3-3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="5"
        y="9"
        width="14"
        height="12"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  )
}

export function PwaInstallCard() {
  const installedKey = 'cc-pwa-installed'
  const dismissedKey = 'cc-pwa-install-dismissed'
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showManualSteps, setShowManualSteps] = useState(false)

  const platform = useMemo(() => getPlatform(), [])
  const heading = platform.desktop
    ? 'Install CentreConnect on your computer'
    : 'Add CentreConnect to your home screen'
  const installButtonLabel = platform.desktop ? 'Install on this computer' : 'Install CentreConnect'
  const hasOneTapInstall = Boolean(installPrompt)

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
        {hasOneTapInstall ? (
          <p className="flex items-center gap-2">
            <Download className="h-3.5 w-3.5 text-cyan-600" />
            Tap install once for faster loading, full-screen use, and an app-like experience.
          </p>
        ) : null}

        {!hasOneTapInstall ? (
          <p className="flex items-center gap-2">
            {platform.desktop ? (
              <Laptop className="h-3.5 w-3.5 text-cyan-600" />
            ) : (
              <Smartphone className="h-3.5 w-3.5 text-cyan-600" />
            )}
            One-tap install is not available in this browser. Open quick steps below.
          </p>
        ) : null}
      </div>

      {hasOneTapInstall ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-700"
        >
          <Download className="h-3.5 w-3.5" />
          {installButtonLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowManualSteps((prev) => !prev)}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-bold text-cyan-700 transition-colors hover:bg-cyan-100"
        >
          {platform.ios ? <IosShareGlyph /> : <Download className="h-3.5 w-3.5" />}
          {showManualSteps ? 'Hide install steps' : 'Show install steps'}
        </button>
      )}

      {!hasOneTapInstall && showManualSteps ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          {platform.ios ? (
            <p className="flex items-start gap-2">
              <IosShareGlyph />
              Tap the iOS Share button (square + arrow up), then choose{' '}
              <span className="font-semibold text-slate-700">Add to Home Screen</span>.
            </p>
          ) : platform.android ? (
            <p className="flex items-start gap-2">
              <Smartphone className="mt-0.5 h-3.5 w-3.5 text-cyan-600" />
              Open the browser menu and tap <span className="font-semibold text-slate-700">Install app</span> or{' '}
              <span className="font-semibold text-slate-700">Add to Home screen</span>.
            </p>
          ) : (
            <p className="flex items-start gap-2">
              <Laptop className="mt-0.5 h-3.5 w-3.5 text-cyan-600" />
              Use your browser's address bar install icon, or menu &rarr;{' '}
              <span className="font-semibold text-slate-700">Install CentreConnect</span>.
            </p>
          )}
        </div>
      ) : null}
    </section>
  )
}
