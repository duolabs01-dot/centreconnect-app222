'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { BrandMark } from '@/components/cc-admin/BrandMark'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const supabase = createClient()
  const requestedNext = searchParams.get('next')

  function getErrorMessage(error: unknown, fallback: string) {
    if (typeof error === 'string' && error.trim()) return error
    if (error && typeof error === 'object' && 'message' in error) {
      const maybeMessage = (error as { message?: unknown }).message
      if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage
    }
    return fallback
  }

  function sanitizeNextPath(value: string | null | undefined) {
    if (!value) return null
    if (!value.startsWith('/')) return null
    if (value.startsWith('//')) return null
    if (value.startsWith('/login') || value.startsWith('/register') || value.startsWith('/auth')) return null
    return value
  }

  function authDestinationPath() {
    return sanitizeNextPath(requestedNext) ?? '/parent/dashboard'
  }

  function loginHref() {
    const destination = sanitizeNextPath(requestedNext)
    if (!destination) return '/login'
    return `/login?next=${encodeURIComponent(destination)}`
  }

  function getAuthRedirectUrl() {
    const destination = encodeURIComponent(authDestinationPath())
    return `${window.location.origin.replace(/\/$/, '')}/auth/confirm?next=${destination}`
  }

  function isEmailAlreadyRegisteredMessage(message: string) {
    const normalized = message.toLowerCase()
    return (
      normalized.includes('already registered') ||
      normalized.includes('already been registered') ||
      normalized.includes('already exists') ||
      normalized.includes('email exists')
    )
  }

  async function checkAccountExists(email: string) {
    const response = await fetch('/api/auth/account-exists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const payload = (await response.json().catch(() => ({}))) as { exists?: boolean; error?: string }
    if (!response.ok) {
      return { exists: false, error: payload.error || 'Unable to validate account email' }
    }
    return { exists: Boolean(payload.exists), error: null as string | null }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    const normalizedEmail = formData.email.trim().toLowerCase()
    const normalizedPassword = formData.password.trim()
    if (!normalizedEmail || !normalizedPassword) {
      toast.error('Email and password are required')
      return
    }

    if (normalizedPassword !== confirmPassword.trim()) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const accountCheck = await checkAccountExists(normalizedEmail)
      if (accountCheck.exists) {
        toast.error('This email is already registered. Sign in or reset your password.')
        router.push(loginHref())
        return
      }

      const emailRedirectTo = getAuthRedirectUrl()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: {
          emailRedirectTo,
          data: {
            role: 'parent_user',
            full_name: formData.fullName,
            phone: formData.phone,
          },
        },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      if (!authData.session) {
        const likelyExistingUser = (authData.user.identities?.length ?? 0) === 0
        if (likelyExistingUser) {
          toast.error('This email is already registered. Sign in or reset your password.')
          router.push(loginHref())
          return
        }

        toast.success('Confirmation email sent. Check inbox/spam, then confirm and sign in.')
        router.push(loginHref())
        return
      }

      const ensureProfileResponse = await fetch('/api/auth/ensure-profile', { method: 'POST' })
      if (!ensureProfileResponse.ok) {
        const payload = (await ensureProfileResponse.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || 'Failed to finish account setup')
      }

      toast.success('Account created successfully!')
      router.push(authDestinationPath())
    } catch (error: any) {
      const message = getErrorMessage(error, 'Failed to create account')
      if (message.toLowerCase().includes('row-level security')) {
        toast.error('Account setup is blocked by database policy. Apply the latest Supabase migrations and retry.')
      } else if (isEmailAlreadyRegisteredMessage(message)) {
        toast.error('This email is already registered. Sign in or reset your password.')
        router.push(loginHref())
      } else if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('too many')) {
        toast.error('Too many email attempts. Wait a minute, then try again.')
      } else {
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignUp() {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(authDestinationPath())}`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })
      if (error) throw error
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to start Google sign up'))
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-surface-secondary">
      {/* Left Panel - Desktop Only */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-admin-bg to-[#1A1A2E] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,#3B82F6_0%,transparent_50%)]" />
        </div>
        <div className="relative z-10 text-center px-12">
          <BrandMark compact className="invert brightness-200 h-16 w-auto mx-auto mb-8" />
          <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
            Start your family&apos;s <br />
            <span className="text-admin-accent">Digital ECD Journey</span>
          </h1>
          <p className="mt-6 text-slate-400 text-lg max-w-md mx-auto">
            The simplest way to discover, compare, and apply to quality centres for your children.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-admin-bg transition-colors lg:hidden">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="w-full max-w-md">
          <div className="bg-surface rounded-squircle shadow-float p-8 sm:p-10">
            <header className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-admin-accent mb-2">New Operative Profile</p>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create Account</h2>
              <p className="text-slate-500 mt-2 font-medium">Join the next generation of child care</p>
            </header>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Identity</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  className="h-12 bg-surface-secondary border-slate-200 rounded-xl focus:ring-2 focus:ring-nav-indicator/20 outline-none"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Protocol</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@domain.com"
                  className="h-12 bg-surface-secondary border-slate-200 rounded-xl focus:ring-2 focus:ring-nav-indicator/20 outline-none"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact Signal (Phone)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+27..."
                  className="h-12 bg-surface-secondary border-slate-200 rounded-xl focus:ring-2 focus:ring-nav-indicator/20 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Security Key</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="h-12 bg-surface-secondary border-slate-200 rounded-xl pr-10 focus:ring-2 focus:ring-nav-indicator/20 outline-none"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 flex h-12 w-10 items-center justify-center text-slate-400"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Key</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 bg-surface-secondary border-slate-200 rounded-xl pr-10 focus:ring-2 focus:ring-nav-indicator/20 outline-none"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 flex h-12 w-10 items-center justify-center text-slate-400"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <Button type="submit" className="h-12 w-full bg-admin-bg text-white font-black uppercase tracking-widest rounded-xl shadow-float hover:opacity-90 transition-all active:scale-[0.98] mt-4" disabled={loading}>
                {loading ? 'Encrypting...' : 'Establish Profile'}
              </Button>
            </form>

            <div className="relative my-8 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <span className="relative px-4 bg-surface text-[10px] font-black uppercase tracking-widest text-slate-400">
                Neural Handshake
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full bg-white border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
              onClick={handleGoogleSignUp}
              disabled={googleLoading || loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.48-.98 7.31-2.64l-3.57-2.77c-.99.66-2.26 1.06-3.74 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>

            <footer className="mt-8 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Operative? </span>
              <Link href={loginHref()} className="text-xs font-black uppercase tracking-widest text-nav-indicator hover:underline">
                Initiate Login
              </Link>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
