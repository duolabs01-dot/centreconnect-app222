'use client'

import { useEffect } from 'react'
import { InstallPrompt } from './install-prompt'

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('SW registered: ', registration)
          },
          (registrationError) => {
            console.log('SW registration failed: ', registrationError)
          }
        )
      })
    }
  }, [])

  return (
    <>
      {children}
      <InstallPrompt />
    </>
  )
}
