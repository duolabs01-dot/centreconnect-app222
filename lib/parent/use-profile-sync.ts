'use client'

import { createClient } from '@/lib/supabase/client'
import { ensureParentReady } from '@/lib/auth/ensure-parent-ready'

const STORAGE_KEY = 'cc_parent_onboarding_draft'

/**
 * Hook to manage parent profile synchronization and conflict resolution.
 */
export function useParentProfileSync() {
  const supabase = createClient()

  /**
   * Synchronizes local draft data to the server.
   * Implements basic conflict resolution by using the latest local changes
   * as the source of truth for the onboarding process.
   */
  const syncToServer = async (data: any) => {
    if (typeof window === 'undefined' || !navigator.onLine) return { ok: false, error: 'Offline' }

    try {
      const ready = await ensureParentReady(supabase)
      if (!ready.ok) return { ok: false, error: ready.error }

      // Log sync event for audit trail
      console.log(`[Sync] Initiating profile sync for user ${ready.userId}`)

      const { error: parentError } = await supabase
        .from('parents')
        .update({ 
          guardian_relationship: data.relationship || null,
          preferred_suburbs: data.primarySuburb ? [data.primarySuburb] : [],
          emergency_contact_name: data.emergencyName || null,
          emergency_contact_phone: data.emergencyPhone || null,
          // Track last sync timestamp for conflict resolution if needed
          updated_at: new Date().toISOString()
        })
        .eq('id', ready.userId)

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: data.fullName || null,
          phone: data.phone || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', ready.userId)

      if (parentError || profileError) {
        console.error('[Sync] Sync failed', { parentError, profileError })
        return { ok: false, error: 'Database update failed' }
      }

      console.log('[Sync] Profile synced successfully')
      return { ok: true }
    } catch (e) {
      console.error('[Sync] Unexpected error during sync', e)
      return { ok: false, error: 'Unexpected error' }
    }
  }

  /**
   * Resolves conflicts by fetching server state and merging with local draft.
   * Priority is given to server state for fields that are already populated,
   * unless local changes are more recent.
   */
  const resolveConflicts = async (localData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return localData

      const [
        { data: parent },
        { data: profile }
      ] = await Promise.all([
        supabase.from('parents').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle()
      ])

      if (!parent && !profile) return localData

      // Simple merge strategy: if server has data and local is empty, use server.
      // If both have data, local wins (as it's the current user session).
      return {
        ...localData,
        fullName: localData.fullName || profile?.full_name || '',
        phone: localData.phone || profile?.phone || '',
        relationship: localData.relationship || parent?.guardian_relationship || '',
        emergencyName: localData.emergencyName || parent?.emergency_contact_name || '',
        emergencyPhone: localData.emergencyPhone || parent?.emergency_contact_phone || '',
        primarySuburb: localData.primarySuburb || parent?.preferred_suburbs?.[0] || 'Alexandra'
      }
    } catch (e) {
      console.error('[Sync] Conflict resolution failed', e)
      return localData
    }
  }

  return { syncToServer, resolveConflicts }
}
