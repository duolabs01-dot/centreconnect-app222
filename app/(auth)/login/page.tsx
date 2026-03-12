'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Clock3, Eye, EyeOff, MapPin, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { ParentAuthShell } from '@/components/auth/parent-auth-shell'
import { Button } from '@/components/ui/button'
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
  'h-12 rounded-xl border-[#D9D8CF] bg-[#FFFCF8] text-[15px] shadow-none placeholder:text-slate-400 focus-visible:border-[#0D9488] focus-visible:ring-[#0D9488]/20'
const labelClassName = 'text-sm font-medium text-[#33423E]'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') ?? ''
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const supabase = createClient()
  const requestedNext = searchParams.get('next')
  const reason = searchParams.get('reason')
  const authError = searchParams.get('error')

  function confirmationErrorMessage(code: string | null) {
    if (code === 'invalid-confirmation-link') return 'That email confirmation link is invalid.'
    if (code === 'confirmation-failed') return 'We could not confirm your email. Please request a new confirmation link.'
    if (code === 'confirmation-session-missing') return 'Confirmation succeeded, but we could not start your session. Please sign in.'
    if (code === 'confirmation-profile-setup') return 'Your email was confirmed, but account setup is incomplete. Please sign in again.'
    return null
  }

  function sanitizeNextPath(value: string | null | undefined) {
    if (!value) return null
    if (!value.startsWith('/')) return null
    if (value.startsWith('//')) return null
    if (value.startsWith('/login') || value.startsWith('/register') || value.startsWith('/auth')) return null
    return value
  }

  function authDestinationPath() {
    return sanitizeNextPath(requestedNext) ?? '/'
  }

  function registerHref() {
    const destination = sanitizeNextPath(requestedNext)
    if (!destination) return '/register'
    return `/register?next=${encodeURIComponent(destination)}`
  }

  async function handleResendConfirmation() {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      toast.error('Enter the parent email address first.')
      return
    }

    setResendLoading(true)
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

      toast.success('Fresh confirmation email sent. Check inbox and spam.')
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'Failed to resend confirmation email'
      toast.error(message)
    } finally {
      setResendLoading(false)
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()

    if (!normalizedEmail || !normalizedPassword) {
      toast.error('Email and password are required.')
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

      triggerConfetti('application')
      toast.success('Signed in.')
      const destination = sanitizeNextPath(requestedNext) ?? destinationForRole(role)
      router.replace(destination)
      router.refresh()
    } catch (error: unknown) {
      await robustSignOut(supabase)
      const message =
        error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'Failed to sign in'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
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
      toast.error(message)
      setGoogleLoading(false)
    }
  }

  const confirmationMessage = confirmationErrorMessage(authError)

  return (
    <ParentAuthShell
      eyebrow="Parent sign in"
      title="Welcome back"
      description="Sign in to see saved creches, applications, and your child details in one place."
      headerNote={
        <div className="rounded-2xl border border-[#E6DDD2] bg-[#FFFCF8] px-4 py-3 text-sm leading-6 text-[#5F6D69]">
          No account is needed to browse. Create one only when you want to apply or save progress.
          <Link href="/directory" className="ml-1 font-semibold text-[#0D9488] hover:underline">
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0D9488]">New here?</p>
          <p className="text-sm leading-6 text-[#5F6D69]">
            Create a parent account when you want to save your family details and apply faster.
          </p>
          <Button
            variant="outline"
            asChild
            className="h-11 rounded-xl border-[#DED2C5] bg-white text-[#22312E] hover:bg-[#F8F3EC]"
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

          {searchParams.get('confirm_email') === '1' && !confirmationMessage ? (
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
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password" className={labelClassName}>
                  Password
                </Label>
                <Link href="/forgot-password" className="text-sm font-medium text-[#0D9488] hover:underline">
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
              className="h-12 w-full rounded-xl bg-[#0D9488] text-white shadow-[0_14px_30px_rgba(13,148,136,0.18)] hover:bg-[#0B857A]"
              loading={loading}
              loadingText="Signing in..."
            >
              Sign in
            </Button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E8DDD0]" />
            </div>
            <span className="relative bg-white px-3 text-xs font-medium text-slate-500">or continue with</span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-xl border-[#DED2C5] bg-white text-[#22312E] hover:bg-[#F8F3EC]"
            onClick={() => void handleGoogleSignIn()}
            disabled={loading}
            loading={googleLoading}
            loadingText="Opening Google..."
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.48-.98 7.31-2.64l-3.57-2.77c-.99.66-2.26 1.06-3.74 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
        </div>
      }
      footer={
        <p className="text-sm text-[#5F6D69]">
          Don&apos;t have an account?{' '}
          <Link href={registerHref()} className="font-semibold text-[#0D9488] hover:underline">
            Create your account
          </Link>
        </p>
      }
    />
  )
}
