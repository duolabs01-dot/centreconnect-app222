'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const MAIN_SCROLL_CONTAINER_ID = 'ecd-portal-main-scroll'
const MAIN_SCROLL_KEY_PREFIX = 'ecd-portal-main-scroll:'

function readSavedMainScroll(pathname: string) {
  try {
    const saved = window.sessionStorage.getItem(`${MAIN_SCROLL_KEY_PREFIX}${pathname}`)
    if (!saved) return null
    const parsed = Number.parseInt(saved, 10)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
  } catch {
    return null
  }
}

function writeSavedMainScroll(pathname: string, value: number) {
  try {
    window.sessionStorage.setItem(
      `${MAIN_SCROLL_KEY_PREFIX}${pathname}`,
      String(Math.max(0, Math.floor(value)))
    )
  } catch {
    // Ignore storage write issues.
  }
}

export function EcdMainScrollMemory() {
  const pathname = usePathname()

  useEffect(() => {
    const element = document.getElementById(MAIN_SCROLL_CONTAINER_ID)
    if (!(element instanceof HTMLElement)) return

    const saved = readSavedMainScroll(pathname)
    element.scrollTop = saved ?? 0

    const onScroll = () => {
      writeSavedMainScroll(pathname, element.scrollTop)
    }

    element.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      writeSavedMainScroll(pathname, element.scrollTop)
      element.removeEventListener('scroll', onScroll)
    }
  }, [pathname])

  return null
}

