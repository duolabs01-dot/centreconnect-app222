'use client'

import Link from 'next/link'
import Image from 'next/image'
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
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CentreCard } from '@/components/parent/CentreCard'
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
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1600&auto=format&fit=crop'
const FOUNDER_PHOTO = '/founder-mandlenkosi.jpeg'

const scenarios: Scenario[] = [
  {
    id: 'referral',
    emoji: '\u{1F4B8}',
    color: '#16A34A',
    bg: '#F0FDF4',
    accent: '#BBF7D0',
    title: 'Refer & Earn R100',
    pain:
      'You know other Creche Owners who are struggling with paper books and WhatsApp chaos.',
    solution:
      'Share CentreConnect with a friend. If they join, you get R100 credit and they get their 1st month fee completely free.',
    steps: [
      'Copy your unique invite link.',
      'Send it to another ECD Owner on WhatsApp.',
      'They register their centre for the pilot.',
      'We credit R100 to your account.',
      'They enjoy their first month fee free.',
    ],
    ctaLabel: 'Share My Invite Link',
    ctaHref: '/ecd/profile',
    quote: 'I helped my friend get organized and saved money on my own bill!',
    quoteAuthor: 'Mama Gladys, Alexandra',
  },
  {
    id: 'attendance',
    emoji: '\u{2705}',
    color: '#0369A1',
    bg: '#F0F9FF',
    accent: '#BAE6FD',
    title: 'DSD-Ready Attendance Register',
    pain:
      'Paper roll calls and month-end counting take too long and inspectors are strict about accuracy.',
    solution:
      'Mark the register in 30 seconds. The system auto-calculates totals and generates a DSD-compliant printout.',
    steps: [
      'Open your Digital Register each morning.',
      'Tap status: Present, Absent, or Sick.',
      'Totals are auto-counted instantly.',
      'Export a professional DSD PDF at month-end.',
      'Print, sign, and hand to inspectors.',
    ],
    ctaLabel: 'Open Digital Register',
    ctaHref: '/ecd/attendance',
    quote: 'Month-end used to take a whole weekend. Now it is ready in one tap.',
    quoteAuthor: 'Mama Precious, Tembisa',
  },
  {
    id: 'pickup',
    emoji: '\u{1F510}',
    color: '#B45309',
    bg: '#FFFBEB',
    accent: '#FDE68A',
    title: 'Gate Security & Safe Pickup',
    pain:
      'Unknown people arriving at the gate creates stress. You need a fast, safe way to verify guardians.',
    solution:
      'Use Secure QR codes. Only authorized people can scan in, keeping your staff calm and children safe.',
    steps: [
      'Add approved guardians to child profiles.',
      'Print your unique gate QR poster.',
      'Guardian presents their secure code.',
      'System confirms identity in 1 second.',
      'Automated logs keep a record of every pickup.',
    ],
    ctaLabel: 'Setup Gate Security',
    ctaHref: '/ecd/pickup',
    quote: 'We no longer argue at the gate. The system says who is allowed.',
    quoteAuthor: 'Mama Lindiwe, Katlehong',
  },
  {
    id: 'applications',
    emoji: '\u{1F4CB}',
    color: '#0D9488',
    bg: '#F0FDFA',
    accent: '#CCFBF1',
    title: 'Digital Admissions Office',
    pain:
      'Parents sending photos of IDs on WhatsApp makes a mess. Documents get lost in the chat.',
    solution:
      'Review complete applications in one place. Accept or waitlist with one tap, and we notify the parent.',
    steps: [
      'Share your link with interested parents.',
      'They upload all documents digitally.',
      'Review the full profile on your screen.',
      'Accept or Decline with one tap.',
      'Parent is updated automatically by SMS/Email.',
    ],
    ctaLabel: 'Open Admissions Board',
    ctaHref: '/ecd/pipeline',
    quote: 'No more chasing ID copies. Everything is neat and organized.',
    quoteAuthor: 'Mama Thandi, Soweto',
  },
  {
    id: 'children',
    emoji: '\u{1F9D2}',
    color: '#7C3AED',
    bg: '#FAF5FF',
    accent: '#EDE9FE',
    title: 'Secure Digital Record Vault',
    pain:
      'Finding medical notes or emergency numbers in a folder during a crisis is too slow.',
    solution:
      'Every child has a digital profile with health notes and contacts, searchable in 2 seconds.',
    steps: [
      'Add child details and medical aid info.',
      'Upload birth certificates once.',
      'Search child records by name or age.',
      'Access emergency contacts instantly.',
      'Staff can view records without seeing fees.',
    ],
    ctaLabel: 'Open Digital Records',
    ctaHref: '/ecd/children/new',
    quote: 'When a child got sick, I had their mum on the phone in seconds.',
    quoteAuthor: 'Auntie Rose, Alexandra',
  },
]

