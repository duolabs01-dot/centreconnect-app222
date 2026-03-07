'use client'

import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'

type WaitlistNotificationFormProps = {
  slug: string
  centreName: string
}

type FormState = 'idle' | 'loading' | 'success' | 'error'

export function WaitlistNotificationForm({ slug, centreName }: WaitlistNotificationFormProps) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim()) {
      setMessage('Please enter your email.')
      return
    }
    setState('loading')
    setMessage(null)

    try {
      const res = await fetch('/api/directory/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), slug }),
      })
      if (!res.ok) throw new Error('Unable to save request.')
      setState('success')
      setMessage(`We'll email you at ${email.trim()} when ${centreName} opens applications.`)
      setEmail('')
    } catch (err: any) {
      console.error('waitlist notification failed', err)
      setState('error')
      setMessage('Something went wrong. Please try again later.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">Enter your email</label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="flex-1 min-w-[220px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-cyan-500"
          required
        />
        <Button variant="link" type="submit" className="text-sm font-semibold text-cyan-600">
          Notify me when online applications open
        </Button>
      </div>
      {message ? (
        <p className="text-xs text-slate-500">{message}</p>
      ) : (
        <p className="text-xs text-slate-400">
          We’ll let you know as soon as this centre turns on online applications.
        </p>
      )}
    </form>
  )
}
