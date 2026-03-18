'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/**
 * Subscribes to new applications for this ECD centre.
 * Shows a toast notification and refreshes the server component data
 * when a parent submits a new application.
 *
 * This does NOT replace the server component — it adds live updates on top.
 */
export function ApplicationsRealtimeBridge({ ecdId }: { ecdId: string }) {
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const channel = supabase
            .channel(`applications-live-${ecdId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'applications',
                    filter: `ecd_id=eq.${ecdId}`,
                },
                () => {
                    toast.info('New application received', {
                        description: 'A parent just applied to your centre.',
                        action: { label: 'View', onClick: () => router.refresh() },
                    })
                    router.refresh()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'applications',
                    filter: `ecd_id=eq.${ecdId}`,
                },
                () => {
                    router.refresh()
                }
            )
            .subscribe()

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [ecdId, supabase, router])

    return null
}