type PublicPlan = 'starter' | 'advanced' | 'platinum'

const PLAN_CONTENT: Record<PublicPlan, { label: string; price: string; desc: string }> = {
  starter: { label: 'Starter', price: 'R199', desc: 'Admissions and profile basics.' },
  advanced: { label: 'Advanced', price: 'R299', desc: 'Daily operations & DSD tools.' },
  platinum: { label: 'Platinum', price: 'R499', desc: 'Custom website & growth tools.' },
}

function toSafeText(value: string | null | undefined, fallback: string) {
  const next = (value ?? '').trim()
  return next.length > 0 ? next : fallback
}

function toLocation(suburb: string | null | undefined, city: string | null | undefined) {
  const parts = [suburb, city].map((part) => (part ?? '').trim()).filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'your area'
}

function ScenarioCard({
  scenario,
  onOpen,
}: {
  scenario: Scenario
  onOpen: (scenario: Scenario) => void
}) {
  const isHighValue = ['attendance', 'pickup', 'referral'].includes(scenario.id)
  
  return (
    <Button
      type="button"
      onClick={() => onOpen(scenario)}
      variant="outline"
      className={cn(
        "group !flex !min-h-[200px] !w-full !flex-col !items-start !justify-start !gap-3 rounded-[2rem] border-2 p-6 text-left !whitespace-normal transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]",
        isHighValue ? "shadow-lg" : "shadow-sm"
      )}
      style={{
        background: scenario.bg,
        borderColor: scenario.accent,
      }}
    >
      <div className="flex w-full items-start justify-between">
        <div className="text-3xl leading-none">{scenario.emoji}</div>
        {isHighValue && (
          <span className="rounded-full bg-white/80 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-sm border border-slate-100">
            {scenario.id === 'attendance' ? 'DSD COMPLIANT' : scenario.id === 'pickup' ? 'GATE SECURITY' : 'EARN R100'}
          </span>
        ) }
      </div>
      <h3 className="text-lg font-black leading-tight tracking-tight text-slate-900" style={{ color: scenario.color }}>
        {scenario.title}
      </h3>
      <div className="mt-auto pt-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600">
        Tap for walkthrough
        <ArrowRight className="h-3 w-3" />
      </div>
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
  const [selectedPlan, setSelectedPlan] = useState<PublicPlan>('advanced')
  const [selectedPlanStatus, setSelectedPlanStatus] = useState<string>('Pilot Member')

  const firstName = useMemo(() => {
    const clean = contactName.trim()
    if (!clean) return 'Friend'
    return clean.split(' ')[0] || clean
  }, [contactName])

  const centrePublicPath = centreSlug ? `/centre/${centreSlug}` : ''
  const posterHref = centreSlug ? `/centre/${centreSlug}/poster` : ''

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const params = new URLSearchParams(window.location.search)
      const queryName = toSafeText(params.get('name'), 'Friend')
      const queryCentre = toSafeText(params.get('centre'), 'your centre')
      const querySlug = toSafeText(params.get('slug'), '')

      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return

      if (session?.user?.id) {
        const { data: centre } = await supabase
          .from('ecd_centres')
          .select('id,slug,name,logo_url,cover_image_url,suburb,city')
          .eq('owner_id', session.user.id)
          .maybeSingle()

        if (mounted && centre) {
          setEcdId(centre.id)
          setCentreSlug(centre.slug)
          setCentreName(centre.name)
          setCentreLogoUrl(centre.logo_url)
          if (centre.cover_image_url) setCoverImageUrl(centre.cover_image_url)
          setLocation(toLocation(centre.suburb, centre.city))
        }
      } else {
        setContactName(queryName)
        setCentreName(queryCentre)
        setCentreSlug(querySlug)
      }
    }
    void load()
    return () => { mounted = false }
  }, [supabase])

  const handleScenarioOpen = (scenario: Scenario) => {
    setActiveScenario(scenario)
    if (!ecdId) return
    void trackAnalyticsEvent({
      ecdId,
      actorRole: 'ecd_admin',
      eventType: 'welcome_pack_scenario_opened',
      path: '/ecd/welcome',
      metadata: { scenario_id: scenario.id },
    })
  }

  const trackCtaClick = (label: string) => {
    if (!ecdId) return
    void trackAnalyticsEvent({
      ecdId,
      actorRole: 'ecd_admin',
      eventType: 'welcome_pack_cta_clicked',
      path: '/ecd/welcome',
      metadata: { cta: label },
    })
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#f8fafc_44%,#eef2ff_100%)] pb-20">
      {step === 0 ? (
        <section className="mx-auto flex min-h-[90vh] w-full max-w-5xl flex-col items-center justify-center px-4 pb-8 pt-10">
          <div className="relative w-full overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <Image
              src={coverImageUrl}
              alt="Johannesburg creche children playing happily in a bright, modern learning environment"
              width={1600}
              height={640}
              className="h-72 w-full object-cover sm:h-80"
              sizes="(max-width: 768px) 100vw, 1024px"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-slate-900/5" />

            <div className="absolute left-6 top-6 rounded-xl border border-white/40 bg-white/95 px-3 py-2 shadow-sm">
              <Image src="/centreconnect-logo.svg" alt="CentreConnect" width={128} height={32} className="h-8 w-auto" />
            </div>

            <div className="absolute right-6 top-6 h-16 w-16 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-xl">
              {centreLogoUrl ? (
                <Image src={centreLogoUrl} alt={centreName} width={64} height={64} className="h-full w-full object-cover unoptimized" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-black text-slate-700 bg-cyan-50">
                  {centreName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100 drop-shadow-sm">Welcome Guide</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Sawubona, {firstName}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cyan-50 drop-shadow-sm sm:text-base">
                {centreName} is ready. We built this for ECD Owners like you who do the hard work every day. 
                This guide shows you exactly how to save time and run your centre from your phone.
              </p>
            </div>
          </div>

          <div className="mt-8 max-w-3xl space-y-5 text-center">
            <p className="text-sm leading-relaxed text-slate-700 sm:text-base font-medium">
              Parents are already searching for creches in {location}. Let us show you how to get noticed and stay organized.
            </p>
            <Button size="lg" className="h-14 rounded-2xl bg-teal-600 px-10 text-lg font-black hover:bg-teal-500 shadow-xl shadow-teal-900/20 active:scale-95" onClick={() => setStep(1)}>
              Start My Welcome Tour →
            </Button>
          </div>
        </section>
      ) : (
        <section className="mx-auto w-full max-w-5xl space-y-8 px-4 pb-10 pt-8">
          <Card className="border-white/70 bg-white/95 shadow-xl rounded-[2.5rem]">
            <CardContent className="space-y-6 p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-700">ECD Owner Path</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">What would you like to tackle first?</h2>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {scenarios.map((scenario) => (
                  <ScenarioCard key={scenario.id} scenario={scenario} onOpen={handleScenarioOpen} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pricing Card with Overhaul */}
          <Card className="overflow-hidden border-teal-100 bg-gradient-to-br from-teal-50/50 via-white to-cyan-50/50 shadow-xl rounded-[2.5rem]">
            <CardContent className="space-y-8 p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-100/50 pb-8">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-teal-900/20">
                    <Sparkles className="h-3 w-3" />
                    Pilot Founding Member
                  </div>
                  <h3 className="text-3xl font-black tracking-tight text-slate-900 pt-2">Premium features, R0 Pilot Fee.</h3>
                  <p className="text-sm font-medium text-slate-500">You are on the **Advanced Package** for the next 4 weeks.</p>
                </div>
                <div className="rounded-2xl bg-white p-5 text-center shadow-xl border border-teal-100 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md">Limited Time</div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pilot Month Fee</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <p className="text-4xl font-black text-teal-700">R0</p>
                    <p className="text-lg font-bold text-slate-300 line-through">R299</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] bg-slate-900/5 p-1 border border-slate-900/5 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-6 py-4">Package Comparison</th>
                      <th className="px-4 py-4 text-center">Starter</th>
                      <th className="px-4 py-4 text-center text-teal-700 bg-white/50 rounded-t-2xl">Advanced</th>
                      <th className="px-4 py-4 text-center">Platinum</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold text-slate-700">
                    {[
                      { label: 'Public Profile', s: true, a: true, p: true },
                      { label: 'Admissions Board', s: true, a: true, p: true },
                      { label: 'DSD Attendance', s: false, a: true, p: true },
                      { label: 'QR Gate Security', s: false, a: true, p: true },
                      { label: 'Learner Reports', s: false, a: true, p: true },
                      { label: 'WhatsApp Support', s: false, a: true, p: true },
                      { label: 'Custom Website', s: false, a: false, p: true },
                    ].map((row, i) => (
                      <tr key={row.label} className={cn(i !== 6 && "border-b border-slate-900/5")}>
                        <td className="px-6 py-3 text-slate-900">{row.label}</td>
                        <td className="px-4 py-3 text-center">{row.s ? <CheckCircle2 className="h-4 w-4 mx-auto text-slate-300" /> : <X className="h-4 w-4 mx-auto text-slate-200" />}</td>
                        <td className="px-4 py-3 text-center bg-white/50">{row.a ? <CheckCircle2 className="h-4 w-4 mx-auto text-teal-600" /> : <X className="h-4 w-4 mx-auto text-slate-200" />}</td>
                        <td className="px-4 py-3 text-center">{row.p ? <CheckCircle2 className="h-4 w-4 mx-auto text-slate-300" /> : <X className="h-4 w-4 mx-auto text-slate-200" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl border border-teal-100 bg-teal-600/5 p-5">
                <p className="text-sm font-bold text-teal-900">
                  Founding Member Bonus: <span className="font-medium text-teal-800">Your first month fee is waived. After the pilot, you keep this Advanced Package at just R299 per month fee (locked in forever as a pilot centre).</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Public Preview Pass - The Pride Hook */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-xl rounded-[2.5rem]">
            <CardHeader className="p-8 pb-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Your Identity</p>
              <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">How parents see your creche</CardTitle>
              <p className="text-sm font-medium text-slate-500">This is exactly how your card looks in our directory right now.</p>
            </CardHeader>
            <CardContent className="p-8">
              <div className="mx-auto max-w-sm">
                <CentreCard
                  id={ecdId || 'preview'}
                  slug={centreSlug}
                  name={centreName}
                  logo_url={centreLogoUrl || undefined}
                  cover_image_url={coverImageUrl}
                  address={location}
                  age_groups={['3m - 6y old']}
                  tagline={toSafeText(centreName, 'Trusted local creche')}
                  is_claimed={true}
                  rating={4.8}
                />
              </div>
              
              <div className="mt-10 rounded-[2rem] bg-emerald-50 p-8 border-2 border-emerald-100 text-center">
                <h4 className="text-xl font-black text-emerald-900 mb-2">Ready to show the world?</h4>
                <p className="text-sm font-medium text-emerald-700 mb-6 max-w-md mx-auto">
                  Click the button below to activation your profile. This will index your centre in our public search so parents in {location} can find you instantly.
                </p>
                <Button 
                  className="h-16 px-10 rounded-2xl bg-emerald-600 font-black text-lg shadow-xl shadow-emerald-900/20 hover:bg-emerald-500 active:scale-95 transition-all"
                  onClick={() => {
                    trackCtaClick('launch_centre_profile')
                    toast.success('🚀 Activation Done! Your centre is now live in the directory.')
                  }}
                >
                  🚀 Launch My Profile & Go Live
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/70 shadow-lg rounded-[2.5rem]">
            <CardContent className="space-y-4 p-8">
              <div className="flex items-center gap-4">
                <Image src={FOUNDER_PHOTO} alt="Mandlenkosi Ngwenya" width={64} height={64} className="h-16 w-16 rounded-full border-2 border-white object-cover shadow-md" />
                <div>
                  <p className="text-base font-black text-emerald-900 leading-tight">A note from Mandlenkosi</p>
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest mt-1">Founder, CentreConnect</p>
                </div>
              </div>
              <p className="text-base leading-relaxed text-emerald-900 font-medium">
                Thank you for trusting us with your centre. I am here to personally help you move from paper to digital. 
                If you get stuck or just want a hand setting things up, WhatsApp me directly.
              </p>
              <Button asChild className="h-12 rounded-2xl bg-[#25D366] text-white font-black hover:bg-green-600 shadow-lg shadow-green-900/20 transition-all">
                <Link href="https://wa.me/27685356430?text=Hi%20Mandla%2C%20I%20need%20help%20setting%20up%20my%20creche.">
                  <MessageCircle className="mr-2 h-5 w-5 fill-current" />
                  WhatsApp Mandla Now
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
