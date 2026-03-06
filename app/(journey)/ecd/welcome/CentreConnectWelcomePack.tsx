'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  HeartHandshake,
  MessageCircle,
  QrCode,
  Sparkles,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { trackAnalyticsEvent } from '@/lib/analytics/client-events'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Scenario = {
  id: string
  emoji: string
  color: string
  bg: string
  accent: string
  title: string
  pain: string
  solution: string
  steps: string[]
  ctaLabel: string
  ctaHref: string
  quote: string
  quoteAuthor: string
}

type CentreProfile = {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  coverImageUrl: string | null
  suburb: string | null
  city: string | null
}

const HERO_IMAGE =
  'https://thumbs.dreamstime.com/b/young-african-preschool-kids-playing-playground-kindergarten-school-soweto-south-africa-july-180790376.jpg'

const scenarios: Scenario[] = [
  {
    id: 'applications',
    emoji: '\u{1F4CB}',
    color: '#0D9488',
    bg: '#F0FDFA',
    accent: '#CCFBF1',
    title: 'No more chasing parents on WhatsApp',
    pain:
      'Documents arrive in many messages and your team keeps scrolling through chats to find what matters.',
    solution:
      'Applications arrive in one clean board. You can accept, decline, or waitlist quickly and parents are updated automatically.',
    steps: [
      'Parent finds your centre and applies.',
      'You get one clear notification.',
      'Review details in one place.',
      'Accept, decline, or waitlist in one tap.',
      'Parent receives instant status update.',
    ],
    ctaLabel: 'Open Applications',
    ctaHref: '/ecd/pipeline',
    quote: 'I used to spend two hours sorting messages. Now it is ten minutes.',
    quoteAuthor: 'Mama Thandi, Soweto',
  },
  {
    id: 'children',
    emoji: '\u{1F9D2}',
    color: '#7C3AED',
    bg: '#FAF5FF',
    accent: '#EDE9FE',
    title: 'Children records are finally organised',
    pain:
      'At pickup or emergency time, looking through paper files creates pressure and delays.',
    solution:
      'Store child profiles, guardians, pickup contacts, and health notes in one searchable place.',
    steps: [
      'Add child name and date of birth.',
      'Choose age group.',
      'Add guardian and emergency contacts.',
      'Add approved pickup people.',
      'Add medical notes and allergies.',
    ],
    ctaLabel: 'Open Children',
    ctaHref: '/ecd/children/new',
    quote: 'Now I can find records in seconds on my phone.',
    quoteAuthor: 'Auntie Rose, Alexandra',
  },
  {
    id: 'attendance',
    emoji: '\u{2705}',
    color: '#0369A1',
    bg: '#F0F9FF',
    accent: '#BAE6FD',
    title: 'Attendance in 30 seconds, not 30 minutes',
    pain:
      'Roll call and month-end counting can take too long and leave room for mistakes.',
    solution:
      'Tap present or absent once per child. Monthly totals are ready automatically.',
    steps: [
      'Open Attendance each morning.',
      'Tap child status quickly.',
      'Add absence note if needed.',
      'Everything saves immediately.',
      'Use monthly totals for invoicing.',
    ],
    ctaLabel: 'Open Attendance',
    ctaHref: '/ecd/attendance',
    quote: 'Month-end is no longer a stressful weekend job.',
    quoteAuthor: 'Mama Precious, Tembisa',
  },
  {
    id: 'pickup',
    emoji: '\u{1F510}',
    color: '#B45309',
    bg: '#FFFBEB',
    accent: '#FDE68A',
    title: 'Safe pickup with less gate confusion',
    pain:
      'Gate-time pressure is real when an unknown person arrives and you need a fast, safe decision.',
    solution:
      'Use QR verification so your staff can confirm authorised pickups in seconds.',
    steps: [
      'Add pickup people to each child profile.',
      'Print your centre QR poster for the gate.',
      'Guardian scans or presents code.',
      'Staff confirms authorisation quickly.',
      'Parents get calm, clear pickup flow.',
    ],
    ctaLabel: 'Open Safe Pickup',
    ctaHref: '/ecd/pickup',
    quote: 'The system helps us stay calm and firm at pickup time.',
    quoteAuthor: 'Mama Lindiwe, Katlehong',
  },
  {
    id: 'parents',
    emoji: '\u{1F4AC}',
    color: '#047857',
    bg: '#F0FDF4',
    accent: '#A7F3D0',
    title: 'Invite parents and keep them involved',
    pain:
      'Parents often feel disconnected during the day and then everything becomes urgent after hours.',
    solution:
      'Parents can follow attendance, updates, and key communication in one trusted place.',
    steps: [
      'Share your centre link with families.',
      'Parents register for free.',
      'Parents apply through CentreConnect.',
      'You review and onboard smoothly.',
      'Families stay informed without WhatsApp noise.',
    ],
    ctaLabel: 'Open Centre Profile',
    ctaHref: '/ecd/profile',
    quote: 'Parents thanked us for clear updates and faster responses.',
    quoteAuthor: 'Auntie Grace, Mamelodi',
  },
  {
    id: 'staff',
    emoji: '\u{1F469}\u{1F3FE}\u{200D}\u{1F3EB}',
    color: '#9D174D',
    bg: '#FFF1F2',
    accent: '#FECDD3',
    title: 'Give staff access without giving up control',
    pain:
      'You cannot be everywhere, and shared passwords are not safe for daily operations.',
    solution:
      'Invite each staff member with role-based access and keep sensitive settings protected.',
    steps: [
      'Open centre settings.',
      'Invite each team member by email.',
      'Choose their role permissions.',
      'They activate their own login.',
      'Your operations stay secure and organised.',
    ],
    ctaLabel: 'Open Staff Setup',
    ctaHref: '/ecd/profile',
    quote: 'My team can support daily tasks while I keep full oversight.',
    quoteAuthor: 'Mama Ntombi, Soweto',
  },
]

