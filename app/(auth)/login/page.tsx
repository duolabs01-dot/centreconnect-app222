'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Clock3, Eye, EyeOff, MapPin, ShieldCheck, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { ParentAuthShell } from '@/components/auth/parent-auth-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
import { createClient } from '@/lib/supabase/client'
import {
  destinationForRole,
  ensureProfileWithRetry,
  signInWithPasswordRetry,
  type AuthRole,
} from '@/lib/auth/client-auth'
import { robustSignOut } from '@/lib/auth/client-sign-out'
import { buildAuthCallbackRedirect } from '@/lib/auth/onboarding-links'
import { triggerConfetti } from '@/lib/ui/confetti'

const fieldClassName =
  'h-12 rounded-xl border-border bg-background text-[15px] shadow-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-primary/20'
const labelClassName = 'text-sm font-medium text-foreground'

export const dynamic = 'force-dynamic'

type LoginPersona = 'parent' | 'admin'

function sanitizeNextPath(value: string | null | undefined) {
  if (!value) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  if (value.startsWith('/login') || value.startsWith('/register') || value.startsWith('/auth')) return null
  return value
}

function confirmationErrorMessage(code: string | null) {
  if (code === 'invalid-confirmation-link') return 'That email confirmation link is invalid.'
  if (code === 'confirmation-failed') return 'We could not confirm your email. Please request a new confirmation link.'
  if (code === 'confirmation-session-missing') return 'Confirmation succeeded, but we could not start your session. Please sign in.'
  if (code === 'confirmation-profile-setup') return 'Your email was confirmed, but account setup is incomplete. Please sign in again.'
  if (code === 'complete-profile') return 'We still need to finish setting up your account. Sign in again to continue.'
  return null
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formMessage, setFormMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const supabase = createClient()
  const requestedNext = searchParams.get('next')
  const reason = searchParams.get('reason')
  const authError = searchParams.get('error')
  const confirmEmailRequested = searchParams.get('confirm_email') === '1'
  const loginPersona = useMemo<LoginPersona>(() => {
    const requestedPersona = searchParams.get('persona')
    if (requestedPersona === 'admin') return 'admin'
    const nextPath = searchParams.get('next')
    return nextPath?.startsWith('/admin') ? 'admin' : 'parent'
  }, [searchParams])
  const isAdminPersona = loginPersona === 'admin'

  useEffect(() => {
    const queryEmail = searchParams.get('email')?.trim() ?? ''
    if (queryEmail) {
      setEmail((current) => current || queryEmail)
    }
  }, [searchParams])

  function authDestinationPath() {
    return sanitizeNextPath(requestedNext) ?? (isAdminPersona ? '/admin/dashboard' : '/')
  }

  function registerHref() {
    const destination = sanitizeNextPath(requestedNext)
    if (!destination) return '/register'
    return `/register?next=${encodeURIComponent(destination)}`
  }

  function adminIntentLabel() {
    const destination = sanitizeNextPath(requestedNext)
    if (!destination) return 'your platform workspace'
    if (destination.startsWith('/admin/support')) return 'support operations'
    if (destination.startsWith('/admin/tenants')) return 'centre operations'
    if (destination.startsWith('/admin/revenue')) return 'revenue operations'
    if (destination.startsWith('/admin/analytics')) return 'platform analytics'
    return 'your platform workspace'
  }

  async function handleResendConfirmation() {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      const message = 'Enter the parent email address first.'
      setFormMessage({ tone: 'error', text: message })
      toast.error(message)
      return
    }

    setResendLoading(true)
    setFormMessage(null)

    try {
      const response = await fetch('/api/auth/resend-parent-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          nextPath: sanitizeNextPath(requestedNext) ?? '/parent/onboarding',
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to resend confirmation email')
      }

      const message = 'Fresh confirmation email sent. Check inbox and spam.'
      setFormMessage({ tone: 'success', text: message })
      toast.success(message)
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'Failed to resend confirmation email'
      setFormMessage({ tone: 'error', text: message })
      toast.error(message)
    } finally {
      setResendLoading(false)
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
      let role: AuthRole | null = ensuredRole

      if (!role) {
        const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
        role = (profile?.role as AuthRole | undefined) ?? null
      }

      if (isAdminPersona && role !== 'platform_admin') {
        await robustSignOut(supabase)
        const message = 'This sign-in is for Platform Admin only.'
        setFormMessage({ tone: 'error', text: message })
        toast.error(message)
        return
      }

      triggerConfetti('application')
      const destination = sanitizeNextPath(requestedNext) ?? destinationForRole(role)
      const successMessage = isAdminPersona
        ? 'Welcome back. Opening your admin workspace...'
        : 'Welcome back. Opening your account...'
      setFormMessage({ tone: 'success', text: successMessage })
      toast.success('Signed in.')
      router.replace(destination)
      router.refresh()
      window.setTimeout(() => {
        window.location.assign(destination)
      }, 150)
    } catch (error: unknown) {
      await robustSignOut(supabase)
      const message =
        error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'Failed to sign in'
      setFormMessage({ tone: 'error', text: message })
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    if (isAdminPersona) {
      const message = 'Use your platform admin email and password.'
      setFormMessage({ tone: 'error', text: message })
      toast.error(message)
      return
    }

    setGoogleLoading(true)
    setFormMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: buildAuthCallbackRedirect(authDestinationPath()),
          queryParams: {
            prompt: 'select_account',
          },
        },
      })
      if (error) throw error
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'Failed to start Google sign in'
      setFormMessage({ tone: 'error', text: message })
      toast.error(message)
      setGoogleLoading(false)
    }
  }

  const confirmationMessage = confirmationErrorMessage(authError)
  const statusMessage = formMessage ? (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        formMessage.tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-rose-200 bg-rose-50 text-rose-900'
      }`}
    >
      <p className="text-sm font-medium">{formMessage.text}</p>
    </div>
  ) : null

  if (isAdminPersona) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
          <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center">
            <div className="hidden lg:block">
              <div className="max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                  <Sparkles className="h-4 w-4" />
                  Platform Admin
                </div>
                <h1 className="mt-6 text-4xl font-black tracking-tight text-white">Run CentreConnect without the parent confusion.</h1>
                <p className="mt-4 text-base leading-7 text-slate-300">
                  Sign in to reach {adminIntentLabel()}. This workspace is only for platform operators managing centres, support, revenue, and system health.
                </p>
                <div className="mt-8 space-y-4">
                  {[
                    'Open centre onboarding, support, and revenue queues from one place.',
                    'Keep platform work separate from parent and ECD centre journeys.',
                    'Use your secure platform admin credentials only.',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                      <p className="text-sm leading-6 text-slate-200">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Card className="border-white/10 bg-slate-950/60 text-slate-100 shadow-[0_32px_80px_rgba(0,0,0,0.45)]">
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Link href="/" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 hover:underline">
                    Back home
                  </Link>
                  <Link href="/login" className="text-xs font-semibold text-slate-400 hover:text-white hover:underline">
                    Parent sign in
                  </Link>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">CentreConnect</p>
                  <CardTitle className="mt-3 text-3xl font-black tracking-tight text-white">Platform Admin Sign In</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                    Use your platform admin email and password to open your operations workspace.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {confirmationMessage ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
                    <p className="text-sm font-medium text-amber-100">{confirmationMessage}</p>
                  </div>
                ) : null}

                {reason === 'session_expired' ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
                    <p className="text-sm font-medium text-amber-100">Your session ended. Sign in again to continue.</p>
                  </div>
                ) : null}

                {statusMessage}

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-200">
                      Platform admin email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="ops@centreconnect.co.za"
                      className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/20"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="password" className="text-sm font-medium text-slate-200">
                        Password
                      </Label>
                      <Link href="/forgot-password" className="text-sm font-medium text-cyan-300 hover:underline">
                        Forgot password?
                      </Link>
                    </div>

                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-12 rounded-xl border-white/10 bg-white/5 pr-12 text-white placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/20"
                        autoComplete="current-password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-10 w-10 rounded-xl text-slate-400 hover:bg-transparent hover:text-white"
                        onClick={() => setShowPassword((previous) => !previous)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-xl bg-primary text-primary-foreground shadow-[0_18px_40px_rgba(6,182,212,0.28)] hover:bg-primary/90"
                    loading={loading}
                    loadingText="Opening workspace..."
                  >
                    Open Admin Workspace
                  </Button>
                </form>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-300">
                  If you were trying to reach a centre or parent screen, go back and use the correct login for that persona.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ParentAuthShell
      eyebrow="Parent sign in"
      title="Welcome back"
      description="Sign in to see saved creches, applications, and your child details in one place."
      headerNote={
        <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
          No account is needed to browse. Create one only when you want to apply or save progress.
          <Link href="/directory" className="ml-1 font-semibold text-primary hover:underline">
            Browse the directory first
          </Link>
          .
        </div>
      }
      supportTitle="Keep each family step clear"
      supportDescription="Use your account when you want to save applications, child details, and the next step for each creche."
      highlights={[
        {
          icon: MapPin,
          title: 'Pick up where you left off',
          description: 'See saved creches, open applications, and your next action without starting over.',
        },
        {
          icon: ShieldCheck,
          title: 'Keep family details protected',
          description: 'Child and pickup details stay inside your secure CentreConnect account.',
        },
        {
          icon: Clock3,
          title: 'Move faster when you are ready',
          description: 'Sign in only when you want to apply, upload details, or track what happens next.',
        },
      ]}
      supportFootnote={
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">New here?</p>
          <p className="text-sm leading-6 text-muted-foreground">
            Create a parent account when you want to save your family details and apply faster.
          </p>
          <Button
            variant="outline"
            asChild
            className="h-11 rounded-xl border-border bg-white text-foreground hover:bg-muted"
          >
            <Link href={registerHref()}>Create a parent account</Link>
          </Button>
        </div>
      }
      form={
        <div className="space-y-5">
          {confirmationMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status="Link problem" />
                <p className="text-sm font-medium text-rose-800">{confirmationMessage}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-rose-800">
                Use the email field below, then resend a fresh confirmation link.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 h-10 rounded-xl border-rose-200 bg-white text-rose-700 hover:bg-rose-100"
                onClick={() => void handleResendConfirmation()}
                loading={resendLoading}
                loadingText="Sending email..."
              >
                Resend confirmation email
              </Button>
            </div>
          ) : null}

          {confirmEmailRequested && !confirmationMessage ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status="Check your email" />
                <p className="text-sm font-medium text-amber-900">
                  We sent a confirmation email to this address. If it does not arrive, resend it here.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-3 h-10 rounded-xl border-amber-200 bg-white text-amber-800 hover:bg-amber-100"
                onClick={() => void handleResendConfirmation()}
                loading={resendLoading}
                loadingText="Sending email..."
              >
                Resend confirmation email
              </Button>
            </div>
          ) : null}

          {reason === 'session_expired' ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status="Session ended" />
                <p className="text-sm font-medium text-amber-900">Sign in again to carry on from where you stopped.</p>
              </div>
            </div>
          ) : null}

          {statusMessage}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className={labelClassName}>
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@domain.com"
                className={fieldClassName}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password" className={labelClassName}>
                  Password
                </Label>
                <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${fieldClassName} pr-12`}
                  autoComplete="current-password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-10 w-10 rounded-xl text-slate-500 hover:bg-transparent hover:text-slate-700"
                  onClick={() => setShowPassword((previous) => !previous)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-primary text-primary-foreground shadow-[0_14px_30px_rgba(13,148,136,0.18)] hover:bg-primary/90"
              loading={loading}
              loadingText="Signing in..."
            >
              Sign in
            </Button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-white px-3 text-xs font-medium text-slate-500">or continue with</span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-xl border-border bg-white text-foreground hover:bg-muted"
            onClick={() => void handleGoogleSignIn()}
            disabled={loading}
            loading={googleLoading}
            loadingText="Opening Google..."
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="rgb(66,133,244)"
              />
              <path
                d="M12 23c2.97 0 5.48-.98 7.31-2.64l-3.57-2.77c-.99.66-2.26 1.06-3.74 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="rgb(52,168,83)"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="rgb(251,188,5)"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="rgb(234,67,53)"
              />
            </svg>
            Continue with Google
          </Button>
        </div>
      }
      footer={
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href={registerHref()} className="font-semibold text-primary hover:underline">
            Create your account
          </Link>
        </p>
      }
    />
  )
}

