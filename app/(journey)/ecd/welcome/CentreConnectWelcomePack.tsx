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
  scenario: Scenario | null
  previewMode: boolean
  passwordHelpHref: string
  signInHref: string
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
    <div className="fixed inset-0 z-[100] bg-slate-950/70 p-4 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div
        className="mx-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={scenario.title}
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-5 pt-6 text-white" style={{ backgroundColor: scenario.color }}>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/75">Real-life scenario</p>
            <h3 className="mt-2 text-2xl font-black leading-tight">{scenario.title}</h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/15 text-white hover:bg-white/25 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">What feels messy now 😓</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{scenario.pain}</p>
          </div>

          <div className="rounded-[1.4rem] border p-4" style={{ backgroundColor: scenario.bg, borderColor: scenario.border }}>
            <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: scenario.color }}>
              What changes with CentreConnect ✅
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{scenario.solution}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">How it works 👇</p>
            {scenario.steps.map((step, index) => (
              <div key={step} className="flex gap-3">
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                  style={{ backgroundColor: scenario.color }}
                >
                  {index + 1}
                </span>
                <p className="pt-0.5 text-sm leading-6 text-slate-700">{step}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">What people notice next ✨</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{scenario.outcome}</p>
          </div>

          {previewMode ? (
            <div className="space-y-3">
              <div className="rounded-[1.25rem] border border-teal-100 bg-teal-50 p-4 text-sm leading-7 text-slate-700">
                Create your password first! Then this opens as a real tool inside your CentreConnect workspace.
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-11 rounded-2xl bg-slate-950 text-sm font-black text-white hover:bg-slate-900">
                  <Link href={passwordHelpHref}>Create or reset password</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-2xl border-slate-200 text-sm font-black">
                  <Link href={signInHref}>Sign in</Link>
                </Button>
              </div>
            </div>
          ) : (
            <Button asChild className="h-11 w-full rounded-2xl text-sm font-black" style={{ backgroundColor: scenario.color }}>
              <Link href={scenario.ctaHref}>{scenario.ctaLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function PackageSection({
  selectedPlan,
  selectedPlanStatus,
}: {
  selectedPlan: PublicPlan
  selectedPlanStatus: SubscriptionStatus
}) {
  const selectedPlanDefinition = getPublicPlanDefinition(selectedPlan)
  const comparisonRows = [
    {
      label: 'Best for',
      values: PACKAGE_COMPARE.map((tier) => tier.promise),
    },
    {
      label: 'Main tools',
      values: PACKAGE_COMPARE.map((tier) => getPublicPlanDefinition(tier.plan).includes.slice(0, 2).join(' • ')),
    },
    {
      label: 'What it feels like',
      values: PACKAGE_COMPARE.map((tier) => getPublicPlanDefinition(tier.plan).outcomes[0] ?? ''),
    },
  ]

  return (
    <Card className="rounded-[1.75rem] border-slate-200 bg-white shadow-none">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Packages, made simple!</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              Your centre is on {getPublicPlanLabel(selectedPlan)} right now.
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{selectedPlanDefinition.description}</p>
          </div>
          <Badge className="rounded-full bg-teal-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-teal-700 shadow-none">
            {toSubscriptionStatusLabel(selectedPlanStatus)}
          </Badge>
        </div>

        <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50/80 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">What this gives you right now ✨</p>
          <div className="mt-3 space-y-2">
            {selectedPlanDefinition.outcomes.map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:hidden">
          {PACKAGE_COMPARE.map((tier) => {
            const definition = getPublicPlanDefinition(tier.plan)
            const activeTier = tier.plan === selectedPlan

            return (
              <div
                key={tier.plan}
                className={cn(
                  'rounded-[1.5rem] border p-4',
                  activeTier ? 'border-teal-300 bg-teal-50 shadow-[0_10px_30px_rgba(20,184,166,0.14)]' : 'border-slate-200 bg-slate-50'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-slate-900">{getPublicPlanLabel(tier.plan)}</p>
                    <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{tier.subtitle}</p>
                  </div>
                  {activeTier ? (
                    <Badge className="rounded-full bg-teal-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-none">
                      Active now
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{tier.promise}</p>
                <div className="mt-4 space-y-2">
                  {definition.includes.slice(0, 2).map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="hidden overflow-hidden rounded-[1.5rem] border border-slate-200 md:block">
          <Table className="text-sm">
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-slate-50">
                <TableHead className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Compare</TableHead>
                {PACKAGE_COMPARE.map((tier) => (
                  <TableHead key={tier.plan} className="px-4 py-3 align-top">
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
              {comparisonRows.map((row) => (
                <TableRow key={row.label} className="align-top hover:bg-white">
                  <TableCell className="px-4 py-4 font-black text-slate-900">{row.label}</TableCell>
                  {row.values.map((value, index) => (
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
  centreName,
  location,
  logoUrl,
  coverImageUrl,
  description,
  hasLogo,
  hasCoverImage,
  planLabel,
  isRegistered,
  previewMode = false,
  actionHref = '/ecd/website#brand-media',
}: {
  centreName: string
  location: string
  logoUrl: string | null
  coverImageUrl: string | null
  description: string
  hasLogo: boolean
  hasCoverImage: boolean
  planLabel: string
  isRegistered: boolean
  previewMode?: boolean
  actionHref?: string
}) {
  const heroImage = coverImageUrl?.trim() || DEFAULT_CENTRE_HERO
  const summary = description.trim() || 'Parents will first see your hero image, logo, and centre details here.'

  return (
    <Card id="listing-preview" className="rounded-[1.75rem] border-slate-200 bg-white shadow-none">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">How parents see your centre ✨</p>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            This is the first impression families get.
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-600">
            Your logo, hero image, and verification all help a parent trust your centre before they even call.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.95fr] lg:items-start">
          <div className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div className="relative h-56 overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${heroImage}")` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                <Badge className="rounded-full bg-slate-950/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-none">
                  Parent listing
                </Badge>
                {!hasCoverImage ? (
                  <Badge className="rounded-full border-amber-200 bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 shadow-none">
                    Hero image missing
                  </Badge>
                ) : null}
              </div>

              {logoUrl ? (
                <div className="absolute -bottom-6 left-6 z-10 h-16 w-16 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-2xl">
                  <Image
                    src={logoUrl}
                    alt={`${centreName} logo`}
                    fill
                    sizes="64px"
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="absolute -bottom-6 left-6 z-10 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-teal-50 shadow-2xl">
                  <span className="text-xl font-black text-teal-700">{centreName.charAt(0)}</span>
                </div>
              )}
            </div>

            <div className="space-y-4 p-5 pt-10">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-black tracking-tight text-slate-900">{centreName}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{location}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {isRegistered ? (
                      <PremiumVerifiedBadge compact label="Verified ECD" />
                    ) : (
                      <Badge className="rounded-full border-amber-200 bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-800 shadow-none">
                        Verification in progress
                      </Badge>
                    )}
                    <Badge className="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-teal-700 shadow-none">
                      {planLabel}
                    </Badge>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{summary}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 shadow-none">Public profile</Badge>
                <Badge variant="secondary" className="bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 shadow-none">Premium trust badge</Badge>
                <Badge variant="secondary" className="bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 shadow-none">Apply flow</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-700">
                  View centre
                </div>
                <div className="rounded-2xl bg-teal-600 px-4 py-3 text-center text-sm font-black text-white">
                  Enrol now
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Logo</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {hasLogo
                  ? 'Your logo is ready! Parents will recognise your centre much faster in the directory.'
                  : 'Upload a logo so your centre feels familiar, trustworthy, and easy to remember.'}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Hero image</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {hasCoverImage
                  ? 'Your hero image is ready! It becomes the main cover photo parents notice first.'
                  : 'Add a strong hero image so your centre feels warm, alive, and welcoming right away.'}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-amber-100 bg-amber-50/80 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">Verification badge</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {isRegistered
                  ? 'Your gold verification badge is live. It gives parents extra confidence that this centre has been checked before they apply.'
                  : 'Once verification is complete, your premium badge shows here and makes your listing feel stronger to parents immediately.'}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-teal-100 bg-teal-50/70 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-teal-700">Best next move!</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {previewMode
                  ? 'Create your password or sign in first. Then you can upload your logo and hero image so parents see a stronger first impression immediately.'
                  : 'Update your logo and hero image first. That one change makes your centre look more trusted and more premium immediately.'}
              </p>
              <Button asChild className="mt-4 h-11 rounded-2xl bg-teal-600 text-sm font-black hover:bg-teal-700">
                <Link href={actionHref}>
                  {previewMode ? 'Open workspace first' : 'Update brand media'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
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
      packagePlan: toPublicPlan(searchParams.get('package'), 'growth'),
      inviteEmail: toSafeText(searchParams.get('email'), ''),
    }),
    [searchParams]
  )

  const [contactName, setContactName] = useState(queryDefaults.contactName)
  const [centreName, setCentreName] = useState(queryDefaults.centreName)
  const [location, setLocation] = useState(queryDefaults.location)
  const [centreSlug, setCentreSlug] = useState(queryDefaults.centreSlug)
  const [selectedPlan, setSelectedPlan] = useState<PublicPlan>(queryDefaults.packagePlan)
  const [selectedPlanStatus, setSelectedPlanStatus] = useState<SubscriptionStatus>('trial')
  const [centreLogoUrl, setCentreLogoUrl] = useState<string | null>(null)
  const [centreCoverImageUrl, setCentreCoverImageUrl] = useState<string | null>(null)
  const [centreDescription, setCentreDescription] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)

  const inviteEmail = queryDefaults.inviteEmail
  const cameFromPasswordSetup = searchParams.get('from') === 'password-setup'
  const passwordHelpHref = inviteEmail ? `/forgot-password?email=${encodeURIComponent(inviteEmail)}` : '/forgot-password'
  const signInHref = `/ecd/login?next=${encodeURIComponent(safeNextPath)}`

  const [childrenCount, setChildrenCount] = useState(0)
  const [attendanceCount, setAttendanceCount] = useState(0)
  const [pickupCount, setPickupCount] = useState(0)
  const [hasLogo, setHasLogo] = useState(false)
  const [hasCoverImage, setHasCoverImage] = useState(false)
  const [hasDescription, setHasDescription] = useState(false)
  const [hasPhone, setHasPhone] = useState(false)
  const [hasAddress, setHasAddress] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'done'>('idle')
  const [guideUnlocked, setGuideUnlocked] = useState(cameFromPasswordSetup)
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)

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
  const listingPreviewDescription = centreDescription.trim() || 'Parents will first see your hero image, logo, and centre details here.'

  useEffect(() => {
    let mounted = true

    async function loadWelcomeContext() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      if (!session?.user?.id) {
        setSelectedPlan(queryDefaults.packagePlan)
        setSelectedPlanStatus('trial')
        setCentreLogoUrl(null)
        setCentreCoverImageUrl(null)
        setCentreDescription('')
        setIsRegistered(false)
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
          .select('ecd_centres:ecd_id(id,slug,name,suburb,city,logo_url,cover_image_url,description,phone,address,is_registered)')
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
        setCentreLogoUrl(centre.logo_url?.trim() || null)
        setCentreCoverImageUrl(centre.cover_image_url?.trim() || null)
        setCentreDescription(centre.description?.trim() || '')
        setIsRegistered(Boolean(centre.is_registered))
        setHasLogo(Boolean(centre.logo_url?.trim()))
        setHasCoverImage(Boolean(centre.cover_image_url?.trim()))
        setHasDescription(Boolean(centre.description?.trim()))
        setHasPhone(Boolean(centre.phone?.trim()))
        setHasAddress(Boolean(centre.address?.trim() && centre.suburb?.trim()))

        const [childrenResult, attendanceResult, pickupResult, subscriptionResult] = await Promise.all([
          supabase.from('children').select('id', { count: 'exact', head: true }).eq('ecd_id', centre.id),
          supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('ecd_id', centre.id),
          supabase.from('pickup_codes').select('id', { count: 'exact', head: true }).eq('ecd_id', centre.id),
          supabase.from('subscriptions').select('tier,status').eq('ecd_id', centre.id).maybeSingle(),
        ])

        if (!mounted) return

        setChildrenCount(childrenResult.count ?? 0)
        setAttendanceCount(attendanceResult.count ?? 0)
        setPickupCount(pickupResult.count ?? 0)

        const subscription = subscriptionResult.data as SubscriptionRow | null
        if (subscription) {
          setSelectedPlan(toPublicPlan(subscription.tier, queryDefaults.packagePlan))
          setSelectedPlanStatus(normalizeSubscriptionStatus(subscription.status))
        } else {
          setSelectedPlan(queryDefaults.packagePlan)
          setSelectedPlanStatus('trial')
        }
      }

      setCheckingSession(false)
    }

    void loadWelcomeContext()

    return () => {
      mounted = false
    }
  }, [
    queryDefaults.centreName,
    queryDefaults.centreSlug,
    queryDefaults.contactName,
    queryDefaults.packagePlan,
    supabase,
  ])

  const activationSteps = useMemo(
    () => [
      {
        id: 'child',
        step: '01',
        title: 'Add your first child',
        description:
          'Start with one child only. Once that child is in, attendance, reports, and parent communication make sense immediately.',
        href: '/ecd/children/new',
        ctaLabel: childrenCount > 0 ? 'Review children' : 'Add first child',
        done: childrenCount > 0,
        icon: Users,
      },
      {
        id: 'attendance',
        step: '02',
        title: 'Mark attendance once',
        description:
          'Take one live register on your phone so the daily rhythm is active and your team can see how much time it saves.',
        href: '/ecd/attendance',
        ctaLabel: attendanceCount > 0 ? 'Review attendance' : 'Open attendance',
        done: attendanceCount > 0,
        icon: FileCheck2,
      },
      {
        id: 'pickup',
        step: '03',
        title: 'Turn on safe pickup',
        description:
          'Approve the adults who can collect and use secure pickup checks so gate time feels calmer and more professional.',
        href: '/ecd/pickup',
        ctaLabel: pickupCount > 0 ? 'Review pickup' : 'Set up pickup',
        done: pickupCount > 0,
        icon: ShieldCheck,
      },
      {
        id: 'profile',
        step: '04',
        title: 'Finish your centre profile',
        description:
          'Logo, photos, phone number, and address help parents trust what they see before they ever contact you.',
        href: hasLogo || hasCoverImage ? '/ecd/website' : '/ecd/profile',
        ctaLabel: profileComplete ? 'Review profile' : 'Finish profile',
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
    setGuideUnlocked(true)
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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-emerald-50/30 pb-16 selection:bg-cyan-100 selection:text-cyan-900">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-100 bg-gradient-to-br from-teal-700 to-teal-400 p-5 text-white sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em]">
                  Welcome pack preview
                </span>
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
                  Live tools open after sign in
                </span>
              </div>
              <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-teal-50">{location}</p>
                    <h1 className="text-[2rem] font-black leading-tight tracking-tight sm:text-[2.5rem]">
                      Sawubona, {firstName}. Your guide is ready.
                    </h1>
                    <p className="max-w-2xl text-sm font-medium leading-7 text-teal-50 sm:text-base">
                      You can read the full guide now. When you are ready to start, create your password or sign in and CentreConnect will open the live version for {centreName}.
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">Your account</p>
                    <p className="mt-2 text-lg font-black text-white">{centreName}</p>
                    <p className="mt-1 text-sm font-medium text-teal-50">{inviteEmail || 'Use the email you enrolled with'}</p>
                    <p className="mt-2 text-sm font-medium text-white/85">
                      Start with a password if you still need one. If you already created it, sign in and CentreConnect will open this guide with your live data.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild className="h-12 rounded-2xl bg-slate-950 text-sm font-black text-white hover:bg-slate-900">
                      <Link href={passwordHelpHref}>Create or reset password</Link>
                    </Button>
                    <Button asChild variant="outline" className="h-12 rounded-2xl border-white/20 bg-white/10 text-sm font-black text-white hover:bg-white/15 hover:text-white">
                      <Link href={signInHref}>Sign in to open guide</Link>
                    </Button>
                  </div>
                </div>

                <div className="rounded-[1.75rem] bg-slate-950/90 p-5 text-white shadow-2xl">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-teal-200">What happens after sign in</p>
                  <h2 className="mt-2 text-xl font-black leading-tight">Three quick moves and your centre is live.</h2>
                  <div className="mt-5 space-y-3">
                    {[
                      'Add your first child from the paper register.',
                      'Mark attendance once so the day starts flowing in the app.',
                      'Turn on safe pickup so parents feel the difference immediately.',
                    ].map((item, index) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-200">Step {index + 1}</p>
                        <p className="mt-1 text-sm font-medium leading-6 text-slate-200">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-4 sm:p-6">
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">See what CentreConnect helps with</p>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  See what this will change in your centre.
                </h2>
                <p className="text-sm leading-7 text-slate-600">
                  Tap any card. We explain the real-life before, after, and why it matters. The live tools open after you create your password or sign in.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {SCENARIOS.map((scenario) => (
                  <ScenarioCard key={scenario.id} scenario={scenario} onOpen={setActiveScenario} />
                ))}
              </div>

              <PackageSection selectedPlan={selectedPlan} selectedPlanStatus={selectedPlanStatus} />

              <ListingPreviewSection
                centreName={centreName}
                location={location}
                logoUrl={centreLogoUrl}
                coverImageUrl={centreCoverImageUrl}
                description={listingPreviewDescription}
                hasLogo={hasLogo}
                hasCoverImage={hasCoverImage}
                planLabel={getPublicPlanLabel(selectedPlan)}
                isRegistered={isRegistered}
                previewMode
                actionHref={passwordHelpHref}
              />

              <section id="how-it-helps" className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Your first steps</p>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    You can read the guide now. The live tools open after sign in.
                  </h2>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {activationSteps.map((step) => {
                    const Icon = step.icon
                    return (
                      <Card key={step.id} className="rounded-[1.75rem] border border-slate-200 bg-white shadow-none">
                        <CardContent className="space-y-4 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Step {step.step}</p>
                                <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">{step.title}</h3>
                              </div>
                            </div>
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">
                              Preview
                            </span>
                          </div>
                          <p className="text-sm font-medium leading-7 text-slate-600">{step.description}</p>
                          <Button asChild variant="outline" className="h-11 rounded-2xl border-slate-200 text-sm font-black">
                            <Link href={signInHref}>
                              Sign in to open this
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>

              <Card className="rounded-[1.75rem] border-slate-200 bg-slate-50 shadow-none">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Need a hand?</p>
                    <p className="text-sm font-medium leading-6 text-slate-600">
                      If anything feels confusing, reply on WhatsApp and we will walk you through it step by step.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild className="h-11 rounded-2xl bg-emerald-500 text-sm font-black text-white hover:bg-emerald-600">
                      <Link href={supportWhatsappHref}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp Mandla
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-11 rounded-2xl border-slate-200 text-sm font-black">
                      <Link href={passwordHelpHref}>Create password first</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>

        <ScenarioModal
          scenario={activeScenario}
          previewMode
          passwordHelpHref={passwordHelpHref}
          signInHref={signInHref}
          onClose={() => setActiveScenario(null)}
        />
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
                    One password, then your full welcome guide opens here and the same guide is sent to your email for later.
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-emerald-50/30 pb-16 selection:bg-cyan-100 selection:text-cyan-900">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 bg-gradient-to-br from-teal-700 to-teal-400 p-5 text-white sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em]">
                Welcome pack live
              </span>
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
                {getPublicPlanLabel(selectedPlan)}
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
                    This guide shows the exact first moves that make CentreConnect click for your team. Start with one child, then everything else gets easier.
                  </p>
                  {guideUnlocked ? (
                    <div className="rounded-[1.25rem] border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white/90">
                      Your guide is open now, and the same guide was sent to your email so you can come back to it later.
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
                    : 'You already have the basics in place. From here, keep using the dashboard and share your centre profile with parents.'}
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

          <div className="space-y-6 p-4 sm:p-6">
            <section id="how-it-helps" className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">See what CentreConnect helps with</p>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  See what this will change in your centre.
                </h2>
                <p className="text-sm leading-7 text-slate-600">
                  Tap a scenario card and you will see the simple version of what changes for your staff and for parents.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {SCENARIOS.map((scenario) => (
                  <ScenarioCard key={scenario.id} scenario={scenario} onOpen={setActiveScenario} />
                ))}
              </div>
            </section>

            <PackageSection selectedPlan={selectedPlan} selectedPlanStatus={selectedPlanStatus} />

            <ListingPreviewSection
              centreName={centreName}
              location={location}
              logoUrl={centreLogoUrl}
              coverImageUrl={centreCoverImageUrl}
              description={listingPreviewDescription}
              hasLogo={hasLogo}
              hasCoverImage={hasCoverImage}
              planLabel={getPublicPlanLabel(selectedPlan)}
              isRegistered={isRegistered}
            />

            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
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
                  <Button asChild variant="outline" className="h-12 justify-start rounded-2xl border-slate-200 text-sm font-black">
                    <Link href={posterHref} target="_blank">
                      <Printer className="mr-2 h-4 w-4" />
                      Print QR posters
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-12 justify-start rounded-2xl border-slate-200 text-sm font-black">
                    <Link href="/ecd/website">
                      <Globe className="mr-2 h-4 w-4" />
                      Website setup
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-12 justify-start rounded-2xl border-slate-200 text-sm font-black">
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
                      'h-12 justify-start rounded-2xl border-slate-200 text-sm font-black',
                      copyStatus === 'done' && 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    )}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copyStatus === 'done' ? 'Centre link copied' : 'Copy centre link'}
                  </Button>

                  <div className="rounded-[1.4rem] border border-slate-100 bg-slate-50 p-4 sm:col-span-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Need a hand?</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                      Reply on WhatsApp if you want help with setup, staff training, or explaining CentreConnect to your team.
                    </p>
                    <Button asChild className="mt-4 h-11 rounded-2xl bg-emerald-500 text-sm font-black text-white hover:bg-emerald-600">
                      <Link href={supportWhatsappHref}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp Mandla
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="first-steps" className="mt-6 space-y-4">
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

      <ScenarioModal
        scenario={activeScenario}
        previewMode={false}
        passwordHelpHref={passwordHelpHref}
        signInHref={signInHref}
        onClose={() => setActiveScenario(null)}
      />
    </div>
  )
}

