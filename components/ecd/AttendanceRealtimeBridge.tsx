'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

/**
 * Subscribes to attendance and daily report changes for this ECD centre.
 * When a teacher marks a child present/absent (or a daily report is updated),
 * the page is refreshed so the parent's daily report view stays in sync.
 *
 * Scoped to a single centre via ecd_id filter — no cross-tenant data exposure.
 */
export function AttendanceRealtimeBridge({ ecdId }: { ecdId: string }) {
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const channel = supabase
            .channel(`attendance-live-${ecdId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'attendance_records',
                    filter: `centre_id=eq.${ecdId}`,
                },
                () => router.refresh()
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'daily_reports',
                    filter: `ecd_id=eq.${ecdId}`,
                },
                () => router.refresh()
            )
            .subscribe()

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [ecdId, supabase, router])

    return null
}
