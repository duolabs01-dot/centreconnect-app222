'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button' // Assuming there is a Button component

type AttendanceClientProps = {
  enrolledChildren: Array<{ id: string; first_name: string; last_name: string }>
  attendanceByChild: Record<string, { id: string; checked_in: boolean; picked_up: boolean } | null>
  parentIdByChild: Record<string, string | null>
  ecdId: string
  todayDate: string
  staffId: string
}

type LocalAttendanceState = Record<string, { id: string | null; checked_in: boolean; picked_up: boolean }>

function randomSixDigitCode() {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return String(bytes[0] % 1_000_000).padStart(6, '0')
}

function nextDateIso(dateIso: string) {
  const start = new Date(`${dateIso}T00:00:00+02:00`)
  start.setUTCDate(start.getUTCDate() + 1)
  return start.toISOString().slice(0, 10)
}

async function generatePickupCodeForFirstCheckIn({
  supabase,
  ecdId,
  childId,
  parentId,
  todayDate,
}: {
  supabase: ReturnType<typeof createClient>
  ecdId: string
  childId: string
  parentId: string
  todayDate: string
}) {
  const dayStart = `${todayDate}T00:00:00+02:00`
  const dayEnd = `${nextDateIso(todayDate)}T00:00:00+02:00`

  const { data: existingCode, error: existingCodeError } = await supabase
    .from('pickup_codes')
    .select('id')
    .eq('ecd_id', ecdId)
    .eq('child_id', childId)
    .eq('parent_id', parentId)
    .gte('created_at', dayStart)
    .lt('created_at', dayEnd)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingCodeError) {
    throw new Error(existingCodeError.message || 'Failed to inspect today pickup code')
  }

  if (existingCode?.id) {
    return { generated: false }
  }

  const { data, error } = await supabase.rpc('generate_pickup_code_atomic', {
    p_ecd_id: ecdId,
    p_child_id: childId,
    p_parent_id: parentId,
    p_generated_by_role: 'centre',
    p_code: randomSixDigitCode(),
    p_expires_at: `${todayDate}T23:59:59+02:00`,
  })

  if (error) {
    throw new Error(error.message || 'Failed to generate pickup code')
  }

  const payload = data as { success?: boolean; error?: string } | null
  if (!payload?.success) {
    throw new Error(payload?.error || 'Failed to generate pickup code')
  }

  return { generated: true }
}

