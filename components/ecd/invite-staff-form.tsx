'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type InviteStaffFormProps = {
  ecdId: string
}

type InviteResponse = {
  ok?: boolean
  error?: string
  linkedExistingUser?: boolean
  pendingLinkOnNextLogin?: boolean
  deliveryWarning?: string | null
}

export function InviteStaffForm({ ecdId }: InviteStaffFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'ecd_staff' | 'ecd_supervisor' | 'ecd_admin'>('ecd_staff')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const payload = {
      ecdId,
      email: email.trim().toLowerCase(),
      role,
      fullName: name.trim(),
    }

    if (!payload.fullName || !payload.email) {
      toast.error('Enter the staff name and email first.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/ecd/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = (await response.json().catch(() => ({}))) as InviteResponse
      if (!response.ok) {
        toast.error(result.error || 'Failed to invite staff member.')
        return
      }

      const successMessage = result.pendingLinkOnNextLogin
        ? 'Staff invite recorded. Centre access will link the next time they sign in.'
        : result.linkedExistingUser
          ? 'Existing account linked and invited.'
          : 'Staff invitation sent.'

      if (result.deliveryWarning) {
        toast.success(successMessage, { description: result.deliveryWarning })
      } else {
        toast.success(successMessage)
      }

      setName('')
      setEmail('')
      setRole('ecd_staff')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite staff member.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
      <input
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="cc-native-field h-12 rounded-2xl"
        placeholder="Staff full name"
        required
      />
      <input
        name="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="cc-native-field h-12 rounded-2xl"
        placeholder="Staff email"
        required
      />
      <select
        name="role"
        value={role}
        onChange={(event) => setRole(event.target.value as 'ecd_staff' | 'ecd_supervisor' | 'ecd_admin')}
        className="cc-native-field h-12 rounded-2xl border-slate-300 bg-white text-slate-800 font-semibold"
      >
        <option value="ecd_staff">Staff member</option>
        <option value="ecd_supervisor">Supervisor</option>
        <option value="ecd_admin">ECD Admin</option>
      </select>
      <div className="md:col-span-3 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-fit bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 rounded-2xl shadow-sm transition-colors"
        >
          {isSubmitting ? 'Sending invite...' : 'Invite staff'}
        </Button>
        <p className="text-xs font-medium text-slate-500">
          CentreConnect will email a secure activation link and add the team member to this centre.
        </p>
      </div>
    </form>
  )
}
