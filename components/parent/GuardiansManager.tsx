'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AddGuardianSheet } from '@/components/parent/guardians/AddGuardianSheet'

export type GuardianChild = {
  id: string
  first_name: string
  last_name: string
}

type Guardian = {
  id: string
  full_name: string | null
  relationship: string | null
  phone: string | null
  import_source: string | null
  is_verified: boolean
  can_pickup: boolean
  can_view_applications: boolean
  can_receive_announcements: boolean
  can_generate_pickup_code: boolean
}

type Props = {
  childList: GuardianChild[]
}

export function GuardiansManager({ childList }: Props) {
  const [selectedChildId, setSelectedChildId] = useState(childList[0]?.id ?? '')
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [loading, setLoading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const selectedChildName = useMemo(() => {
    const child = childList.find((item) => item.id === selectedChildId)
    return child ? `${child.first_name} ${child.last_name}` : 'Select a child'
  }, [childList, selectedChildId])

  const loadGuardians = useCallback(async () => {
    if (!selectedChildId) {
      setGuardians([])
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('guardians')
        .select('id,full_name,relationship,phone,import_source,is_verified,can_pickup,can_view_applications,can_receive_announcements,can_generate_pickup_code,created_at')
        .eq('child_id', selectedChildId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setGuardians((data ?? []) as Guardian[])
    } catch (error: any) {
      toast.error(error?.message || 'Could not load guardians')
    } finally {
      setLoading(false)
    }
  }, [selectedChildId])

  useEffect(() => {
    void loadGuardians()
  }, [loadGuardians])

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[220px]">
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Child</label>
            <select
              value={selectedChildId}
              onChange={(event) => setSelectedChildId(event.target.value)}
              className="cc-native-field mt-1 w-full border-slate-200 bg-white text-slate-900"
            >
              {childList.length === 0 ? (
                <option value="">No child linked</option>
              ) : (
                childList.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.first_name} {child.last_name}
                  </option>
                ))
              )}
            </select>
          {!childList.length ? (
            <p className="mt-2 text-xs text-slate-500">Add a child first in the Family Profiles section.</p>
          ) : null}
        </div>
        <Button
          type="button"
          disabled={!selectedChildId}
          onClick={() => setSheetOpen(true)}
          className="shrink-0"
        >
          Add Co-Guardian
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-600">Guardians assigned to {selectedChildName}</p>
        {loading ? (
          <p className="text-sm text-slate-500">Loading guardians…</p>
        ) : guardians.length === 0 ? (
          <p className="text-sm text-slate-500">No guardians yet. Add one to share access.</p>
        ) : (
          <div className="space-y-3">
            {guardians.map((guardian) => (
              <div key={guardian.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{guardian.full_name ?? 'Unnamed guardian'}</p>
                    <p className="text-sm text-slate-500">{guardian.relationship ?? 'Relationship not set'}</p>
                  </div>
                  <span className="rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500">
                    {guardian.import_source ?? 'manual'}
                  </span>
                </div>
                {guardian.phone ? (
                  <p className="mt-2 text-sm text-slate-600">Phone: {guardian.phone}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Phone not provided</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  {guardian.is_verified ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-600">
                      Verified
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-500">
                      Unverified
                    </span>
                  )}
                  {guardian.can_pickup && (
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-cyan-600">
                      Pickup
                    </span>
                  )}
                  {guardian.can_view_applications && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-600">
                      View apps
                    </span>
                  )}
                  {guardian.can_receive_announcements && (
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-600">
                      Announcements
                    </span>
                  )}
                  {guardian.can_generate_pickup_code && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-600">
                      Pickup codes
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddGuardianSheet
        open={sheetOpen}
        childId={selectedChildId}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => {
          setSheetOpen(false)
          void loadGuardians()
        }}
      />
    </div>
  )
}
