'use client'

import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'

type ClaimRequestFormProps = {
  slug: string
  centreName: string
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

export function ClaimRequestForm({ slug, centreName }: ClaimRequestFormProps) {
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('Owner')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setMessage(null)

    try {
      const res = await fetch('/api/ecd/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centre_slug: slug,
          centre_name: centreName,
          contact_name: fullName,
          role,
          phone,
          email,
        }),
      })
      if (!res.ok) throw new Error('Unable to send claim request.')
      setStatus('success')
      setMessage("We'll review your request and be in touch within 24 hours.")
      setFullName('')
      setPhone('')
      setEmail('')
      setRole('Owner')
    } catch (error: any) {
      console.error('claim request failed', error)
      setStatus('error')
      setMessage('Something went wrong. Please try again shortly.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-lg">
      <input type="hidden" name="centre_slug" value={slug} />
      <div className="space-y-1">
        <label className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Centre name</label>
        <input
          type="text"
          value={centreName}
          readOnly
          className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold text-slate-700">
          Your name
          <input
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Abe Ndlovu"
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus-visible:ring-2 focus-visible:ring-cyan-500"
          />
        </label>

        <label className="space-y-1 text-sm font-semibold text-slate-700">
          Your role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="cc-native-field w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <option>Owner</option>
            <option>Manager</option>
            <option>Staff</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold text-slate-700">
          Phone number
          <input
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+27 76 123 4567"
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus-visible:ring-2 focus-visible:ring-cyan-500"
          />
        </label>
        <label className="space-y-1 text-sm font-semibold text-slate-700">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@email.com"
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus-visible:ring-2 focus-visible:ring-cyan-500"
          />
        </label>
      </div>

      <Button
        className="w-full rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-600/40"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? 'Sending request…' : 'Start claim request'}
      </Button>

      {message && (
        <p className={`text-xs font-medium ${status === 'error' ? 'text-rose-600' : 'text-cyan-600'}`}>
          {message}
        </p>
      )}
    </form>
  )
}


