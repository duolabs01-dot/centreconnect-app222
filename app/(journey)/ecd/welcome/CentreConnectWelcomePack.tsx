'use client'

import Image from 'next/image'
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
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PremiumVerifiedBadge } from '@/components/ui/premium-verified-badge'
import {
  getPublicPlanDefinition,
  getPublicPlanLabel,
  normalizeSubscriptionStatus,
  toPublicPlan,
  type PublicPlan,
  type SubscriptionStatus,
} from '@/lib/billing/plans'
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
  is_registered: boolean | null
}

type MembershipRow = {
  ecd_centres: CentreMembership | CentreMembership[] | null
}

type SubscriptionRow = {
  tier: string | null
  status: string | null
}

const DEFAULT_CENTRE_HERO =
  'https://thumbs.dreamstime.com/b/young-african-preschool-kids-playing-playground-kindergarten-school-soweto-south-africa-july-180790376.jpg'

type Scenario = {
  id: string
  emoji: string
  title: string
  summary: string
  pain: string
  solution: string
  outcome: string
  steps: string[]
  ctaLabel: string
  ctaHref: string
  color: string
  bg: string
  border: string
}

type PackageCompareCard = {
  plan: PublicPlan
  subtitle: string
  promise: string
}
const SCENARIOS: Scenario[] = [
  {
    id: 'applications',
    emoji: '📋',
    title: 'Applications, but calm!',
    summary: 'No more scattered WhatsApps. Parents apply once, and your team replies from one clean list.',
    pain:
      'One parent sends a PDF. Another sends a voice note. Another asks the same question at 9pm. Important details disappear fast.',
    solution:
      'CentreConnect keeps every application in one clear queue, so your team can reply quickly, follow up properly, and stay organised.',
    outcome:
      'Parents feel your centre is professional. Your team saves time straight away.',
    steps: [
      'A parent finds your centre and applies online.',
      'You open one clean application card.',
      'You accept, waitlist, or reply from one place.',
      'The parent gets a clear next step immediately.',
    ],
    ctaLabel: 'Open applications',
    ctaHref: '/ecd/pipeline',
    color: 'rgb(15,118,110)',
    bg: 'rgb(240,253,250)',
    border: 'rgb(204,251,241)',
  },
  {
    id: 'children',
    emoji: '🧒',
    title: 'One child record. One calm place!',
    summary: 'Keep guardians, pickup adults, notes, and basics together. No more hunting through files.',
    pain:
      'A parent arrives early. A child feels sick. Someone new comes for pickup. Paper files turn small moments into stress.',
    solution:
      'CentreConnect gives each child one clear record, so staff can find the right details fast and stay calm.',
    outcome:
      'Your team feels more confident, and parents feel the difference.',
    steps: [
      'Add the child once from your paper register.',
      'Save guardians and emergency contacts.',
      'Add approved pickup adults.',
      'Use the same record every day.',
    ],
    ctaLabel: 'Open child records',
    ctaHref: '/ecd/children/new',
    color: 'rgb(109,40,217)',
    bg: 'rgb(245,243,255)',
    border: 'rgb(221,214,254)',
  },
  {
    id: 'attendance',
    emoji: '✅',
    title: 'Attendance in under a minute!',
    summary: 'Tap present. Tap absent. The day starts moving.',
    pain:
      'Morning register time pulls attention away from the children. Then month-end counting becomes another admin job.',
    solution:
      'CentreConnect keeps your daily register simple, live, and easy to return to later.',
    outcome:
      'You spend less time on admin and more time running the centre well.',
    steps: [
      'Open attendance in the morning.',
      'Tap each child as present or absent.',
      'Save a note only when needed.',
      'Come back later to a cleaner record.',
    ],
    ctaLabel: 'Open attendance',
    ctaHref: '/ecd/attendance',
    color: 'rgb(3,105,161)',
    bg: 'rgb(240,249,255)',
    border: 'rgb(186,230,253)',
  },
  {
    id: 'pickup',
    emoji: '🔐',
    title: 'Pickup that feels safe!',
    summary: 'When someone arrives at the gate, your team knows exactly what to check.',
    pain:
      'Gate time gets tense when an unknown adult arrives and staff must decide quickly under pressure.',
    solution:
      'CentreConnect helps you save approved pickup adults and verify collection with a secure code flow.',
    outcome:
      'Parents feel protected. Staff feel clear. The handoff feels more professional.',
    steps: [
      'Add approved pickup adults to the child record.',
      'Open the pickup tool when collection starts.',
      'Confirm identity with the secure code flow.',
      'Release only when the right person is approved.',
    ],
    ctaLabel: 'Open safe pickup',
    ctaHref: '/ecd/pickup',
    color: 'rgb(180,83,9)',
    bg: 'rgb(255,251,235)',
    border: 'rgb(253,230,138)',
  },
  {
    id: 'profile',
    emoji: '🌍',
    title: 'A profile parents can trust!',
    summary: 'Your centre looks real, clear, and ready. That matters before the first call.',
    pain:
      'Parents decide quickly. If your information looks old or incomplete, they move on or ask basic questions again.',
    solution:
      'CentreConnect brings your name, story, phone, location, logo, and hero image into one clean public profile.',
    outcome:
      'You get discovered more easily, and parents arrive already trusting you.',
    steps: [
      'Add your logo, hero image, phone, and address.',
      'Check your public centre page.',
      'Share the link on WhatsApp.',
      'Let parents arrive better informed.',
    ],
    ctaLabel: 'Open centre profile',
    ctaHref: '/ecd/website',
    color: 'rgb(15,118,110)',
    bg: 'rgb(240,253,244)',
    border: 'rgb(187,247,208)',
  },
]

