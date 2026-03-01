'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Clock, Users, Baby } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  token: string
  expired: boolean
  alreadyLinked: boolean
  isLoggedIn: boolean
  childName: string
  inviterName: string
  guardianName: string
}

export function JoinClient({
  token,
  expired,
  alreadyLinked,
  isLoggedIn,
  childName,
  inviterName,
  guardianName,
}: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function acceptInvite() {
    setStatus('loading')
    try {
      const res = await fetch('/api/parent/guardian-invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Something went wrong.')
        setStatus('error')
        return
      }
      setStatus('success')
      setTimeout(() => router.replace('/parent/dashboard'), 2000)
    } catch {
      setErrorMsg('Could not connect. Check your internet and try again.')
      setStatus('error')
    }
  }

  // Auto-accept if already logged in and invite is valid
  if (isLoggedIn && !expired && !alreadyLinked && status === 'idle') {
    acceptInvite()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-6">

        {/* Brand */}
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600 mb-1">CentreConnect</p>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-cyan-50 flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-cyan-600" />
          </div>
        </div>

        {/* Expired */}
        {expired && (
          <div className="text-center space-y-3">
            <XCircle className="h-12 w-12 text-rose-400 mx-auto" />
            <h1 className="text-xl font-bold text-slate-900">This invite has expired</h1>
            <p className="text-sm text-slate-500">Ask <strong>{inviterName}</strong> to send a new invite from their Co-Guardians page.</p>
            <Button asChild className="w-full mt-2"><Link href="/">Go to home</Link></Button>
          </div>
        )}

        {/* Already linked */}
        {!expired && alreadyLinked && (
          <div className="text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
            <h1 className="text-xl font-bold text-slate-900">Already joined</h1>
            <p className="text-sm text-slate-500">Your account is already linked to {childName}&apos;s profile.</p>
            <Button asChild className="w-full mt-2"><Link href="/parent/dashboard">Go to your dashboard</Link></Button>
          </div>
        )}

        {/* Valid invite, user logged in — auto-accepting */}
        {!expired && !alreadyLinked && isLoggedIn && status !== 'error' && (
          <div className="text-center space-y-4">
            <Baby className="h-12 w-12 text-cyan-400 mx-auto" />
            <h1 className="text-xl font-bold text-slate-900">
              {status === 'success' ? `You're in!` : `Joining ${childName}'s family…`}
            </h1>
            {status === 'success' && (
              <>
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="text-sm text-slate-500">Taking you to your dashboard now.</p>
              </>
            )}
            {status === 'loading' && (
              <p className="text-sm text-slate-500">Linking your account…</p>
            )}
          </div>
        )}

        {/* Valid invite, not logged in */}
        {!expired && !alreadyLinked && !isLoggedIn && (
          <div className="space-y-4">
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-900">
                {inviterName} invited you to {childName}&apos;s profile
              </h1>
              {guardianName && (
                <p className="text-sm text-slate-500 mt-1">Invited as: <strong>{guardianName}</strong></p>
              )}
              <p className="text-sm text-slate-500 mt-2">
                Sign in or create a free account to see applications, daily reports, and updates.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button asChild className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold">
                <Link href={`/register?next=/join?token=${encodeURIComponent(token)}`}>
                  Create a free account
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full font-bold">
                <Link href={`/login?next=/join?token=${encodeURIComponent(token)}`}>
                  I already have an account — Sign in
                </Link>
              </Button>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700">This invite is valid for 72 hours from when it was sent.</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="text-center space-y-3">
            <XCircle className="h-10 w-10 text-rose-400 mx-auto" />
            <p className="text-sm text-slate-700 font-medium">{errorMsg}</p>
            <Button variant="outline" className="w-full" onClick={() => { setStatus('idle'); setErrorMsg('') }}>
              Try again
            </Button>
          </div>
        )}

      </div>
    </div>
  )
}
