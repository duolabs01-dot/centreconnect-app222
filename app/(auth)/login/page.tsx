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
import { triggerConfetti } from '@/lib/ui/confetti'
import { registerSession } from '@/lib/session-guard'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const supabase = createClient()
  const requestedNext = searchParams.get('next')
  const reason = searchParams.get('reason')

  function sanitizeNextPath(value: string | null | undefined) {
    if (!value) return null
    if (!value.startsWith('/')) return null
    if (value.startsWith('//')) return null
    if (value.startsWith('/login') || value.startsWith('/register') || value.startsWith('/auth')) return null
    return value
  }

  function destinationForRole(role: string | null | undefined) {
    if (role === 'platform_admin') return '/admin/command'
    if (role === 'ecd_admin' || role === 'ecd_staff') return '/ecd/dashboard'
    return '/parent/dashboard'
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      })
      if (error) throw error

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.access_token && data.user) {
        await registerSession(
          data.user.id,
          session.access_token,
          typeof window !== 'undefined'
            ? navigator.userAgent.slice(0, 100)
            : 'server'
        )
      }

      const ensureProfileResponse = await fetch('/api/auth/ensure-profile', { method: 'POST' })
      const ensurePayload = (await ensureProfileResponse.json().catch(() => ({}))) as { error?: string; role?: string }
      if (!ensureProfileResponse.ok) {
        throw new Error(ensurePayload.error || 'Failed to finalize account profile')
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      const role = profile?.role ?? ensurePayload.role

      if (!role) {
        throw new Error('Profile not found after login')
      }

      triggerConfetti('application')
      toast.success('Logged in successfully!')
      const destination = sanitizeNextPath(requestedNext) ?? destinationForRole(role)
      router.replace(destination)
      router.refresh()
    } catch (error: any) {
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
          redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(
            sanitizeNextPath(requestedNext) ?? '/'
          )}`,
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
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/70 via-white to-sky-50/60">
      <Section className="min-h-screen py-8 sm:py-10 lg:py-12" containerClassName="flex min-h-[80vh] items-center justify-center">
        <Card className="mx-auto w-full max-w-md border-cyan-100/80 bg-white/90 shadow-[0_16px_40px_rgba(2,132,199,0.12)] backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="text-center">
              <Link href="/" className="text-xs font-semibold text-sky-700 hover:underline">
                Back to Home
              </Link>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">CentreConnect</p>
              <CardTitle className="mt-2 text-2xl text-slate-900">Welcome Back</CardTitle>
              <CardDescription className="mt-1 text-slate-600">Sign in to your account</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {reason === 'session_expired' && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 mb-4">
                You were signed out because your account was accessed from another device.
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="mb-4 h-12 w-full"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
            >
              {googleLoading ? 'Opening Google...' : 'Continue with Google'}
            </Button>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
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
                    required
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
                <div className="pt-1 text-right">
                  <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </div>
              <Button type="submit" size="lg" className="h-12 w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              <span className="text-slate-600">Don&apos;t have an account? </span>
              <Link href="/register" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  )
}
