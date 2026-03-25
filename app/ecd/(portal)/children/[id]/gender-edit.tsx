'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { updateChildGenderAction } from './actions'

type Props = {
  childId: string
  currentGender: string | null | undefined
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other / Prefer not to say' },
]

function genderLabel(value: string | null | undefined) {
  if (!value?.trim()) return 'Not recorded'
  const match = GENDER_OPTIONS.find((opt) => opt.value === value.toLowerCase())
  return match?.label ?? (value.charAt(0).toUpperCase() + value.slice(1))
}

export function GenderEditField({ childId, currentGender }: Props) {
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState(currentGender ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await updateChildGenderAction(childId, selected)
      if (!result.ok) {
        toast.error(result.error ?? 'Failed to save gender.')
        return
      }
      toast.success('Gender updated.')
      setEditing(false)
    })
  }

  if (!editing) {
    return (
      <p className="flex items-center gap-2">
        <span className="font-semibold text-slate-900">Gender:</span>
        <span>{genderLabel(currentGender)}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-1 flex h-5 w-5 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-teal-700"
          title="Edit gender (admin only)"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </p>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-semibold text-slate-900">Gender:</span>
      <select
        className="cc-native-field h-8 rounded-xl border border-slate-200 px-2 text-xs text-slate-700"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        autoFocus
      >
        <option value="">Select…</option>
        {GENDER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || !selected}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white transition-colors hover:bg-teal-700 disabled:opacity-40"
        title="Save"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => { setEditing(false); setSelected(currentGender ?? '') }}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
        title="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
