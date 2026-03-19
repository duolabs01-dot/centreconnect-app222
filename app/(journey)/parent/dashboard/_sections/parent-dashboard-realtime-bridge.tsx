'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ParentDashboardRealtimeBridgeProps = {
  parentId: string
}

export function ParentDashboardRealtimeBridge({ parentId }: ParentDashboardRealtimeBridgeProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!parentId) return

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) return
      refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null
        router.refresh()
      }, 300)
    }

    const channel = supabase
      .channel(`parent-dashboard-live-${parentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'parent_notifications', filter: `parent_id=eq.${parentId}` },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parent_notifications', filter: `parent_id=eq.${parentId}` },
        scheduleRefresh
      )
      .subscribe()

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
      void supabase.removeChannel(channel)
    }
  }, [parentId, router, supabase])

  return null
}
