import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  HeartHandshake,
  MessageCircleHeart,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/layout/AppHeader'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PUBLIC_PLAN_OPTIONS, getPublicPlanDefinition, getPublicPlanLabel, getPublicPlanPrice, type PublicPlan } from '@/lib/billing/plans'

export const metadata: Metadata = {
  title: 'For ECD Centres - CentreConnect',
  description: 'A friendly, professional CentreConnect setup for crèches that want more parent trust and less admin stress.',
}

type Centre = {
  id: string
  slug: string
  name: string
  suburb: string
  city: string
  is_registered: boolean
  tagline: string | null
}

type PlanNarrative = {
  emoji: string
  summary: string
  bestFor: string
  spotlight: string
}

const planNarratives: Record<PublicPlan, PlanNarrative> = {
  starter: {
    emoji: '🌱',
    summary: 'A simple, beautiful first step online.',
    bestFor: 'Smaller centres that want parents to find them and apply without WhatsApp chaos.',
    spotlight: 'You get your public profile, applications, messages, and clean child intake in one place.',
  },
  growth: {
    emoji: '🚀',
    summary: 'The everyday package for busy crèches.',
    bestFor: 'Centres that want admissions plus daily operations to feel calmer.',
    spotlight: 'You add attendance, calendar routines, reminders, and daily tracking on top of the parent-facing basics.',
  },
  pro: {
    emoji: '💎',
    summary: 'The full CentreConnect setup with premium help.',
    bestFor: 'Established centres ready for stronger visibility, faster rollout, and high-touch support.',
    spotlight: 'You unlock the full public + operations stack with website tools and priority onboarding help.',
  },
}

const quickWins = [
  {
    icon: HeartHandshake,
    title: 'Parents trust you faster 😊',
    body: 'Show your centre professionally, answer common questions once, and stop repeating yourself in every chat.',
  },
  {
    icon: MessageCircleHeart,
    title: 'Less WhatsApp chasing 💬',
    body: 'Applications, updates, and parent communication live in one calm flow instead of scattered messages.',
  },
  {
    icon: CalendarCheck2,
    title: 'Daily admin feels lighter ✨',
    body: 'Attendance, routines, and follow-up stop living in three notebooks and one stressed mind.',
  },
] as const

const workflowSteps = [
  {
    step: '01',
    title: 'Set up your centre once 👋',
    body: 'Tell us about your crèche, pick the package that fits, and we help you get live without jargon.',
  },
  {
    step: '02',
    title: 'Parents discover you online 🔎',
    body: 'Your listing looks professional, parents can apply properly, and your first impression feels trustworthy.',
  },
  {
    step: '03',
    title: 'Run the day with less stress 📲',
    body: 'Use the same system for attendance, child info, parent updates, and safe pickup as you grow.',
  },
] as const

const comparisonRows = [
  { label: 'Public centre profile', starter: true, growth: true, pro: true },
  { label: 'Online parent applications', starter: true, growth: true, pro: true },
  { label: 'Announcements and parent messages', starter: true, growth: true, pro: true },
  { label: 'Attendance register', starter: false, growth: true, pro: true },
  { label: 'Calendar and routines', starter: false, growth: true, pro: true },
  { label: 'Daily operational tracking', starter: false, growth: true, pro: true },
  { label: 'Richer website sections', starter: false, growth: false, pro: true },
  { label: 'Priority onboarding help', starter: false, growth: false, pro: true },
] as const

function statusLabel(isRegistered: boolean) {
  return isRegistered ? 'Verified centre' : 'Live listing'
}

function PlanCheck({ active }: { active: boolean }) {
  if (!active) {
    return <span className="text-slate-300">-</span>
  }

  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-700">
      <Check className="h-3.5 w-3.5" />
    </span>
  )
}

