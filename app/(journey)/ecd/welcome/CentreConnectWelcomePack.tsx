'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileCheck2,
  Globe,
  Lock,
  MessageCircle,
  Printer,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type ProfileRow = {
  first_name: string | null
  full_name: string | null
  first_password_set_at: string | null
}

type CentreMembership = {
  id: string
  slug: string | null
  name: string | null
  suburb: string | null
  city: string | null
  logo_url: string | null
  cover_image_url: string | null
  description: string | null
  phone: string | null
  address: string | null
}

type MembershipRow = {
  ecd_centres: CentreMembership | CentreMembership[] | null
}

function toSafeText(value: string | null | undefined, fallback: string) {
  const next = (value ?? '').trim()
  return next.length > 0 ? next : fallback
}

function toLocation(suburb: string | null | undefined, city: string | null | undefined) {
  const parts = [suburb, city].map((part) => (part ?? '').trim()).filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Johannesburg'
}

function extractCentre(value: MembershipRow['ecd_centres']) {
  if (!value) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function toPackageLabel(value: string | null | undefined) {
  const raw = (value ?? '').trim()
  if (!raw) return 'Pilot'
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function buildWhatsappHref(firstName: string, centreName: string) {
  const text = `Hi Mandla, this is ${firstName} from ${centreName}. Please help me finish my CentreConnect setup.`
  return `https://wa.me/27685356430?text=${encodeURIComponent(text)}`
}

export default function CentreConnectWelcomePack() {
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const queryString = searchParams.toString()
  const safeNextPath = queryString ? `/ecd/welcome?${queryString}` : '/ecd/welcome'

  const queryDefaults = useMemo(
    () => ({
      contactName: toSafeText(searchParams.get('name'), 'Friend'),
      centreName: toSafeText(searchParams.get('centre'), 'your creche'),
      location: toSafeText(searchParams.get('location'), 'Johannesburg'),
      centreSlug: toSafeText(searchParams.get('slug'), ''),
      packageLabel: toPackageLabel(searchParams.get('package')),
      inviteEmail: toSafeText(searchParams.get('email'), ''),
    }),
    [searchParams]
  )

  const [contactName, setContactName] = useState(queryDefaults.contactName)
  const [centreName, setCentreName] = useState(queryDefaults.centreName)
  const [location, setLocation] = useState(queryDefaults.location)
  const [centreSlug, setCentreSlug] = useState(queryDefaults.centreSlug)
  const [packageLabel, setPackageLabel] = useState(queryDefaults.packageLabel)

  const inviteEmail = queryDefaults.inviteEmail
  const cameFromPasswordSetup = searchParams.get('from') === 'password-setup'
  const passwordHelpHref = inviteEmail ? `/forgot-password?email=${encodeURIComponent(inviteEmail)}` : '/forgot-password'

  const [childrenCount, setChildrenCount] = useState(0)
  const [attendanceCount, setAttendanceCount] = useState(0)
  const [pickupCount, setPickupCount] = useState(0)
  const [hasLogo, setHasLogo] = useState(false)
  const [hasCoverImage, setHasCoverImage] = useState(false)
  const [hasDescription, setHasDescription] = useState(false)
  const [hasPhone, setHasPhone] = useState(false)
  const [hasAddress, setHasAddress] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'done'>('idle')

  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const firstName = useMemo(() => contactName.split(' ')[0] || 'Friend', [contactName])
  const profileComplete = hasLogo && hasCoverImage && hasDescription && hasPhone && hasAddress
  const posterHref = centreSlug ? `/centre/${centreSlug}/poster` : '/ecd/website'
  const publicCentreHref = centreSlug ? `/centre/${centreSlug}` : '/ecd/website'
  const supportWhatsappHref = buildWhatsappHref(firstName, centreName)

  useEffect(() => {
    let mounted = true

    async function loadWelcomeContext() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      if (!session?.user?.id) {
        setHasSession(false)
        setCheckingSession(false)
        return
      }

      setHasSession(true)

      const [profileResult, membershipResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('first_name,full_name,first_password_set_at')
          .eq('id', session.user.id)
          .maybeSingle(),
        supabase
          .from('ecd_admins')
          .select('ecd_centres:ecd_id(id,slug,name,suburb,city,logo_url,cover_image_url,description,phone,address)')
          .eq('user_id', session.user.id)
          .limit(1)
          .maybeSingle(),
      ])

      if (!mounted) return

      const profile = profileResult.data as ProfileRow | null
      const centre = extractCentre((membershipResult.data as MembershipRow | null)?.ecd_centres ?? null)

      setRequiresPasswordSetup(!profile?.first_password_set_at)
      setContactName(toSafeText(profile?.first_name ?? profile?.full_name, queryDefaults.contactName))

      if (centre) {
        setCentreName(toSafeText(centre.name, queryDefaults.centreName))
        setLocation(toLocation(centre.suburb, centre.city))
        setCentreSlug(toSafeText(centre.slug, queryDefaults.centreSlug))
        setPackageLabel(queryDefaults.packageLabel)
        setHasLogo(Boolean(centre.logo_url?.trim()))
        setHasCoverImage(Boolean(centre.cover_image_url?.trim()))
        setHasDescription(Boolean(centre.description?.trim()))
        setHasPhone(Boolean(centre.phone?.trim()))
        setHasAddress(Boolean(centre.address?.trim() && centre.suburb?.trim()))

        const [childrenResult, attendanceResult, pickupResult] = await Promise.all([
          supabase.from('children').select('id', { count: 'exact', head: true }).eq('ecd_id', centre.id),
          supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('ecd_id', centre.id),
          supabase.from('pickup_codes').select('id', { count: 'exact', head: true }).eq('ecd_id', centre.id),
        ])

        if (!mounted) return

        setChildrenCount(childrenResult.count ?? 0)
        setAttendanceCount(attendanceResult.count ?? 0)
        setPickupCount(pickupResult.count ?? 0)
      }

      setCheckingSession(false)
    }

    void loadWelcomeContext()

    return () => {
      mounted = false
    }
  }, [queryDefaults.centreName, queryDefaults.centreSlug, queryDefaults.contactName, queryDefaults.packageLabel, supabase])

  const activationSteps = useMemo(
    () => [
      {
        id: 'child',
        step: '01',
        title: 'Add your first child',
        description:
          'Start with one child only. Once that child is in, attendance, daily reports, and the parent experience make sense immediately.',
        href: '/ecd/children/new',
        ctaLabel: childrenCount > 0 ? 'Children added' : 'Add first child',
        done: childrenCount > 0,
        icon: Users,
      },
      {
        id: 'attendance',
        step: '02',
        title: 'Mark attendance once',
        description:
          'Take one register on your phone so the daily rhythm is live and your team sees how fast the new flow is.',
        href: '/ecd/attendance',
        ctaLabel: attendanceCount > 0 ? 'Attendance live' : 'Open attendance',
        done: attendanceCount > 0,
        icon: FileCheck2,
      },
      {
        id: 'pickup',
        step: '03',
        title: 'Turn on safe pickup',
        description:
          'Approve the adults who can collect and use secure codes at the gate. This is where parents start to feel the difference.',
        href: '/ecd/pickup',
        ctaLabel: pickupCount > 0 ? 'Pickup ready' : 'Set up pickup',
        done: pickupCount > 0,
        icon: ShieldCheck,
      },
      {
        id: 'profile',
        step: '04',
        title: 'Finish your centre profile',
        description:
          'Logo, cover photo, phone number, and address help parents trust what they see before they ever contact you.',
        href: hasLogo || hasCoverImage ? '/ecd/website' : '/ecd/profile',
        ctaLabel: profileComplete ? 'Profile ready' : 'Finish profile',
        done: profileComplete,
        icon: Globe,
      },
    ],
    [attendanceCount, childrenCount, hasCoverImage, hasLogo, pickupCount, profileComplete]
  )

  const completedSteps = activationSteps.filter((step) => step.done).length
  const progressPct = Math.round((completedSteps / activationSteps.length) * 100)
  const nextStep = activationSteps.find((step) => !step.done)

  async function handlePasswordSetup(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)

    if (password.length < 8) {
      setPasswordError('Use at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordSaving(true)

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setPasswordError(error.message)
      setPasswordSaving(false)
      return
    }

    await fetch('/api/auth/password-setup-confirmed', { method: 'POST' }).catch(() => null)
    setRequiresPasswordSetup(false)
    setPasswordSaving(false)
    toast.success('Password saved. Opening your guide now. We also sent it to your email.')
  }

  function handleCopyCentreLink() {
    if (!centreSlug) {
      toast.info('Finish your centre profile first, then your public link will be ready to share.')
      return
    }

    const absoluteUrl = `${window.location.origin}/centre/${centreSlug}`
    navigator.clipboard.writeText(absoluteUrl).then(
      () => {
        setCopyStatus('done')
        toast.success('Centre link copied. Share it with parents on WhatsApp.')
        window.setTimeout(() => setCopyStatus('idle'), 2000)
      },
      () => {
        toast.error('We could not copy the link. Please try again.')
      }
    )
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 selection:bg-cyan-100 selection:text-cyan-900">
        <div className="mx-auto max-w-md">
          <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-xl">
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <BookOpen className="h-5 w-5 animate-pulse" />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Checking your secure link</p>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Opening your centre guide</h1>
                <p className="text-sm font-medium leading-6 text-slate-500">
                  We are making sure you land in the right workspace.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 selection:bg-cyan-100 selection:text-cyan-900">
        <div className="mx-auto max-w-md">
          <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-xl">
            <CardContent className="space-y-5 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Secure access needed</p>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Sign in to open your guide</h1>
                <p className="text-sm font-medium leading-6 text-slate-500">
                  If you already created your password, sign in and this guide will open. If you have not created it yet,
                  request a new password link first.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">Guide requested</p>
                <p className="mt-2 text-lg font-black text-slate-900">{centreName}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{location}</p>
              </div>
              <div className="space-y-3">
                <Button asChild className="h-12 w-full rounded-2xl bg-teal-600 text-sm font-black hover:bg-teal-700">
                  <Link href={`/ecd/login?next=${encodeURIComponent(safeNextPath)}`}>Sign in to open guide</Link>
                </Button>
                <Button asChild variant="outline" className="h-12 w-full rounded-2xl border-slate-200 text-sm font-black">
                  <Link href={passwordHelpHref}>Create or reset password</Link>
                </Button>
                <Button asChild variant="outline" className="h-12 w-full rounded-2xl border-slate-200 text-sm font-black">
                  <Link href={supportWhatsappHref}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp Mandla for help
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (requiresPasswordSetup) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 selection:bg-cyan-100 selection:text-cyan-900">
        <div className="mx-auto max-w-md">
          <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-xl">
            <CardContent className="space-y-6 p-6">
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Secure your centre account</p>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">Set your password</h1>
                  <p className="text-sm font-medium leading-6 text-slate-500">
                    One password, then your welcome guide opens here and we also send the same guide to your email.
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">Centre ready</p>
                <p className="mt-2 text-lg font-black text-slate-900">{centreName}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{location}</p>
              </div>

              <form onSubmit={handlePasswordSetup} className="space-y-4">
                <Input
                  type="password"
                  placeholder="New password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-14 rounded-2xl px-4 text-base font-semibold"
                />
                <Input
                  type="password"
                  placeholder="Confirm password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-14 rounded-2xl px-4 text-base font-semibold"
                />
                {passwordError ? <p className="px-1 text-xs font-bold text-rose-600">{passwordError}</p> : null}
                <Button
                  type="submit"
                  className="h-14 w-full rounded-2xl bg-teal-600 text-base font-black hover:bg-teal-700"
                  disabled={passwordSaving}
                >
                  {passwordSaving ? 'Saving password...' : 'Set password and continue'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f3f8f8_100%)] pb-16 selection:bg-cyan-100 selection:text-cyan-900">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#0f766e_0%,#14b8a6_100%)] p-5 text-white sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em]">
                Welcome pack live
              </span>
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
                {packageLabel}
              </span>
            </div>
            <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-bold text-teal-50">{location}</p>
                  <h1 className="text-[2rem] font-black leading-tight tracking-tight sm:text-[2.5rem]">
                    Sawubona, {firstName}. Your centre is ready.
                  </h1>
                  <p className="max-w-2xl text-sm font-medium leading-7 text-teal-50 sm:text-base">
                    This guide shows the exact first moves that make CentreConnect click for your team. Start with one child,
                    then everything else gets easier.
                  </p>
                  {cameFromPasswordSetup ? (
                    <div className="rounded-[1.25rem] border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white/90">
                      Your guide is opening now, and the same guide was sent to your email so you can come back to it later.
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">Setup progress</p>
                      <p className="mt-1 text-sm font-bold text-white">
                        {completedSteps} of {activationSteps.length} first steps done
                      </p>
                    </div>
                    <p className="text-sm font-black text-white">{progressPct}%</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-white" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="h-12 rounded-2xl bg-slate-950 text-sm font-black text-white hover:bg-slate-900">
                    <Link href={nextStep?.href ?? '/ecd/dashboard'}>
                      {nextStep?.ctaLabel ?? 'Open dashboard'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-12 rounded-2xl border-white/20 bg-white/10 text-sm font-black text-white hover:bg-white/15 hover:text-white">
                    <Link href="/ecd/dashboard">Go to dashboard</Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-slate-950/90 p-5 text-white shadow-2xl">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-teal-200">What to do next</p>
                <h2 className="mt-2 text-xl font-black leading-tight">
                  {nextStep ? nextStep.title : 'Your first setup is complete.'}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-300">
                  {nextStep
                    ? nextStep.description
                    : 'You already have the basics in place. From here, keep using the dashboard and invite your team into the daily flow.'}
                </p>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Children</p>
                    <p className="mt-2 text-2xl font-black text-white">{childrenCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Attendance</p>
                    <p className="mt-2 text-2xl font-black text-white">{attendanceCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pickup</p>
                    <p className="mt-2 text-2xl font-black text-white">{pickupCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-[1.75rem] border-teal-100 bg-teal-50/60 shadow-none">
              <CardHeader className="space-y-3 pb-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-teal-700">Start here</p>
                  <CardTitle className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                    You only need one child to feel the system work.
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm font-medium leading-7 text-slate-600">
                  Add one child now. After that, mark attendance once. Those two steps are enough for your team to understand the new daily flow.
                </p>
                <div className="space-y-3">
                  {[
                    'Add one child profile from your paper register.',
                    'Take attendance once so the daily register is live.',
                    'Turn on secure pickup before the next busy collection time.',
                  ].map((item, index) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white px-4 py-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-black text-teal-700">
                        {index + 1}
                      </span>
                      <p className="flex-1 text-sm font-semibold leading-6 text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
                <Button asChild className="h-12 w-full rounded-2xl bg-teal-600 text-sm font-black hover:bg-teal-700">
                  <Link href={nextStep?.href ?? '/ecd/dashboard'}>
                    {nextStep?.ctaLabel ?? 'Open dashboard'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[1.75rem] border-slate-200 shadow-none">
              <CardHeader className="pb-2">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Quick tools</p>
                <CardTitle className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  Useful links you will keep coming back to
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Button asChild variant="outline" className="h-12 rounded-2xl justify-start border-slate-200 text-sm font-black">
                  <Link href={posterHref} target="_blank">
                    <Printer className="mr-2 h-4 w-4" />
                    Print gate poster
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-2xl justify-start border-slate-200 text-sm font-black">
                  <Link href="/ecd/website">
                    <Globe className="mr-2 h-4 w-4" />
                    Website setup
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-2xl justify-start border-slate-200 text-sm font-black">
                  <Link href="/ecd/profile">
                    <BadgeCheck className="mr-2 h-4 w-4" />
                    Centre settings
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyCentreLink}
                  className={cn(
                    'h-12 rounded-2xl justify-start border-slate-200 text-sm font-black',
                    copyStatus === 'done' && 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  )}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {copyStatus === 'done' ? 'Centre link copied' : 'Copy centre link'}
                </Button>

                <div className="sm:col-span-2 rounded-[1.4rem] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Need a hand?</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                    Reply on WhatsApp if you want help with setup, staff training, or explaining CentreConnect to your team.
                  </p>
                  <Button asChild className="mt-4 h-11 rounded-2xl bg-[#25D366] text-sm font-black text-white hover:bg-[#1faa52]">
                    <Link href={supportWhatsappHref}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp Mandla
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Your first steps</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Keep it simple. Finish these in order.
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {activationSteps.map((step) => {
              const Icon = step.icon
              return (
                <Card
                  key={step.id}
                  className={cn(
                    'rounded-[1.75rem] border shadow-none transition-colors',
                    step.done ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'
                  )}
                >
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-2xl',
                            step.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                          )}
                        >
                          {step.done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Step {step.step}</p>
                          <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">{step.title}</h3>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]',
                          step.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        )}
                      >
                        {step.done ? 'Done' : 'Next'}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-7 text-slate-600">{step.description}</p>
                    <Button
                      asChild
                      variant={step.done ? 'outline' : 'default'}
                      className={cn(
                        'h-11 rounded-2xl text-sm font-black',
                        step.done
                          ? 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
                          : 'bg-slate-950 text-white hover:bg-slate-900'
                      )}
                    >
                      <Link href={step.href}>
                        {step.ctaLabel}
                        {!step.done ? <ArrowRight className="ml-2 h-4 w-4" /> : <ExternalLink className="ml-2 h-4 w-4" />}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <Card className="rounded-[1.75rem] border-slate-200 bg-white shadow-none">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Public page</p>
                <div>
                  <p className="text-lg font-black text-slate-900">{centreName}</p>
                  <p className="text-sm font-medium text-slate-500">
                    {location} {centreSlug ? '• ready to share with parents' : '• finish your profile to get your share link'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="outline" className="h-11 rounded-2xl border-slate-200 text-sm font-black">
                  <Link href={publicCentreHref} target={centreSlug ? '_blank' : undefined}>
                    <QrCode className="mr-2 h-4 w-4" />
                    View public page
                  </Link>
                </Button>
                <Button asChild className="h-11 rounded-2xl bg-teal-600 text-sm font-black hover:bg-teal-700">
                  <Link href="/ecd/dashboard">Open dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}