const PACKAGE_COMPARE: PackageCompareCard[] = [
  {
    plan: 'starter',
    subtitle: 'Alone, and already strong',
    promise: 'Great for a centre that wants better applications, cleaner parent messages, and a more professional public profile.',
  },
  {
    plan: 'growth',
    subtitle: 'With Starter, plus daily ops',
    promise: 'Best when you want Starter benefits and a calmer daily rhythm for attendance, follow-up, and team consistency.',
  },
  {
    plan: 'pro',
    subtitle: 'With Starter + Growth, plus priority help',
    promise: 'Best when you want the full CentreConnect setup, stronger visibility, and faster hands-on support.',
  },
]

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

function toSubscriptionStatusLabel(status: SubscriptionStatus) {
  switch (status) {
    case 'active':
      return 'Active'
    case 'past_due':
      return 'Past due'
    case 'canceled':
      return 'Canceled'
    case 'suspended':
      return 'Suspended'
    case 'trial':
    default:
      return 'Trial'
  }
}

function buildWhatsappHref(firstName: string, centreName: string) {
  const text = `Hi Mandla, this is ${firstName} from ${centreName}. Please help me finish my CentreConnect setup.`
  return `https://wa.me/27685356430?text=${encodeURIComponent(text)}`
}
function ScenarioCard({ scenario, onOpen }: { scenario: Scenario; onOpen: (scenario: Scenario) => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => onOpen(scenario)}
      className="h-auto w-full rounded-[1.75rem] border p-0 text-left whitespace-normal transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl"
      style={{ backgroundColor: scenario.bg, borderColor: scenario.border }}
    >
      <div className="w-full space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/85 text-2xl shadow-sm">
                {scenario.emoji}
              </span>
              <Badge
                variant="outline"
                className="rounded-full border-white/80 bg-white/85 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-none"
              >
                Tap to open
              </Badge>
            </div>
            <h3 className="text-xl font-black leading-tight text-slate-900 sm:text-[1.35rem]">{scenario.title}</h3>
          </div>
        </div>
        <p className="text-sm font-medium leading-7 text-slate-700 sm:text-[15px]">{scenario.summary}</p>
      </div>
    </Button>
  )
}

