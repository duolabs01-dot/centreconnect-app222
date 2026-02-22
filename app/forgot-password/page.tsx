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

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  function getAuthRedirectUrl() {
    return `${window.location.origin.replace(/\/$/, '')}/reset-password`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const redirectTo = getAuthRedirectUrl()
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
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
          <Card className="mx-auto w-full max-w-md border-cyan-100/80 bg-white/90 shadow-[0_16px_40px_rgba(2,132,199,0.12)] backdrop-blur">
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
