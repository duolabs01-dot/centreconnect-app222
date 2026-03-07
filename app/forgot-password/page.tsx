'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Section } from '@/components/layout/Section'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { buildLockedResetPasswordRedirect } from '@/lib/auth/onboarding-links'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function checkAccountExists(normalizedEmail: string) {
    const response = await fetch('/api/auth/account-exists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    })
    const payload = (await response.json().catch(() => ({}))) as { exists?: boolean; error?: string }
    if (!response.ok) {
      throw new Error(payload.error || 'Unable to verify account email right now')
    }
    return Boolean(payload.exists)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      toast.error('Please enter your email address.')
      return
    }

    setLoading(true)

    try {
      const exists = await checkAccountExists(normalizedEmail)
      if (!exists) {
        toast.error('No account was found for that email. Check the address or create a new account.')
        return
      }

      const redirectTo = buildLockedResetPasswordRedirect(normalizedEmail, window.location.origin)
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo })
      if (error) throw error
      toast.success('Password reset link sent. Check your email.')
    } catch (error: any) {
      const message = String(error?.message || 'Failed to send reset link')
      if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('too many')) {
        toast.error('Email limit reached. Wait a minute, then request another reset link.')
      } else {
        toast.error(message)
      }
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
                <CardTitle className="text-2xl text-slate-900">Reset password</CardTitle>
                <CardDescription className="mt-1 text-slate-600">Enter your email and we&apos;ll send a reset link.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" size="lg" className="h-12 w-full" disabled={loading}>
                  {loading ? 'Sending link...' : 'Send reset link'}
                </Button>
              </form>
              <p className="mt-4 text-center text-sm text-slate-600">
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Back to sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </Section>
      </div>
    </div>
  )
}