function ScenarioModal({
  scenario,
  previewMode,
  passwordHelpHref,
  signInHref,
  onClose,
}: {
  scenario: Scenario
  previewMode: boolean
  passwordHelpHref: string
  signInHref: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-2xl overflow-hidden rounded-[2rem] border-none bg-white shadow-2xl">
        <CardHeader className="relative border-b border-slate-100 bg-slate-50/50 p-6 sm:p-8">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{scenario.emoji}</span>
                <CardTitle className="text-2xl font-black text-slate-900 sm:text-3xl">{scenario.title}</CardTitle>
              </div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{scenario.summary}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-slate-200"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="p-6 space-y-6 sm:p-8">
              <div className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-black text-red-600 uppercase tracking-widest">
                  <X className="h-4 w-4" /> The Struggle
                </h4>
                <p className="text-[15px] leading-7 text-slate-600 font-medium">{scenario.pain}</p>
              </div>
              <div className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-black text-teal-600 uppercase tracking-widest">
                  <ShieldCheck className="h-4 w-4" /> The Fix
                </h4>
                <p className="text-[15px] leading-7 text-slate-600 font-medium">{scenario.solution}</p>
              </div>
            </div>
            <div className="bg-slate-50/30 p-6 space-y-6 sm:p-8">
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">How it works</h4>
                <ul className="space-y-3">
                  {scenario.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-black text-slate-400 border border-slate-200">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-2">
                {previewMode ? (
                  <div className="space-y-3">
                    <Button asChild className="w-full rounded-2xl bg-teal-600 py-6 text-base font-black hover:bg-teal-700">
                      <Link href={signInHref}>Sign in to start</Link>
                    </Button>
                    <Link href={passwordHelpHref} className="block text-center text-xs font-bold text-slate-400 hover:text-slate-600">
                      Need help with your password?
                    </Link>
                  </div>
                ) : (
                  <Button asChild className="w-full rounded-2xl bg-teal-600 py-6 text-base font-black hover:bg-teal-700">
                    <Link href={scenario.ctaHref}>{scenario.ctaLabel}</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PackageComparisonSection({ selectedPlan }: { selectedPlan: PublicPlan }) {
  const comparisonRows = [
    {
      label: 'Core Purpose',
      values: [
        'A clean public profile and digital applications.',
        'Starter + better daily records for attendance and children.',
        'The full setup + priority support and visibility.',
      ],
    },
    {
      label: 'Centre Profile',
      values: [
        <div key="starter-profile" className="flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-teal-600" /> Professional
        </div>,
        <div key="growth-profile" className="flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-teal-600" /> Professional
        </div>,
        <div key="pro-profile" className="flex items-center gap-2">
          <PremiumVerifiedBadge /> Premium
        </div>,
      ],
    },
    {
      label: 'Applications',
      values: ['Unlimited', 'Unlimited', 'Unlimited'],
    },
    {
      label: 'Staff Logins',
      values: ['Up to 2', 'Up to 5', 'Unlimited'],
    },
    {
      label: 'Child Records',
      values: ['Up to 10', 'Unlimited', 'Unlimited'],
    },
    {
      label: 'Support',
      values: ['Standard', 'Standard', 'Priority WhatsApp'],
    },
  ]

  return (
    <Card className="overflow-hidden rounded-[2rem] border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
            <Sparkles className="h-5 w-5 text-teal-600" />
          </div>
          <CardTitle className="text-xl font-black text-slate-900 sm:text-2xl">Compare the plans</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 sm:p-8">
        <div className="mb-8 overflow-x-auto rounded-[1.5rem] border border-slate-100">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/30 hover:bg-slate-50/30">
                <TableHead className="w-[200px] px-4 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Feature</TableHead>
                {PACKAGE_COMPARE.map((tier) => (
                  <TableHead key={tier.plan} className="px-4 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">{getPublicPlanLabel(tier.plan)}</span>
                        {tier.plan === selectedPlan ? (
                          <Badge className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-none">
                            Active
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{tier.subtitle}</p>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonRows.map((row: { label: string; values: React.ReactNode[] }) => (
                <TableRow key={row.label} className="align-top hover:bg-white">
                  <TableCell className="px-4 py-4 font-black text-slate-900">{row.label}</TableCell>
                  {row.values.map((value: React.ReactNode, index: number) => (
                    <TableCell key={`${row.label}-${PACKAGE_COMPARE[index]?.plan}`} className="px-4 py-4 text-sm leading-6 text-slate-700">
                      {value}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">How the plans grow</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            Starter stands strong on its own. Growth adds calmer daily operations. Pro brings the full CentreConnect setup and faster hands-on help when you want everything working together.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
function ListingPreviewSection({
  slug,
  name,
  suburb,
  city,
  description,
  logoUrl,
  coverImageUrl,
  isRegistered,
}: {
  slug: string
  name: string
  suburb: string
  city: string
  description: string
  logoUrl: string | null
  coverImageUrl: string | null
  isRegistered: boolean
}) {
  const publicUrl = `https://centerconnect.co.za/ecd/${slug}`

  return (
    <Card className="overflow-hidden rounded-[2rem] border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
              <Globe className="h-5 w-5 text-teal-600" />
            </div>
            <CardTitle className="text-xl font-black text-slate-900 sm:text-2xl">Your Public Profile</CardTitle>
          </div>
          <Button asChild variant="outline" className="rounded-full border-slate-200 bg-white font-bold hover:bg-slate-50">
            <Link href="/ecd/website">Edit profile</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-6 sm:p-8">
          <div className="mb-6 overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-sm">
            <div className="relative h-32 w-full bg-slate-200 sm:h-40">
              <Image src={coverImageUrl || DEFAULT_CENTRE_HERO} alt="Cover" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute -bottom-6 left-6">
                <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-md">
                  {logoUrl ? <Image src={logoUrl} alt="Logo" fill className="object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-teal-50 text-2xl font-black text-teal-600">{name.charAt(0)}</div>}
                </div>
              </div>
            </div>
            <div className="p-6 pt-10 sm:p-8 sm:pt-10">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">{name}</h3>
                    {isRegistered && <BadgeCheck className="h-5 w-5 text-teal-600" />}
                  </div>
                  <p className="text-sm font-bold text-slate-500">{toLocation(suburb, city)}</p>
                </div>
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">{description || 'No description added yet.'}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="flex-1 rounded-2xl bg-slate-900 py-6 text-sm font-black hover:bg-slate-800">
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> View live page
              </a>
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-2xl border-slate-200 py-6 text-sm font-black hover:bg-slate-50"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl)
                toast.success('Link copied to clipboard')
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy share link
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function CentreConnectWelcomePack() {
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [centre, setCentre] = useState<CentreMembership | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)

  const previewMode = searchParams.get('preview') === 'true'
  const passwordHelpHref = '/forgot-password'
  const signInHref = '/login'

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const [profileRes, membershipRes, subRes] = await Promise.all([
          supabase.from('user_profiles').select('first_name,full_name,first_password_set_at').eq('id', user.id).maybeSingle(),
          supabase.from('ecd_memberships').select('ecd_centres(id,slug,name,suburb,city,logo_url,cover_image_url,description,phone,address,is_registered)').eq('user_id', user.id).maybeSingle(),
          supabase.from('ecd_subscriptions').select('tier,status').eq('user_id', user.id).maybeSingle(),
        ])

        setProfile(profileRes.data as ProfileRow)
        setCentre(extractCentre((membershipRes.data as MembershipRow)?.ecd_centres))
        setSubscription(subRes.data as SubscriptionRow)
      } catch (error) {
        console.error('Error loading welcome pack data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const firstName = useMemo(() => {
    if (profile?.first_name) return profile.first_name
    if (profile?.full_name) return profile.full_name.split(' ')[0]
    return 'Principal'
  }, [profile])

  const plan = useMemo(() => toPublicPlan(subscription?.tier), [subscription])
  const status = useMemo(() => normalizeSubscriptionStatus(subscription?.status), [subscription])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-12 px-4 py-8 sm:px-6 sm:py-12">
      <header className="space-y-4 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 shadow-sm">
          <Sparkles className="h-6 w-6 text-teal-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">Welcome to CentreConnect, {firstName}!</h1>
          <p className="mx-auto max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
            Everything you need to run your centre with confidence. From applications to daily attendance, we&apos;ve got you covered.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-[2rem] border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Your Plan</p>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl font-black text-slate-900">{getPublicPlanLabel(plan)}</CardTitle>
              {plan === 'pro' && <PremiumVerifiedBadge />}
            </div>
            <p className="text-sm font-bold text-teal-600">{toSubscriptionStatusLabel(status)}</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Support</p>
          </CardHeader>
          <CardContent className="space-y-1">
            <CardTitle className="text-2xl font-black text-slate-900">Mandla</CardTitle>
            <p className="text-sm font-bold text-slate-500">Your Setup Assistant</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-200 shadow-sm sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Quick Action</p>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full rounded-2xl bg-slate-900 py-6 text-sm font-black hover:bg-slate-800">
              <a href={buildWhatsappHref(firstName, centre?.name || 'my centre')} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Message Mandla
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100">
            <BookOpen className="h-5 w-5 text-teal-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">How to use CentreConnect</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} onOpen={setActiveScenario} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <PackageComparisonSection selectedPlan={plan} />
        {centre && (
          <ListingPreviewSection
            slug={centre.slug || ''}
            name={centre.name || ''}
            suburb={centre.suburb || ''}
            city={centre.city || ''}
            description={centre.description || ''}
            logoUrl={centre.logo_url}
            coverImageUrl={centre.cover_image_url}
            isRegistered={!!centre.is_registered}
          />
        )}
      </div>

      <footer className="rounded-[2.5rem] bg-slate-900 p-8 text-center text-white sm:p-12">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <ShieldCheck className="h-6 w-6 text-teal-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black sm:text-3xl">Ready to grow your centre?</h2>
            <p className="text-slate-400 font-medium">
              We&apos;re here to help you every step of the way. If you have any questions or need a hand getting set up, just reach out.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-center">
            <Button asChild className="w-full rounded-2xl bg-teal-600 px-8 py-6 text-base font-black hover:bg-teal-700 sm:w-auto">
              <Link href="/ecd/pipeline">Go to Dashboard</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full rounded-2xl px-8 py-6 text-base font-black text-white hover:bg-white/10 sm:w-auto">
              <a href={buildWhatsappHref(firstName, centre?.name || 'my centre')} target="_blank" rel="noopener noreferrer">
                Contact Support
              </a>
            </Button>
          </div>
        </div>
      </footer>

      {activeScenario && (
        <ScenarioModal
          scenario={activeScenario}
          previewMode={previewMode}
          passwordHelpHref={passwordHelpHref}
          signInHref={signInHref}
          onClose={() => setActiveScenario(null)}
        />
      )}
    </div>
  )
}