const tips = [
  'Add CentreConnect to your home screen so it feels like an app.',
  'Start by adding five children first, then continue in batches.',
  'Print the parent QR poster and place it near the gate.',
  'Upload your logo and hero photo so families trust your profile quickly.',
  'Set one weekly admin slot so setup never feels heavy.',
]

type PublicPlan = 'starter' | 'growth' | 'pro'

type PlanContent = {
  label: string
  shortPitch: string
  bullets: string[]
  yearlyVision: string
}

const PLAN_ALIAS_TO_PUBLIC: Record<string, PublicPlan> = {
  starter: 'starter',
  basic: 'starter',
  pilot: 'starter',
  growth: 'growth',
  standard: 'growth',
  pro: 'pro',
  premium: 'pro',
}

const PLAN_CONTENT: Record<PublicPlan, PlanContent> = {
  starter: {
    label: 'Starter',
    shortPitch: 'Get your centre organised and visible quickly.',
    bullets: [
      'Keep parent applications in one clean place.',
      'Share announcements without WhatsApp confusion.',
      'Publish a professional centre profile parents can trust.',
    ],
    yearlyVision:
      'Great for centres starting digital systems and building confidence with day-to-day admin.',
  },
  growth: {
    label: 'Growth',
    shortPitch: 'Run daily operations with more control and less stress.',
    bullets: [
      'Track attendance and reports without manual counting.',
      'Speed up responses to families and reduce delays.',
      'Operate your centre consistently even on busy days.',
    ],
    yearlyVision:
      'Built for centres that want smoother operations and stronger parent confidence month after month.',
  },
  pro: {
    label: 'Pro',
    shortPitch: 'Scale your centre with priority support and growth tools.',
    bullets: [
      'Get everything in Growth plus advanced setup support.',
      'Strengthen your public presence for parent trust and demand.',
      'Run your centre remotely with clearer visibility and control.',
    ],
    yearlyVision:
      'For owners building a long-term, profitable centre business that can grow beyond one location.',
  },
}

function toSafeText(value: string | null | undefined, fallback: string) {
  const next = (value ?? '').trim()
  return next.length > 0 ? next : fallback
}

function toLocation(suburb: string | null | undefined, city: string | null | undefined) {
  const parts = [suburb, city].map((part) => (part ?? '').trim()).filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'your area'
}