export default async function ForCentresPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('ecd_centres')
    .select('id,slug,name,suburb,city,is_registered,tagline')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(24)

  const centres = (data ?? []) as Centre[]
  const registeredCount = centres.filter((centre) => centre.is_registered).length

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#effcff_0%,#f8fbfd_28%,#ffffff_100%)] text-slate-900">
      <AppHeader
        links={[
          { href: '#plans', label: 'Plans' },
          { href: '#compare', label: 'Compare' },
          { href: '#active-centres', label: 'Live Centres' },
          { href: '/ecd/login', label: 'ECD Login' },
        ]}
        cta={{ href: '/for-centres/register?plan=growth&flow=confirm', label: 'Start my setup 😊' }}
      />

      <Section className="pb-6 pt-10 sm:pt-12 lg:pt-16" containerClassName="cc-section">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="space-y-5">
            <Badge className="w-fit border-amber-200 bg-amber-50 text-amber-800 shadow-none hover:bg-amber-50">
              Made for South African crèches 💛
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Fill your crèche faster, and run the day with less stress 😊
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                CentreConnect helps parents find your centre, apply properly, and hear from you faster. Then it helps your team handle attendance, communication, and daily admin in one friendly system.
              </p>
              <p className="text-sm font-medium italic text-slate-500">
                It should feel professional for parents, and easy for your team.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="h-12 rounded-2xl bg-teal-600 px-6 text-sm font-bold text-white hover:bg-teal-700">
                <Link href="/for-centres/register?plan=growth&flow=confirm">Start my setup 😊</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-2xl border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Link href="#plans">See packages</Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[var(--shadow-elevation-1)]">
                <p className="text-2xl font-black text-slate-950">{centres.length}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Centres live now</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[var(--shadow-elevation-1)]">
                <p className="text-2xl font-black text-slate-950">{registeredCount}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Verified centres</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[var(--shadow-elevation-1)]">
                <p className="text-2xl font-black text-slate-950">10 min</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Typical setup start</p>
              </div>
            </div>
          </div>

          <Card className="rounded-[2rem] border-cyan-100/80 bg-white/95 shadow-[var(--shadow-elevation-4)]">
            <CardHeader className="space-y-3 pb-4">
              <Badge variant="outline" className="w-fit border-teal-200 bg-teal-50 text-teal-700 shadow-none">
                What centre owners love 🎉
              </Badge>
              <CardTitle className="text-2xl font-black text-slate-950">One friendly setup. Three big wins.</CardTitle>
              <CardDescription className="text-sm leading-7 text-slate-600">
                You do not need to become a tech person. You just need a system that makes your centre look good and saves time every week.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickWins.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section className="py-6 sm:py-8" containerClassName="cc-section">
        <div className="grid gap-4 md:grid-cols-3">
          {workflowSteps.map((item) => (
            <Card key={item.step} className="rounded-[1.75rem] border-slate-200/80 bg-white/90 shadow-[var(--shadow-elevation-2)]">
              <CardHeader className="pb-3">
                <Badge variant="outline" className="w-fit border-teal-200 bg-teal-50 text-teal-700 shadow-none">
                  Step {item.step}
                </Badge>
                <CardTitle className="text-xl font-black text-slate-950">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-slate-600">{item.body}</CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="plans" className="py-10 md:py-12" containerClassName="cc-section">
        <div className="mb-6 space-y-2">
          <Badge className="w-fit border-cyan-200 bg-cyan-50 text-cyan-800 shadow-none hover:bg-cyan-50">
            Simple pricing ✨
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Choose the package that fits how your centre works.</h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Starter works well on its own. Growth builds on that with daily operations. Pro gives you the full stack plus premium support.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {PUBLIC_PLAN_OPTIONS.map((plan) => {
            const definition = getPublicPlanDefinition(plan)
            const narrative = planNarratives[plan]
            const isGrowth = plan === 'growth'
            return (
              <Card
                key={plan}
                className={`rounded-[2rem] border bg-white/95 shadow-[var(--shadow-elevation-3)] ${
                  isGrowth ? 'border-teal-300 ring-1 ring-teal-200' : 'border-slate-200/80'
                }`}
              >
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800 shadow-none">
                      {narrative.emoji} {getPublicPlanLabel(plan)}
                    </Badge>
                    {isGrowth ? (
                      <Badge className="border-teal-200 bg-teal-600 text-white shadow-none hover:bg-teal-600">Most popular 💙</Badge>
                    ) : null}
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black text-slate-950">R{getPublicPlanPrice(plan)}</CardTitle>
                    <CardDescription className="mt-1 text-sm font-medium text-slate-500">per month, per centre</CardDescription>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">{narrative.summary}</p>
                  <p className="text-sm leading-7 text-slate-600">{definition.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Best for</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{narrative.bestFor}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">What you get</p>
                    <ul className="space-y-2 text-sm leading-6 text-slate-600">
                      {definition.includes.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 text-sm leading-6 text-cyan-900">
                    <p className="font-semibold">{narrative.spotlight}</p>
                  </div>
                  <Button
                    asChild
                    className={`h-11 w-full rounded-2xl text-sm font-bold ${
                      isGrowth ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    <Link href={`/for-centres/register?plan=${plan}&flow=confirm`}>
                      Choose {getPublicPlanLabel(plan)}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </Section>

      <Section id="compare" className="py-8 md:py-10" containerClassName="cc-section">
        <Card className="rounded-[2rem] border-slate-200/80 bg-white/95 shadow-[var(--shadow-elevation-2)]">
          <CardHeader className="space-y-2 pb-4">
            <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700 shadow-none">
              Compare clearly 🔍
            </Badge>
            <CardTitle className="text-2xl font-black text-slate-950 sm:text-3xl">See how the packages build up.</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7 text-slate-600">
              Starter stands alone. Growth adds the daily operations layer. Pro gives you everything below plus premium support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[32%] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Feature</TableHead>
                  <TableHead className="px-4 py-3 text-center">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-slate-900">Starter</p>
                      <p className="text-xs font-medium text-slate-500">Works on its own</p>
                    </div>
                  </TableHead>
                  <TableHead className="px-4 py-3 text-center">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-slate-900">Growth</p>
                      <p className="text-xs font-medium text-slate-500">Starter + daily ops</p>
                    </div>
                  </TableHead>
                  <TableHead className="px-4 py-3 text-center">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-slate-900">Pro</p>
                      <p className="text-xs font-medium text-slate-500">Starter + Growth + premium help</p>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row) => (
                  <TableRow key={row.label} className="border-slate-100 hover:bg-slate-50/60">
                    <TableCell className="px-4 py-4 text-sm font-semibold text-slate-700">{row.label}</TableCell>
                    <TableCell className="px-4 py-4 text-center"><PlanCheck active={row.starter} /></TableCell>
                    <TableCell className="px-4 py-4 text-center"><PlanCheck active={row.growth} /></TableCell>
                    <TableCell className="px-4 py-4 text-center"><PlanCheck active={row.pro} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Section>

      <Section id="active-centres" className="py-10 md:py-12" containerClassName="cc-section">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Badge className="w-fit border-emerald-200 bg-emerald-50 text-emerald-800 shadow-none hover:bg-emerald-50">
              Real centres live now 🎉
            </Badge>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Parents are already seeing centres on CentreConnect.</h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              This is not a concept page. These are real listings that parents can discover, view, and apply to.
            </p>
          </div>
          <p className="text-sm font-semibold text-slate-500">{centres.length} live centres</p>
        </div>

        {centres.length === 0 ? (
          <Card className="rounded-[1.75rem] border-slate-200/80 bg-white/90 shadow-[var(--shadow-elevation-1)]">
            <CardContent className="p-6 text-sm text-slate-600">No active centres listed yet.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {centres.slice(0, 6).map((centre) => (
              <Card key={centre.id} className="rounded-[1.75rem] border-slate-200/80 bg-white/95 shadow-[var(--shadow-elevation-2)]">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black text-slate-950">{centre.name}</p>
                      <p className="text-sm text-slate-600">
                        {centre.suburb}, {centre.city}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800 shadow-none">
                      {centre.is_registered ? (
                        <>
                          <Sparkles className="mr-1 h-3.5 w-3.5" />
                          {statusLabel(centre.is_registered)}
                        </>
                      ) : (
                        statusLabel(centre.is_registered)
                      )}
                    </Badge>
                  </div>
                  {centre.tagline ? <p className="text-sm leading-6 text-slate-600">{centre.tagline}</p> : null}
                  <Button variant="outline" size="sm" asChild className="h-10 rounded-2xl border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <Link href={`/c/${centre.slug}`}>View parent-facing profile</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section className="pb-14 pt-6 md:pb-16" containerClassName="cc-section">
        <div className="rounded-[2rem] border border-teal-200 bg-[linear-gradient(135deg,#0f766e_0%,#0891b2_100%)] px-6 py-8 text-white shadow-[var(--shadow-elevation-4)] sm:px-8 sm:py-10 lg:px-12">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-3">
              <Badge className="w-fit border-white/20 bg-white/10 text-white shadow-none hover:bg-white/10">
                Friendly setup, real support 🤝
              </Badge>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Ready to make your centre easier to discover and easier to run?</h2>
              <p className="max-w-2xl text-sm leading-7 text-teal-50 sm:text-base">
                Start with the package that matches your centre today. You can grow into more tools when your team is ready.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild className="h-11 rounded-2xl bg-white px-6 text-sm font-bold text-teal-700 hover:bg-teal-50">
                <Link href="/for-centres/register?plan=growth&flow=confirm">Start my setup 😊</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-2xl border-white/30 bg-white/10 px-6 text-sm font-semibold text-white hover:bg-white/15">
                <Link href="/ecd/login">
                  Already have access?
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </main>
  )
}


