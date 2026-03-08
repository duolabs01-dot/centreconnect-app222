'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Section } from '@/components/layout/Section'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [checking, setChecking] = useState(true)
  const [lockedEmail, setLockedEmail] = useState('')

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        const tokenHash = url.searchParams.get('token_hash')
        const type = url.searchParams.get('type')
        const emailFromLink = (url.searchParams.get('locked_email') || url.searchParams.get('email') || '').trim()
        if (emailFromLink) {
          setLockedEmail(emailFromLink)
        }

        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        } else if (tokenHash && type) {
          await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'recovery',
          })
        } else if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            window.history.replaceState({}, '', '/reset-password')
          }
        }
      } catch {
        // fall through to session check and invalid-link UI
      }

      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setHasSession(Boolean(data.session))
      setChecking(false)
    })()
    return () => {
      mounted = false
    }
  }, [supabase.auth])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      const response = await fetch('/api/auth/password-setup-confirmed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(() => null)

      const payload = (await response?.json().catch(() => ({}))) as {
        role?: string
        followUpEmail?: 'welcome_pack' | 'password_confirmation' | 'none'
        emailWarning?: string | null
      }
      const isEcd = ['ecd_admin', 'ecd_staff', 'ecd_supervisor'].includes(payload?.role ?? '')
      const welcomeGuideEmailed = payload?.followUpEmail === 'welcome_pack'

      toast.success(
        isEcd
          ? welcomeGuideEmailed
            ? 'Password saved. Opening your guide now. We also sent it to your email.'
            : 'Password saved. Opening your workspace now.'
          : 'Password updated successfully.'
      )
      if (payload?.emailWarning) {
        toast.warning(payload.emailWarning)
      }
      if (isEcd) {
        router.push('/ecd/welcome?from=password-setup')
      } else {
        router.push('/login')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="min-h-screen bg-gradient-to-b from-cyan-50/70 via-white to-sky-50/60">
        <Section className="min-h-screen py-8 sm:py-10 lg:py-12" containerClassName="flex min-h-[80vh] items-center justify-center">
          <Card className="mx-auto w-full max-w-md border-cyan-100/80 bg-white/90 shadow-[var(--shadow-elevation-4)] backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="text-center">
                <Link href="/" className="text-xs font-semibold text-sky-700 hover:underline">
                  Back to Home
                </Link>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">CentreConnect</p>
                <CardTitle className="text-2xl text-slate-900">Set new password</CardTitle>
                <CardDescription className="mt-1 text-slate-600">Choose a secure new password for your account.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {checking ? (
                <p className="text-sm text-slate-600">Checking reset session...</p>
              ) : !hasSession ? (
                <div className="space-y-3 text-sm text-slate-700">
                  <p>This reset link is invalid or expired.</p>
                  <Link href="/forgot-password" className="font-medium text-primary hover:underline">
                    Request a new reset link
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {lockedEmail ? (
                    <div className="space-y-2">
                      <Label htmlFor="lockedEmail">Email (locked)</Label>
                      <Input id="lockedEmail" value={lockedEmail} readOnly disabled className="bg-slate-100 text-slate-500" />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="password">New password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        required
                        className="pr-11"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-10 w-10 text-slate-500 hover:bg-transparent hover:text-slate-700"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        minLength={8}
                        required
                        className="pr-11"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-10 w-10 text-slate-500 hover:bg-transparent hover:text-slate-700"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" size="lg" className="h-12 w-full" disabled={loading}>
                    {loading ? 'Updating...' : 'Update password'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </Section>
      </div>
    </div>
  )
}
