'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type AttendanceClientProps = {
  enrolledChildren: Array<{ id: string; first_name: string; last_name: string }>
  attendanceByChild: Record<string, { id: string; checked_in: boolean; picked_up: boolean } | null>
  ecdId: string
  todayDate: string
  staffId: string
}

type LocalAttendanceState = Record<string, { id: string | null; checked_in: boolean; picked_up: boolean }>

export function AttendanceClient({
  enrolledChildren,
  attendanceByChild,
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
              <div key={child.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  {child.first_name} {child.last_name}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAttendance(child.id, 'checked_in')}
                    disabled={Boolean(saving[child.id])}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                      childState.checked_in
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {childState.checked_in ? '\u2713 Present' : 'Mark Present'}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAttendance(child.id, 'picked_up')}
                    disabled={Boolean(saving[child.id])}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                      childState.picked_up
                        ? 'bg-cyan-100 text-cyan-700 border border-cyan-300'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {childState.picked_up ? '\u2713 Picked Up' : 'Picked Up'}
                  </button>
                </div>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
