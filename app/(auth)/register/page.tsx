'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { Section } from '@/components/layout/Section'

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
      if (accountCheck.error) {
        console.error('[register] Email existence check failed:', accountCheck.error)
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
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/70 via-white to-sky-50/60">
      <Section className="min-h-screen py-8 sm:py-10 lg:py-12" containerClassName="flex min-h-[80vh] items-center justify-center">
        <Card className="mx-auto w-full max-w-md border-cyan-100/80 bg-white/90 shadow-[var(--shadow-elevation-4)] backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="text-center">
              <Link href="/" className="text-xs font-semibold text-sky-700 hover:underline">
                Back to Home
              </Link>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">CentreConnect</p>
              <CardTitle className="mt-2 text-2xl text-slate-900">Create Account</CardTitle>
              <CardDescription className="mt-1 text-slate-600">
                Join CentreConnect to find quality ECD care
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="mb-4 h-12 w-full"
              onClick={handleGoogleSignUp}
              disabled={googleLoading || loading}
            >
              {googleLoading ? 'Opening Google...' : 'Continue with Google'}
            </Button>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-slate-500 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-slate-500 hover:text-slate-700"
                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <Button type="submit" size="lg" className="h-12 w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              <span className="text-slate-600">Already have an account? </span>
              <Link href={loginHref()} className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  )
}


