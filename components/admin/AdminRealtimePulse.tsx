'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

/**
 * Admin live activity pulse — subscribes to platform-wide INSERT events
 * across the three most important tables: applications, ecd_centres,
 * and parent_notifications.
 *
 * Shows a subtle "Activity detected" badge in the admin dashboard header
 * and auto-refreshes the router every 60 seconds as a polling fallback.
 *
 * No tenant-scoping needed here since the admin is the platform owner
 * and should see all activity.
 */
export function AdminRealtimePulse() {
    const supabase = createClient()
    const router = useRouter()
    const [activityCount, setActivityCount] = useState(0)
    const [lastActivityLabel, setLastActivityLabel] = useState<string | null>(null)
    const lastActivityTime = useRef<number>(0)

    useEffect(() => {
        const channel = supabase
            .channel('admin-platform-pulse')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'applications' },
                () => {
                    setActivityCount((c) => c + 1)
                    setLastActivityLabel('New application submitted')
                    lastActivityTime.current = Date.now()
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'ecd_centres' },
                () => {
                    setActivityCount((c) => c + 1)
                    setLastActivityLabel('New centre registered')
                    lastActivityTime.current = Date.now()
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'parent_notifications' },
                () => {
                    setActivityCount((c) => c + 1)
                    setLastActivityLabel('Parent notification sent')
                    lastActivityTime.current = Date.now()
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'support_tickets' },
                () => {
                    setActivityCount((c) => c + 1)
                    setLastActivityLabel('New support ticket')
                    lastActivityTime.current = Date.now()
                }
            )
            .subscribe()

        // Polling fallback — refresh every 60 seconds if realtime lags
        const interval = setInterval(() => {
            router.refresh()
        }, 60_000)

        return () => {
            void supabase.removeChannel(channel)
            clearInterval(interval)
        }
    }, [supabase, router])

    if (activityCount === 0) return null

    return (
        <div className="flex items-center gap-3 rounded-2xl border border-teal-500/20 bg-teal-500/10 px-4 py-2.5 text-sm">
            <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
            </span>
            <span className="font-semibold text-teal-200">
                Activity detected
            </span>
            <span className="text-teal-300/70">—</span>
            <span className="text-teal-300/90">
                {lastActivityLabel ?? 'Platform activity'} ({activityCount} event{activityCount !== 1 ? 's' : ''})
            </span>
            <button
                type="button"
                onClick={() => {
                    router.refresh()
                    setActivityCount(0)
                    setLastActivityLabel(null)
                }}
                className="ml-auto rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-teal-200 transition-colors hover:bg-teal-500/20"
            >
                Refresh now
            </button>
        </div>
    )
}
