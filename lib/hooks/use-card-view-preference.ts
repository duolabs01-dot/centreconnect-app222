'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'cc-card-view'

export function useCardViewPreference() {
  const [variant, setVariantState] = useState<'full' | 'compact'>('full')
  const [isManualOverride, setIsManualOverride] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'full' || stored === 'compact') {
      setVariantState(stored)
      setIsManualOverride(true)
    } else {
      setVariantState(window.innerWidth >= 390 ? 'full' : 'compact')
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    const handleResize = () => {
      if (!isManualOverride) {
        setVariantState(window.innerWidth >= 390 ? 'full' : 'compact')
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mounted, isManualOverride])

  function setVariant(v: 'full' | 'compact') {
    setVariantState(v)
    setIsManualOverride(true)
    localStorage.setItem(STORAGE_KEY, v)
  }

  return { variant: mounted ? variant : 'full', setVariant, isManualOverride }
}
