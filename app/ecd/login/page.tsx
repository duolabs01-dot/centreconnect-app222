'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Section } from '@/components/layout/Section'
import { triggerConfetti } from '@/lib/ui/confetti'
import { registerSession } from '@/lib/session-guard'

export default function EcdLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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

      const ensureProfileResponse = await fetch('/api/auth/ensure-profile', { method: 'POST' })
      if (!ensureProfileResponse.ok) {
        const payload = (await ensureProfileResponse.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || 'Failed to finalize account profile')
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError) throw profileError

      if (profile.role !== 'ecd_admin' && profile.role !== 'ecd_staff' && profile.role !== 'ecd_supervisor') {
        await supabase.auth.signOut()
        toast.error('This login is for ECD centres only')
        setLoading(false)
        return
      }

      if (profile.role === 'ecd_admin') {
        const bootstrapResponse = await fetch('/api/ecd/bootstrap-centre', { method: 'POST' })
        if (bootstrapResponse.status === 403) {
          const payload = (await bootstrapResponse.json().catch(() => ({}))) as { error?: string; code?: string }
          await supabase.auth.signOut()
          toast.error(
            payload.code === 'APPLICATION_PENDING'
              ? 'Application pending approval. We will notify you once approved.'
              : payload.error || 'Account is not ready yet.'
          )
          setLoading(false)
          return
        }
        if (!bootstrapResponse.ok) {
          const payload = (await bootstrapResponse.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error || 'Failed to prepare centre workspace')
        }
      }

      triggerConfetti('application')
      toast.success('Welcome back')
      router.replace('/ecd/dashboard')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to login')
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
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@centre.co.za"
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
                    className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button type="submit" size="lg" className="h-12 w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-slate-600">Are you a parent? </span>
              <Link href="/login" className="font-medium text-primary hover:underline">
                Parent login
              </Link>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  )
}


