'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { updateChildDetailsAction } from './actions'

type ClassOption = { id: string; name: string; ageGroup: string | null }

type Props = {
  childId: string
  current: {
    enrollment_status: string | null
    enrollment_start_date: string | null
    class_id: string | null
    date_of_birth: string | null
    allergies: string[]
    medical_conditions: string[]
    special_needs: string | null
    dietary_restrictions: string | null
    doctor_name: string | null
    medical_aid_number: string | null
  }
  classes: ClassOption[]
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'pending', label: 'Pending' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

export function ChildDetailsEditButton({ childId, current, classes }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    enrollment_status: current.enrollment_status ?? 'active',
    enrollment_start_date: current.enrollment_start_date ?? '',
    class_id: current.class_id ?? '',
    date_of_birth: current.date_of_birth ?? '',
    allergies: current.allergies.join(', '),
    medical_conditions: current.medical_conditions.join(', '),
    special_needs: current.special_needs ?? '',
    dietary_restrictions: current.dietary_restrictions ?? '',
    doctor_name: current.doctor_name ?? '',
    medical_aid_number: current.medical_aid_number ?? '',
  })

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateChildDetailsAction(childId, form)
      if (!result.ok) {
        toast.error(result.error ?? 'Failed to save.')
        return
      }
      toast.success('Child record updated.')
      setOpen(false)
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-teal-300 hover:text-teal-700"
      >
        <Pencil className="h-3 w-3" />
        Edit details
      </button>
    )
  }

  return (
    <div className="rounded-3xl border border-teal-200 bg-teal-50/40 p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-black text-slate-900">Edit child details</p>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:text-slate-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Enrollment status</label>
          <select className="cc-native-field h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            value={form.enrollment_status} onChange={(e) => set('enrollment_status', e.target.value)}>
            {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Enrollment start date</label>
          <input type="date" className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            value={form.enrollment_start_date} onChange={(e) => set('enrollment_start_date', e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Class</label>
          <select className="cc-native-field h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            value={form.class_id} onChange={(e) => set('class_id', e.target.value)}>
            <option value="">No class assigned</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}{cls.ageGroup ? ` (${cls.ageGroup})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Date of birth</label>
          <input type="date" className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Allergies <span className="normal-case font-normal">(comma-separated)</span></label>
          <input type="text" placeholder="e.g. nuts, dairy" className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            value={form.allergies} onChange={(e) => set('allergies', e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Medical conditions <span className="normal-case font-normal">(comma-separated)</span></label>
          <input type="text" placeholder="e.g. asthma" className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            value={form.medical_conditions} onChange={(e) => set('medical_conditions', e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Special needs</label>
          <input type="text" className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            value={form.special_needs} onChange={(e) => set('special_needs', e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Dietary restrictions</label>
          <input type="text" className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            value={form.dietary_restrictions} onChange={(e) => set('dietary_restrictions', e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Doctor name</label>
          <input type="text" className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            value={form.doctor_name} onChange={(e) => set('doctor_name', e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Medical aid number</label>
          <input type="text" className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            value={form.medical_aid_number} onChange={(e) => set('medical_aid_number', e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-2xl bg-teal-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </div>
  )
}
