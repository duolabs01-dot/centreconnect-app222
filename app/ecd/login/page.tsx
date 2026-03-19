'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Section } from '@/components/layout/Section'
import { triggerConfetti } from '@/lib/ui/confetti'
import { robustSignOut } from '@/lib/auth/client-sign-out'
import {
  ensureProfileWithRetry,
  isEcdRole,
  signInWithPasswordRetry,
  type AuthRole,
} from '@/lib/auth/client-auth'

export default function EcdLoginPage() {
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [formMessage, setFormMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const hasClearedRevokedSessionRef = useRef(false)
  const loginErrorCode = searchParams.get('error')

  const nextPath = useMemo(() => {
    const raw = searchParams.get('next')?.trim()
    if (!raw || !raw.startsWith('/')) return '/ecd/dashboard'
    return raw
  }, [searchParams])

  const loginErrorMessage = useMemo(() => {
    if (loginErrorCode === 'centre-link') return 'We could not link your account to a centre yet. Please contact support.'
    if (loginErrorCode === 'session_revoked') return 'This device session expired or was replaced. Sign in again to continue.'
    return null
  }, [loginErrorCode])

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated || loginErrorCode !== 'session_revoked' || hasClearedRevokedSessionRef.current) {
      return
    }

    hasClearedRevokedSessionRef.current = true
    void robustSignOut(createClient())
  }, [isHydrated, loginErrorCode])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!isHydrated) return
    setFormMessage(null)
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()
    if (!normalizedEmail || !normalizedPassword) {
      const message = 'Email and password are required.'
      setFormMessage({ tone: 'error', text: message })
      toast.error(message)
      return
    }
    setLoading(true)
    try {
      const user = await signInWithPasswordRetry(supabase, {
        email: normalizedEmail,
        password: normalizedPassword,
      })

      const { role: ensuredRole } = await ensureProfileWithRetry()

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      const role = (ensuredRole ?? (profile?.role as AuthRole | undefined) ?? null) as AuthRole | null

      if (!isEcdRole(role)) {
        await robustSignOut(supabase)
        const message = 'This login is for ECD centres only.'
        setFormMessage({ tone: 'error', text: message })
        toast.error(message)
        return
      }

      if (role === 'ecd_admin') {
        const bootstrapResponse = await fetch('/api/ecd/bootstrap-centre', { method: 'POST' })
        if (bootstrapResponse.status === 403) {
          const payload = (await bootstrapResponse.json().catch(() => ({}))) as { error?: string; code?: string }
          await robustSignOut(supabase)
          const message =
            payload.code === 'APPLICATION_PENDING'
              ? 'Application pending approval. We will notify you once approved.'
              : payload.error || 'Account is not ready yet.'
          setFormMessage({ tone: 'error', text: message })
          toast.error(message)
          return
        }
        if (!bootstrapResponse.ok) {
          const payload = (await bootstrapResponse.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error || 'Failed to prepare centre workspace')
        }
      }

      triggerConfetti('application')
      const successMessage = 'Welcome back. Opening your ECD dashboard...'
      setFormMessage({ tone: 'success', text: successMessage })
      toast.success('Welcome back')
      window.location.assign(nextPath)
    } catch (error: any) {
      await robustSignOut(supabase)
      const message = error.message || 'Failed to login'
      setFormMessage({ tone: 'error', text: message })
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/70 via-white to-sky-50/60">
      <Section className="min-h-screen py-8 sm:py-10 lg:py-12" containerClassName="flex min-h-[80vh] items-center justify-center">
        <Card className="mx-auto w-full max-w-md border-cyan-100/80 bg-white/90 shadow-[var(--shadow-elevation-4)] backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="text-center">
              <Link href="/" className="text-xs font-semibold text-sky-700 hover:underline">
                Back to Home
              </Link>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">CentreConnect</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.11em] text-cyan-700">ECD Portal</p>
              <CardTitle className="mt-2 text-2xl text-slate-900">ECD Centre Login</CardTitle>
              <CardDescription className="mt-1 text-slate-600">
                Sign in as an ECD admin or staff member
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginErrorMessage ? (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{loginErrorMessage}</p>
                </div>
              ) : null}

              {formMessage ? (
                <div
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                    formMessage.tone === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-rose-200 bg-rose-50 text-rose-900'
                  }`}
                >
                  {formMessage.tone === 'success' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <p>{formMessage.text}</p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@centre.co.za"
                  disabled={!isHydrated || loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={!isHydrated || loading}
                    required
                    className="pr-11"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={!isHydrated || loading}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button type="submit" size="lg" className="h-12 w-full" disabled={!isHydrated || loading}>
                {loading ? 'Signing in...' : !isHydrated ? 'Preparing sign in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-slate-600">Are you a parent? </span>
              <Link href="/login" className="font-medium text-primary hover:underline">
                Parent login
              </Link>
            </div>

            <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 px-4 py-3 text-center">
              <p className="text-xs font-medium leading-relaxed text-slate-700">
                Got an ECD invite email? Open the secure link from that email first to activate access.
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold">
                <Link href="/forgot-password" className="text-cyan-700 hover:underline">
                  Set or reset password
                </Link>
                <a href="mailto:admin@centerconnect.co.za" className="text-cyan-700 hover:underline">
                  Contact support
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  )
}