export function AttendanceClient({
  enrolledChildren,
  attendanceByChild,
  parentIdByChild,
  ecdId,
  todayDate,
  staffId,
}: AttendanceClientProps) {
  const [localAttendance, setLocalAttendance] = useState<LocalAttendanceState>(() => {
    const initial: LocalAttendanceState = {}
    for (const child of enrolledChildren) {
      const existing = attendanceByChild[child.id]
      initial[child.id] = {
        id: existing?.id ?? null,
        checked_in: Boolean(existing?.checked_in),
        picked_up: Boolean(existing?.picked_up),
      }
    }
    return initial
  })
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-ZA', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        timeZone: 'Africa/Johannesburg',
      }).format(new Date(`${todayDate}T00:00:00+02:00`)),
    [todayDate]
  )

  const presentCount = enrolledChildren.filter((child) => localAttendance[child.id]?.checked_in).length
  const pickedUpCount = enrolledChildren.filter((child) => localAttendance[child.id]?.picked_up).length
  const absentCount = Math.max(0, enrolledChildren.length - presentCount)

  async function upsertAttendance(
    childId: string,
    field: 'checked_in' | 'picked_up',
    value: boolean,
    previousState: { id: string | null; checked_in: boolean; picked_up: boolean }
  ) {
    setSaving((current) => ({ ...current, [childId]: true }))
    const supabase = createClient()
    const fieldAt = field === 'checked_in' ? 'checked_in_at' : 'picked_up_at'
    const nowIso = new Date().toISOString()

    try {
      if (previousState.id) {
        const updatePayload: Record<string, boolean | string | null> = {
          [field]: value,
          [fieldAt]: value ? nowIso : null,
        }

        const { data, error } = await supabase
          .from('attendance')
          .update(updatePayload)
          .eq('id', previousState.id)
          .select('id,checked_in,picked_up')
          .single()

        if (error) throw error

        setLocalAttendance((current) => ({
          ...current,
          [childId]: {
            id: data.id,
            checked_in: Boolean(data.checked_in),
            picked_up: Boolean(data.picked_up),
          },
        }))

        if (field === 'checked_in' && value && !previousState.checked_in) {
          const parentId = parentIdByChild[childId]
          if (parentId) {
            try {
              const outcome = await generatePickupCodeForFirstCheckIn({
                supabase,
                ecdId,
                childId,
                parentId,
                todayDate,
              })
              if (outcome.generated) {
                toast.success('Pickup code generated after first check-in.')
              }
            } catch (pickupError) {
              const message =
                pickupError instanceof Error
                  ? pickupError.message
                  : 'Attendance saved, but pickup code was not generated.'
              toast.error(message)
            }
          }
        }
        return
      }

      const insertPayload: {
        ecd_id: string
        child_id: string
        date: string
        checked_in: boolean
        checked_in_at: string | null
        checked_in_by: string | null
        picked_up: boolean
        picked_up_at: string | null
      } = {
        ecd_id: ecdId,
        child_id: childId,
        date: todayDate,
        checked_in: field === 'checked_in' ? value : previousState.checked_in,
        checked_in_at: field === 'checked_in' && value ? nowIso : null,
        checked_in_by: field === 'checked_in' && value ? staffId : null,
        picked_up: field === 'picked_up' ? value : previousState.picked_up,
        picked_up_at: field === 'picked_up' && value ? nowIso : null,
      }

      const { data, error } = await supabase
        .from('attendance')
        .insert(insertPayload)
        .select('id,checked_in,picked_up')
        .single()

      if (error) throw error

      setLocalAttendance((current) => ({
        ...current,
        [childId]: {
          id: data.id,
          checked_in: Boolean(data.checked_in),
          picked_up: Boolean(data.picked_up),
        },
      }))

      if (field === 'checked_in' && value && !previousState.checked_in) {
        const parentId = parentIdByChild[childId]
        if (parentId) {
          try {
            const outcome = await generatePickupCodeForFirstCheckIn({
              supabase,
              ecdId,
              childId,
              parentId,
              todayDate,
            })
            if (outcome.generated) {
              toast.success('Pickup code generated after first check-in.')
            }
          } catch (pickupError) {
            const message =
              pickupError instanceof Error
                ? pickupError.message
                : 'Attendance saved, but pickup code was not generated.'
            toast.error(message)
          }
        }
      }
    } catch {
      setLocalAttendance((current) => ({
        ...current,
        [childId]: previousState,
      }))
      toast.error('Failed to save')
    } finally {
      setSaving((current) => ({ ...current, [childId]: false }))
    }
  }

  function toggleAttendance(childId: string, field: 'checked_in' | 'picked_up') {
    const previousState = localAttendance[childId] ?? { id: null, checked_in: false, picked_up: false }
    const nextValue = !previousState[field]

    setLocalAttendance((current) => ({
      ...current,
      [childId]: {
        ...previousState,
        [field]: nextValue,
      },
    }))

    void upsertAttendance(childId, field, nextValue, previousState)
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Attendance - {formattedDate}</h1>
        <p className="text-sm text-slate-600">Mark present and pickup status for enrolled children.</p>
      </header>

      <section className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Present</p>
          <p className="text-lg font-bold text-emerald-700">{presentCount}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Absent</p>
          <p className="text-lg font-bold text-slate-700">{absentCount}</p>
        </div>
        <div className="rounded-xl bg-cyan-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">Picked up</p>
          <p className="text-lg font-bold text-cyan-700">{pickedUpCount}</p>
        </div>
      </section>

      {enrolledChildren.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">No enrolled children yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Children appear here once their application status is set to enrolled.
          </p>
        </div>
      ) : (
        <section className="space-y-2">
          {enrolledChildren.map((child) => {
            const childState = localAttendance[child.id] ?? { id: null, checked_in: false, picked_up: false }
            return (
              <div key={child.id} className="h-16 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4">
                <p className="text-base font-semibold text-slate-900">
                  {child.first_name} {child.last_name}
                </p>
                <div className="flex gap-3"> {/* Updated gap-3 */}
                  <Button
                    type="button"
                    onClick={() => toggleAttendance(child.id, 'checked_in')}
                    disabled={Boolean(saving[child.id])}
                    className={`h-10 rounded-2xl px-3 py-2 text-xs font-bold transition-colors ${ // Updated h-10
                      childState.checked_in
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {childState.checked_in ? '\u2713 Present' : 'Mark Present'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => toggleAttendance(child.id, 'picked_up')}
                    disabled={Boolean(saving[child.id])}
                    className={`h-10 rounded-2xl px-3 py-2 text-xs font-bold transition-colors ${ // Updated h-10
                      childState.picked_up
                        ? 'bg-cyan-100 text-cyan-700 border border-cyan-300'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {childState.picked_up ? '\u2713 Picked Up' : 'Picked Up'}
                  </Button>
                </div>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