function isSafeImageUrl(value: string | null | undefined) {
  const next = (value ?? '').trim()
  if (!next) return false
  try {
    const parsed = new URL(next)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toPublicPlan(value: string | null | undefined, fallback: PublicPlan = 'growth'): PublicPlan {
  const normalized = (value ?? '').trim().toLowerCase()
  return PLAN_ALIAS_TO_PUBLIC[normalized] ?? fallback
}

function ScenarioCard({
  scenario,
  onOpen,
}: {
  scenario: Scenario
  onOpen: (scenario: Scenario) => void
}) {
  return (
    <Button
      type="button"
      onClick={() => onOpen(scenario)}
      variant="outline"
      className="group !flex !h-full !w-full !flex-col !items-start !justify-start !gap-2 !whitespace-normal rounded-3xl border p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
      style={{
        background: scenario.bg,
        borderColor: scenario.accent,
      }}
    >
      <div className="mb-1 text-2xl leading-none">{scenario.emoji}</div>
      <h3 className="text-base font-black leading-snug break-words" style={{ color: scenario.color }}>
        {scenario.title}
      </h3>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
        Tap to learn more
      </p>
    </Button>
  )
}

function ScenarioModal({
  scenario,
  onClose,
}: {
  scenario: Scenario | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!scenario) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [scenario])

  if (!scenario) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="mx-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={scenario.title}
      >
        <div className="flex items-start justify-between rounded-t-3xl px-6 pb-5 pt-6 text-white" style={{ background: scenario.color }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/80">Scenario</p>
            <h3 className="mt-2 text-xl font-black">{scenario.title}</h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-white/20 text-white transition hover:bg-white/30 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">You know this situation</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{scenario.pain}</p>
          </div>

          <div className="rounded-2xl border p-4" style={{ background: scenario.bg, borderColor: scenario.accent }}>
            <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: scenario.color }}>
              Here is how it works now
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{scenario.solution}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-900">Step by step</p>
            {scenario.steps.map((step, index) => (
              <div key={step} className="flex gap-3">
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                  style={{ background: scenario.color }}
                >
                  {index + 1}
                </span>
                <p className="pt-1 text-sm text-slate-700">{step}</p>
              </div>
            ))}
          </div>

          <blockquote className="rounded-r-2xl border-l-4 bg-slate-50 px-4 py-3 text-sm italic text-slate-700" style={{ borderColor: scenario.color }}>
            {scenario.quote}
            <span className="mt-2 block text-xs font-semibold not-italic text-slate-500">- {scenario.quoteAuthor}</span>
          </blockquote>

          <Button asChild className="h-11 w-full rounded-2xl text-sm font-black" style={{ backgroundColor: scenario.color }}>
            <Link href={scenario.ctaHref}>{scenario.ctaLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function CentreConnectWelcomePack() {
  const supabase = useMemo(() => createClient(), [])

  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)
  const [step, setStep] = useState<0 | 1>(0)
  const [contactName, setContactName] = useState('Friend')
  const [centreName, setCentreName] = useState('your centre')
  const [location, setLocation] = useState('your area')
  const [centreSlug, setCentreSlug] = useState('')
  const [ecdId, setEcdId] = useState<string | null>(null)
  const [centreLogoUrl, setCentreLogoUrl] = useState<string | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string>(HERO_IMAGE)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'done'>('idle')
  const [selectedPlan, setSelectedPlan] = useState<PublicPlan>('growth')
  const [selectedPlanStatus, setSelectedPlanStatus] = useState<string>('trial')

  const [onboardingMode, setOnboardingMode] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [showPasswordPanel, setShowPasswordPanel] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordDone, setPasswordDone] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [scenarioOpened, setScenarioOpened] = useState(false)
  const [dashboardOpened, setDashboardOpened] = useState(false)
  const [websiteOpened, setWebsiteOpened] = useState(false)
  const [qrPosterOpened, setQrPosterOpened] = useState(false)

  const firstName = useMemo(() => {
    const clean = contactName.trim()
    if (!clean) return 'Friend'
    return clean.split(' ')[0] || clean
  }, [contactName])

  const centrePublicPath = centreSlug ? `/centre/${centreSlug}` : ''

  const posterHref = centreSlug ? `/centre/${centreSlug}/poster` : ''
  const selectedPlanContent = PLAN_CONTENT[selectedPlan]
  const onboardingSteps = useMemo(() => {
    const passwordSecured = !onboardingMode || passwordDone || !hasSession || !showPasswordPanel
    return [
      { id: 'welcome', label: 'Opened welcome guide', done: true },
      { id: 'tour', label: 'Started welcome tour', done: step === 1 },
      { id: 'password', label: 'Secured account', done: passwordSecured },
      {
        id: 'action',
        label: 'Took first action',
        done: scenarioOpened || dashboardOpened || websiteOpened || qrPosterOpened,
      },
    ]
  }, [
    dashboardOpened,
    hasSession,
    onboardingMode,
    passwordDone,
    qrPosterOpened,
    scenarioOpened,
    showPasswordPanel,
    step,
    websiteOpened,
  ])
  const onboardingProgressPct = Math.round(
    (onboardingSteps.filter((item) => item.done).length / onboardingSteps.length) * 100
  )

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const params = new URLSearchParams(window.location.search)
      const onboarding = params.get('onboarding') === '1'
      const queryName = toSafeText(params.get('name'), 'Friend')
      const queryCentre = toSafeText(params.get('centre'), 'your centre')
      const queryLocation = toSafeText(params.get('location'), 'your area')
      const querySlug = toSafeText(params.get('slug'), '')
      const queryPackage = toPublicPlan(params.get('package'), 'growth')

      const loadSubscriptionPlan = async (centreId: string) => {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('tier,status')
          .eq('ecd_id', centreId)
          .maybeSingle()
        if (!mounted || !subscription) return
        setSelectedPlan(toPublicPlan(subscription.tier, queryPackage))
        setSelectedPlanStatus((subscription.status ?? 'trial').toLowerCase())
      }

      const applyCentreProfile = async (profile: CentreProfile) => {
        setEcdId(profile.id)
        setCentreSlug(profile.slug)
        setCentreName(toSafeText(profile.name, queryCentre))
        setCentreLogoUrl(isSafeImageUrl(profile.logoUrl) ? profile.logoUrl : null)
        setCoverImageUrl(isSafeImageUrl(profile.coverImageUrl) ? (profile.coverImageUrl as string) : HERO_IMAGE)
        setLocation(toLocation(profile.suburb, profile.city))

        if (!profile.id) return
        try {
          await loadSubscriptionPlan(profile.id)
        } catch {
          setSelectedPlan(queryPackage)
        }
      }

      setOnboardingMode(onboarding)
      setContactName(queryName)
      setCentreName(queryCentre)
      setLocation(queryLocation)
      setSelectedPlan(queryPackage)
      setSelectedPlanStatus('trial')

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!mounted) return

      const signedIn = Boolean(session)
      setHasSession(signedIn)
      setShowPasswordPanel(onboarding && signedIn)

      if (querySlug) {
        const { data: bySlug } = await supabase
          .from('public_ecd_centres')
          .select('id,slug,name,logo_url,cover_image_url,suburb,city')
          .eq('slug', querySlug)
          .maybeSingle()
        if (mounted && bySlug) {
          await applyCentreProfile({
            id: bySlug.id,
            slug: toSafeText(bySlug.slug, querySlug),
            name: toSafeText(bySlug.name, queryCentre),
            logoUrl: bySlug.logo_url,
            coverImageUrl: bySlug.cover_image_url,
            suburb: bySlug.suburb,
            city: bySlug.city,
          })
        } else if (mounted) {
          setCentreSlug(querySlug)
        }
      } else if (signedIn && session?.user?.id) {
        const ownerCentre = await supabase
          .from('ecd_centres')
          .select('id,slug,name,logo_url,cover_image_url,suburb,city')
          .eq('owner_id', session.user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (mounted && ownerCentre.data) {
          await applyCentreProfile({
            id: ownerCentre.data.id,
            slug: toSafeText(ownerCentre.data.slug, ''),
            name: toSafeText(ownerCentre.data.name, queryCentre),
            logoUrl: ownerCentre.data.logo_url,
            coverImageUrl: ownerCentre.data.cover_image_url,
            suburb: ownerCentre.data.suburb,
            city: ownerCentre.data.city,
          })
        } else {
          const membershipResult = await supabase
            .from('ecd_admins')
            .select('ecd_centres:ecd_id(id,slug,name,logo_url,cover_image_url,suburb,city)')
            .eq('user_id', session.user.id)
            .limit(1)

          const firstMembership = Array.isArray(membershipResult.data)
            ? (membershipResult.data[0]?.ecd_centres as {
                slug?: string | null
                name?: string | null
                id?: string | null
                logo_url?: string | null
                cover_image_url?: string | null
                suburb?: string | null
                city?: string | null
              } | null)
            : null

          if (mounted && firstMembership) {
            await applyCentreProfile({
              id: toSafeText(firstMembership.id, ''),
              slug: toSafeText(firstMembership.slug, ''),
              name: toSafeText(firstMembership.name, queryCentre),
              logoUrl: firstMembership.logo_url ?? null,
              coverImageUrl: firstMembership.cover_image_url ?? null,
              suburb: firstMembership.suburb ?? null,
              city: firstMembership.city ?? null,
            })
          }
        }
      } else {
        const fallbackSlug = toSlug(queryCentre)
        if (fallbackSlug) setCentreSlug(fallbackSlug)
      }

      if (mounted) {
        setCheckingSession(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [supabase])

  useEffect(() => {
    if (!ecdId) return
    void trackAnalyticsEvent({
      ecdId,
      actorRole: 'ecd_admin',
      eventType: 'welcome_pack_viewed',
      path: '/ecd/welcome',
      metadata: {
        onboarding_mode: onboardingMode,
      },
    })
  }, [ecdId, onboardingMode])

  useEffect(() => {
    if (!ecdId) return
    void trackAnalyticsEvent({
      ecdId,
      actorRole: 'ecd_admin',
      eventType: 'onboarding_step_viewed',
      path: '/ecd/welcome',
      metadata: {
        step,
      },
    })
  }, [ecdId, step])

  const handleScenarioOpen = (scenario: Scenario) => {
    setScenarioOpened(true)
    setActiveScenario(scenario)
    if (!ecdId) return
    void trackAnalyticsEvent({
      ecdId,
      actorRole: 'ecd_admin',
      eventType: 'welcome_pack_scenario_opened',
      path: '/ecd/welcome',
      metadata: {
        scenario_id: scenario.id,
      },
    })
  }

  const trackCtaClick = (label: string, nextEvent: 'onboarding_completed' | null = null) => {
    if (!ecdId) return
    void trackAnalyticsEvent({
      ecdId,
      actorRole: 'ecd_admin',
      eventType: 'welcome_pack_cta_clicked',
      path: '/ecd/welcome',
      metadata: {
        cta: label,
        step,
      },
    })
    if (nextEvent) {
      void trackAnalyticsEvent({
        ecdId,
        actorRole: 'ecd_admin',
        eventType: nextEvent,
        path: '/ecd/welcome',
        metadata: {
          cta: label,
        },
      })
    }
  }

  async function sendPasswordSetupConfirmationEmail() {
    await fetch('/api/auth/password-setup-confirmed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(() => null)
  }

  async function handlePasswordSetup(event: FormEvent<HTMLFormElement>) {
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
    setPasswordSaving(false)

    if (error) {
      setPasswordError(error.message || 'Could not save password right now.')
      return
    }

    setPassword('')
    setConfirmPassword('')
    setPasswordDone(true)
    setShowPasswordPanel(false)
    await sendPasswordSetupConfirmationEmail()
  }

  async function handleCopyCentreLink() {
    if (!centrePublicPath) return
    trackCtaClick('copy_centre_link')
    try {
      const absolute = `${window.location.origin}${centrePublicPath}`
      await navigator.clipboard.writeText(absolute)
      setCopyStatus('done')
      window.setTimeout(() => setCopyStatus('idle'), 1800)
    } catch {
      setCopyStatus('idle')
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#fff7ed_0%,#f0fdfa_50%,#eff6ff_100%)] pb-20">
      <style>{`
        @keyframes welcomeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      <div className="sticky top-2 z-40 mx-auto w-full max-w-5xl px-4 pt-4">
        <Card className="border-cyan-100/90 bg-white/95 shadow-[var(--shadow-elevation-2)] backdrop-blur">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
                Onboarding progress
              </p>
              <p className="text-xs font-bold text-slate-600">{onboardingProgressPct}% complete</p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300"
                style={{ width: `${onboardingProgressPct}%` }}
              />
            </div>
            <div className="grid gap-1 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              {onboardingSteps.map((item) => (
                <p key={item.id} className={cn('truncate', item.done ? 'font-semibold text-emerald-700' : '')}>
                  {item.done ? '✓' : '○'} {item.label}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {onboardingMode ? (
        <div className="mx-auto w-full max-w-4xl px-4 pt-5">
          <Card className="border-teal-100 bg-white/90 shadow-lg">
            <CardHeader className="space-y-2 pb-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Account setup</p>
              <CardTitle className="text-base font-black text-slate-900">
                Secure your sign-in before you continue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {checkingSession ? <p className="text-sm text-slate-600">Checking secure session...</p> : null}
              {!checkingSession && !hasSession ? (
                <p className="text-sm text-amber-700">
                  Open this page directly from your invite email link to finish account setup.
                </p>
              ) : null}

              {!checkingSession && hasSession && showPasswordPanel ? (
                <form onSubmit={handlePasswordSetup} className="grid gap-3">
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">
                    New password
                    <input
                      type="password"
                      value={password}
                      minLength={8}
                      required
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">
                    Confirm password
                    <input
                      type="password"
                      value={confirmPassword}
                      minLength={8}
                      required
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    />
                  </label>
                  {passwordError ? <p className="text-sm font-medium text-rose-600">{passwordError}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" className="rounded-xl bg-teal-600 hover:bg-teal-500" disabled={passwordSaving}>
                      {passwordSaving ? 'Saving...' : 'Save password'}
                    </Button>
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowPasswordPanel(false)}>
                      Skip for now
                    </Button>
                  </div>
                </form>
              ) : null}

              {passwordDone ? (
                <p className="text-sm font-semibold text-emerald-700">
                  Password saved. You can now sign in any time with your email and password.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {step === 0 ? (
        <section className="mx-auto flex min-h-[90vh] w-full max-w-5xl flex-col items-center justify-center px-4 pb-8 pt-10">
          <div className="relative w-full overflow-hidden rounded-[32px] border border-white/60 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.15)]">
            <img src={coverImageUrl} alt={`${centreName} hero`} className="h-72 w-full object-cover sm:h-80" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-900/25 to-transparent" />

            <div className="absolute left-6 top-6 rounded-xl border border-white/40 bg-white/95 px-3 py-2 shadow-sm">
              <img src="/centreconnect-logo.svg" alt="CentreConnect logo" className="h-8 w-auto" />
            </div>

            {centreLogoUrl ? (
              <div className="absolute right-6 top-6 h-16 w-16 overflow-hidden rounded-full border-4 border-white shadow-xl">
                <img src={centreLogoUrl} alt={`${centreName} logo`} className="h-full w-full object-cover" />
              </div>
            ) : null}

            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">CentreConnect Welcome</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Sawubona, {firstName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cyan-100 sm:text-base">
                {centreName} in {location} is ready. We know WhatsApp can blow up and paper admin can drain the day.
                This welcome guide keeps setup simple so your team can focus on children.
              </p>
            </div>
          </div>

          <div className="mt-8 max-w-3xl space-y-5 text-center">
            <p
              className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-md"
              style={{ animation: 'welcomeFloat 4s ease-in-out infinite' }}
            >
              {'\u{1F3EB}'}
            </p>
            <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
              Parents are already asking for the app. Let us show you the practical steps so your centre feels calm, trusted, and ready from day one.
            </p>
            <Button
              type="button"
              className="h-12 rounded-2xl bg-teal-600 px-8 text-base font-black hover:bg-teal-500"
              onClick={() => {
                setStep(1)
                if (ecdId) {
                  void trackAnalyticsEvent({
                    ecdId,
                    actorRole: 'ecd_admin',
                    eventType: 'onboarding_step_completed',
                    path: '/ecd/welcome',
                    metadata: {
                      completed_step: 0,
                      next_step: 1,
                    },
                  })
                }
              }}
            >
              Start my welcome tour
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      ) : (
        <section className="mx-auto w-full max-w-5xl space-y-8 px-4 pb-10 pt-8">
          <Card className="border-white/70 bg-white/95 shadow-[0_25px_80px_rgba(15,23,42,0.14)]">
            <CardContent className="space-y-5 p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Your centre, your pace</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    What would you like to tackle first?
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">Tap any card for a clear, real-life walkthrough.</p>
                </div>
                {centreLogoUrl ? (
                  <div className="h-16 w-16 overflow-hidden rounded-full border-4 border-white shadow-lg">
                    <img src={centreLogoUrl} alt={`${centreName} logo`} className="h-full w-full object-cover" />
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {scenarios.map((scenario) => (
                  <ScenarioCard key={scenario.id} scenario={scenario} onOpen={handleScenarioOpen} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-cyan-100 bg-white shadow-lg">
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Your package right now</p>
                  <h3 className="mt-1 text-xl font-black text-slate-900">
                    {selectedPlanContent.label} plan
                    <span className="ml-2 rounded-full bg-cyan-100 px-2 py-1 text-[11px] font-bold uppercase text-cyan-800">
                      {selectedPlanStatus}
                    </span>
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{selectedPlanContent.shortPitch}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {selectedPlanContent.bullets.map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700">Where this is going</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {selectedPlanContent.yearlyVision} CentreConnect is designed so owners can run stronger centres,
                  support staff confidently, and grow without daily admin stress.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-teal-100 bg-teal-50/80 shadow-lg">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-700" />
                <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">Quick First Steps</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {tips.map((tip) => (
                  <div key={tip} className="rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm text-slate-700">
                    {tip}
                  </div>
                ))}
              </div>

              <div className="grid gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-4">
                <Button asChild className="h-11 rounded-2xl bg-teal-600 hover:bg-teal-500">
                  <Link
                    href="/ecd/dashboard"
                    onClick={() => {
                      setDashboardOpened(true)
                      trackCtaClick('open_dashboard', 'onboarding_completed')
                    }}
                  >
                    Open Dashboard
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-2xl border-slate-300 bg-white">
                  <Link
                    href="/ecd/website"
                    onClick={() => {
                      setWebsiteOpened(true)
                      trackCtaClick('website_setup')
                    }}
                  >
                    Website Setup
                  </Link>
                </Button>
                {posterHref ? (
                  <Button asChild variant="outline" className="h-11 rounded-2xl border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100">
                    <Link
                      href={posterHref}
                      onClick={() => {
                        setQrPosterOpened(true)
                        trackCtaClick('print_parent_qr_poster')
                      }}
                    >
                      <QrCode className="mr-2 h-4 w-4" />
                      Print Parent QR Poster
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled
                    variant="outline"
                    className="h-11 rounded-2xl border-slate-200 bg-slate-100 text-slate-400"
                  >
                    Upload profile to enable QR poster
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyCentreLink}
                  className={cn(
                    'h-11 rounded-2xl border-slate-300 bg-white',
                    copyStatus === 'done' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : ''
                  )}
                  disabled={!centrePublicPath}
                >
                  {copyStatus === 'done' ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copyStatus === 'done' ? 'Copied link' : 'Copy centre link'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/70 shadow-lg">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-emerald-700" />
                <p className="text-sm font-black text-emerald-900">A note from Mandlenkosi, founder of CentreConnect</p>
              </div>
              <p className="text-sm leading-relaxed text-emerald-900">
                Thank you for trusting us with your business. Every centre we onboard helps another family feel safer and better informed.
                Your growth is our growth, and we are committed to walking this journey with you, step by step.
              </p>
              <p className="text-sm font-semibold text-emerald-800">
                Need a hand now? Send us a WhatsApp and we will respond like a neighbour, not a call centre.
              </p>
              <Button asChild className="h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500">
                <Link
                  href="https://wa.me/27685356430?text=Hi%20CentreConnect%2C%20please%20help%20me%20finish%20onboarding."
                  onClick={() => trackCtaClick('whatsapp_support')}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp support
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      <ScenarioModal scenario={activeScenario} onClose={() => setActiveScenario(null)} />
    </div>
  )
}
