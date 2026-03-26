'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle2, Eye, EyeOff, FileCheck2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { ParentAuthShell } from '@/components/auth/parent-auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { buildAuthCallbackRedirect } from '@/lib/auth/onboarding-links'

const TERMS_VERSION = '2026-02-19'
const fieldClassName =
  'h-12 rounded-xl border-border bg-background text-[15px] shadow-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-primary/20'
const labelClassName = 'text-sm font-medium text-foreground'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    surname: '',
    phone: '',
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
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
    return sanitizeNextPath(requestedNext) ?? '/parent/onboarding'
  }

  function loginHref() {
    const destination = sanitizeNextPath(requestedNext)
    if (!destination) return '/login'
    return `/login?next=${encodeURIComponent(destination)}`
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault()

    const normalizedEmail = formData.email.trim().toLowerCase()
    const normalizedPassword = formData.password.trim()
    const normalizedFirstName = formData.firstName.trim()
    const normalizedSurname = formData.surname.trim()
    const normalizedFullName = [normalizedFirstName, normalizedSurname].filter(Boolean).join(' ').trim()

    if (!normalizedEmail || !normalizedPassword) {
      toast.error('Email and password are required.')
      return
    }
    if (!normalizedFirstName) {
      toast.error('First name is required.')
      return
    }
    if (normalizedPassword !== confirmPassword.trim()) {
      toast.error('Passwords do not match.')
      return
    }
    if (!acceptedTerms) {
      toast.error('Please accept the Terms of Use to continue.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register-parent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password: normalizedPassword,
          firstName: normalizedFirstName,
          surname: normalizedSurname || null,
          fullName: normalizedFullName || normalizedFirstName,
          phone: formData.phone.trim(),
          nextPath: authDestinationPath(),
          termsVersion: TERMS_VERSION,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create account')
      }

      toast.success('Confirmation email sent. Check inbox or spam, then confirm and sign in.')
      const destination = new URLSearchParams()
      destination.set('email', normalizedEmail)
      destination.set('confirm_email', '1')
      const nextPath = sanitizeNextPath(requestedNext)
      if (nextPath) destination.set('next', nextPath)
      router.push(`/login?${destination.toString()}`)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to create account'))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignUp() {
    if (!acceptedTerms) {
      toast.error('Please accept the Terms of Use to continue.')
      return
    }

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
      toast.error(getErrorMessage(error, 'Failed to start Google sign up'))
      setGoogleLoading(false)
    }
  }

  return (
    <ParentAuthShell
      eyebrow="Parent account"
      title="Your child's next chapter starts here."
      description="One account. Every creche you care about. Every step tracked — so nothing slips through."
      headerNote={
        <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
          Rather browse first? That&apos;s fine — no account needed. Come back when you are ready to apply or save your progress.
        </div>
      }
      supportTitle="Your family's future, one step at a time."
      supportDescription="CentreConnect keeps your child's details safe, your applications organised, and your next move always clear — without the back-and-forth."
      highlights={[
        {
          icon: FileCheck2,
          title: "Your child\u2019s story, kept safe",
          description: "Enter your child\u2019s details once and reuse them across every application \u2014 no retyping, no frustration.",
        },
        {
          icon: CheckCircle2,
          title: "Never wonder what\u2019s happening next",
          description: "See every application you\u2019ve sent, what\u2019s been received, and exactly what needs your attention.",
        },
        {
          icon: ShieldCheck,
          title: 'Protected the way your family deserves',
          description: 'Pickup details, emergency contacts, and child records stay inside your secure account — nowhere else.',
        },
      ]}
      supportFootnote={
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Three steps to your first application</p>
          <ol className="space-y-2 text-sm leading-6 text-muted-foreground">
            <li>1. Create your account — takes under a minute.</li>
            <li>2. Confirm your email address.</li>
            <li>3. Sign in, add your child&apos;s details, and apply.</li>
          </ol>
        </div>
      }
      form={
        <div className="space-y-5">
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName" className={labelClassName}>
                  First name
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(event) => setFormData({ ...formData, firstName: event.target.value })}
                  placeholder="Nomvula"
                  className={fieldClassName}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="surname" className={labelClassName}>
                  Surname
                </Label>
                <Input
                  id="surname"
                  value={formData.surname}
                  onChange={(event) => setFormData({ ...formData, surname: event.target.value })}
                  placeholder="Mokoena"
                  className={fieldClassName}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className={labelClassName}>
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                placeholder="name@domain.com"
                className={fieldClassName}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className={labelClassName}>
                Phone number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                placeholder="+27..."
                className={fieldClassName}
                required
              />
              <p className="text-xs leading-5 text-slate-500">We use this only for account help and important application updates.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={labelClassName}>
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                  className={`${fieldClassName} pr-12`}
                  required
                  minLength={8}
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className={labelClassName}>
                Confirm password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={`${fieldClassName} pr-12`}
                  required
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-10 w-10 rounded-xl text-slate-500 hover:bg-transparent hover:text-slate-700"
                  onClick={() => setShowConfirmPassword((previous) => !previous)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background px-4 py-4">
              <label htmlFor="acceptTerms" className="flex items-start gap-3">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                />
                <span className="text-sm leading-6 text-muted-foreground">
                  I agree to the{' '}
                  <Link href="/terms" target="_blank" className="font-semibold text-primary underline underline-offset-2">
                    Terms of Use
                  </Link>
                  .
                </span>
              </label>
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-primary text-primary-foreground shadow-[0_14px_30px_rgba(13,148,136,0.18)] hover:bg-primary/90"
              disabled={!acceptedTerms}
              loading={loading}
              loadingText="Creating account..."
            >
              Create account
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
            onClick={() => void handleGoogleSignUp()}
            disabled={loading || !acceptedTerms}
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
          Already have an account?{' '}
          <Link href={loginHref()} className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    />
  )
}

