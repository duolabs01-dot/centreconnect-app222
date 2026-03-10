'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react'
import { triggerConfetti } from '@/lib/ui/confetti'
import { BrandMark } from '@/components/cc-admin/BrandMark'
import { robustSignOut } from '@/lib/auth/client-sign-out'
import {
  destinationForRole,
  ensureProfileWithRetry,
  signInWithPasswordRetry,
  type AuthRole,
} from '@/lib/auth/client-auth'
import { buildAuthCallbackRedirect } from '@/lib/auth/onboarding-links'

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
    } catch (error: any) {
      toast.error(error?.message || 'Failed to resend confirmation email')
    } finally {
      setResendLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()
    if (!normalizedEmail || !normalizedPassword) {
      toast.error('Email and password are required')
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
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        role = (profile?.role as AuthRole | undefined) ?? null
      }

      triggerConfetti('application')
      toast.success('Logged in successfully!')
      const destination = sanitizeNextPath(requestedNext) ?? destinationForRole(role)
      router.replace(destination)
      router.refresh()
    } catch (error: any) {
      await robustSignOut(supabase)
      toast.error(error.message || 'Failed to login')
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to start Google sign in')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-surface-secondary text-slate-900">
      {/* Left Panel - Desktop Only */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-slate-900 to-[#1A1A2E] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,#3B82F6_0%,transparent_50%)]" />
        </div>
        <div className="relative z-10 text-center px-12">
          <BrandMark compact className="invert brightness-200 h-16 w-auto mx-auto mb-8" />
          <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
            The next generation of <br />
            <span className="text-cyan-400">Early Childhood Development</span>
          </h1>
          <p className="mt-6 text-slate-400 text-lg max-w-md mx-auto">
            Experience the most powerful, low-latency platform for centre management and admissions.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors lg:hidden">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="w-full max-w-md">
          <div className="bg-white rounded-[2rem] shadow-xl p-8 sm:p-10 border border-slate-100">
            <header className="mb-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 mb-2">CentreConnect</p>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
              <p className="text-slate-500 mt-2 font-medium">Sign in to your account</p>
            </header>

            {confirmationErrorMessage(authError) && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-700">{confirmationErrorMessage(authError)}</p>
                <p className="mt-2 text-sm font-medium leading-6 text-rose-800">Use the email field below, then tap resend to send a fresh confirmation link.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-10 rounded-2xl border-rose-300 bg-white text-xs font-black uppercase tracking-[0.16em] text-rose-700 hover:bg-rose-100"
                  onClick={() => void handleResendConfirmation()}
                  disabled={resendLoading}
                >
                  {resendLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resend confirmation email'}
                </Button>
              </div>
            )}
            {searchParams.get('confirm_email') === '1' && !confirmationErrorMessage(authError) && (
              <div className="mb-6 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">Check your email to finish sign up</p>
                <p className="mt-2 text-sm font-medium leading-6 text-cyan-900">We sent a confirmation email to the address below. If it does not arrive, tap resend.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-10 rounded-2xl border-cyan-300 bg-white text-xs font-black uppercase tracking-[0.16em] text-cyan-700 hover:bg-cyan-100"
                  onClick={() => void handleResendConfirmation()}
                  disabled={resendLoading}
                >
                  {resendLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resend confirmation email'}
                </Button>
              </div>
            )}
            {reason === 'session_expired' && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs font-bold text-amber-700 mb-6 uppercase tracking-wider text-center">
                Session expired. Sign in again to resume.
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="h-12 bg-slate-50 border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</Label>
                  <Link href="/forgot-password" className="text-[10px] font-black uppercase tracking-widest text-cyan-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-slate-50 border-slate-200 rounded-2xl pr-12 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-12 w-12 rounded-2xl text-slate-400 hover:bg-transparent hover:text-slate-600"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                </div>
              </div>
              
              <Button type="submit" className="h-12 w-full bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign in'}
              </Button>
            </form>

            <div className="relative my-8 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <span className="relative px-4 bg-white text-[10px] font-black uppercase tracking-widest text-slate-400">
                or
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full bg-white border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
            >
              {googleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.48-.98 7.31-2.64l-3.57-2.77c-.99.66-2.26 1.06-3.74 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <footer className="mt-8 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Don&apos;t have an account? </span>
              <Link href="/register" className="text-xs font-black uppercase tracking-widest text-cyan-600 hover:underline">
                Create Profile
              </Link>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}

