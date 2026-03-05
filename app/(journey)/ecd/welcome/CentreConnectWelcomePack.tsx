'use client'

import {
  ClipboardCheck,
  type LucideIcon,
  MessageCircleMore,
  NotebookPen,
  ShieldCheck,
  UserRoundPlus,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { BrandMark } from '@/components/ecd/BrandMark'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'

type Scenario = {
  id: string
  shortTitle: string
  title: string
  color: string
  bg: string
  accent: string
  icon: LucideIcon
  pain: string
  solution: string
  steps: string[]
  ctaLabel: string
  ctaHref: string
  quote: string
  quoteAuthor: string
}

const scenarios: Scenario[] = [
  {
    id: 'applications',
    shortTitle: 'Applications',
    title: 'No more chasing parents on WhatsApp',
    color: '#0D9488',
    bg: '#F0FDFA',
    accent: '#CCFBF1',
    icon: MessageCircleMore,
    pain:
      'You post, wait, follow up, and then documents arrive in many messages. It wastes your day.',
    solution:
      'Applications come into one clean list. Open, review, accept or decline, and parents are updated instantly.',
    steps: [
      'Parent applies from your centre page',
      'You get a clear notification',
      'Open one card with all details',
      'Accept, decline, or waitlist with one tap',
      'Parent receives the result automatically',
    ],
    ctaLabel: 'See Applications Board',
    ctaHref: '/ecd/pipeline',
    quote: '"Monday admin used to take two hours. Now it takes ten minutes."',
    quoteAuthor: 'Mama Thandi, Soweto',
  },
  {
    id: 'children',
    shortTitle: 'Children',
    title: 'Children records are finally organised',
    color: '#7C3AED',
    bg: '#FAF5FF',
    accent: '#EDE9FE',
    icon: NotebookPen,
    pain:
      'The register works until you must find one detail quickly while a parent is waiting at the gate.',
    solution:
      'Each child profile keeps age group, guardians, pickups, and notes in one place that your team can search fast.',
    steps: [
      'Add child name and date of birth',
      'Add parent and guardian contacts',
      'Add approved pickup people',
      'Save health notes and allergies',
      'Find any record in seconds',
    ],
    ctaLabel: 'Open Children Setup',
    ctaHref: '/ecd/children/new',
    quote: '"I stopped paging through files during busy pickup time."',
    quoteAuthor: 'Auntie Rose, Alexandra',
  },
  {
    id: 'attendance',
    shortTitle: 'Attendance',
    title: 'Attendance in under a minute',
    color: '#0369A1',
    bg: '#F0F9FF',
    accent: '#BAE6FD',
    icon: ClipboardCheck,
    pain:
      'Morning roll call and month-end counting can eat hours and create mistakes.',
    solution:
      'Tap present or absent and the system keeps totals for billing and reports.',
    steps: [
      'Open attendance each morning',
      'Tap present or absent per child',
      'Add absence reason only if needed',
      'Everything saves automatically',
      'Use monthly summaries when invoicing',
    ],
    ctaLabel: 'Open Attendance',
    ctaHref: '/ecd/attendance',
    quote: '"Month-end counting used to be painful. Now it is already done."',
    quoteAuthor: 'Mama Precious, Tembisa',
  },
  {
    id: 'pickup',
    shortTitle: 'Safe Pickup',
    title: 'Safe pickup with less gate stress',
    color: '#B45309',
    bg: '#FFFBEB',
    accent: '#FDE68A',
    icon: ShieldCheck,
    pain:
      'Someone unknown says they are collecting a child and you are forced to make a risky call.',
    solution:
      'QR pickup checks show if the person is approved before release, so staff can stay calm and consistent.',
    steps: [
      'Add approved pickup people once',
      'Print your gate QR poster',
      'Guardian scans or shows their code',
      'Staff confirms on screen',
      'Parent gets a pickup update',
    ],
    ctaLabel: 'Set Up Safe Pickup',
    ctaHref: '/ecd/pickup',
    quote: '"Now I can protect children and still keep the gate calm."',
    quoteAuthor: 'Mama Lindiwe, Katlehong',
  },
  {
    id: 'parents',
    shortTitle: 'Invite Parents',
    title: 'Parents feel included every day',
    color: '#047857',
    bg: '#F0FDF4',
    accent: '#A7F3D0',
    icon: Users,
    pain:
      'Parents often feel disconnected, then everything becomes urgent at the last minute.',
    solution:
      'Parents can view updates, attendance, and notes in app. Trust grows without extra calls.',
    steps: [
      'Share your centre link',
      'Parents create free accounts',
      'They apply through your profile',
      'You approve and onboard faster',
      'Parents follow updates daily',
    ],
    ctaLabel: 'Get Parent Link',
    ctaHref: '/ecd/profile',
    quote: '"Parents started thanking us for clear daily communication."',
    quoteAuthor: 'Auntie Grace, Mamelodi',
  },
  {
    id: 'staff',
    shortTitle: 'Your Staff',
    title: 'Give staff access without losing control',
    color: '#9D174D',
    bg: '#FFF1F2',
    accent: '#FECDD3',
    icon: UserRoundPlus,
    pain:
      'You cannot be everywhere, but sharing one password is not safe.',
    solution:
      'Each team member gets their own login and role, so they can help while your data stays protected.',
    steps: [
      'Open centre profile settings',
      'Invite staff by email',
      'Assign role permissions',
      'They activate their own login',
      'Track who did what in the system',
    ],
    ctaLabel: 'Invite Staff',
    ctaHref: '/ecd/profile',
    quote: '"My team can help more, and I still keep full control."',
    quoteAuthor: 'Mama Ntombi, Soweto',
  },
]

const tips = [
  'Add CentreConnect to your home screen. It works like an app.',
  'Start with five children today, then add the rest tomorrow.',
  'Print your Safe Pickup QR poster and place it at the gate.',
  'Upload your logo and a clear centre photo to build trust quickly.',
]

export default function CentreConnectWelcomePack() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<0 | 1>(0)
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)

  const ownerName = useMemo(
    () => searchParams.get('name')?.trim() || 'Friend',
    [searchParams]
  )
  const centreName = useMemo(
    () => searchParams.get('centre')?.trim() || 'your centre',
    [searchParams]
  )
  const location = useMemo(
    () => searchParams.get('location')?.trim() || 'your community',
    [searchParams]
  )
  const firstName = ownerName.split(' ')[0] || ownerName

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] via-white to-[#ECFEFF] px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-8 rounded-[32px] border border-slate-100 bg-white p-5 shadow-[0_25px_70px_rgba(2,6,23,0.08)] sm:p-8">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <BrandMark compact className="h-12 w-auto" />
            <Badge className="rounded-full bg-[#E6FFFB] px-4 py-1 text-xs font-semibold text-[#0F766E]">
              Sawubona, Dumela, Hello
            </Badge>
          </div>
        </header>

        {step === 0 ? (
          <section className="space-y-6">
            <Card className="overflow-hidden rounded-3xl border border-slate-100">
              <div className="relative h-60 w-full sm:h-80">
                <img
                  src="https://thumbs.dreamstime.com/b/young-african-preschool-kids-playing-playground-kindergarten-school-soweto-south-africa-july-180790376.jpg"
                  alt="Children playing at an ECD centre"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-8">
                  <p className="text-sm font-semibold tracking-wide text-amber-200">
                    CentreConnect Pilot Welcome
                  </p>
                  <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-4xl">
                    Hey {firstName}, welcome to CentreConnect.
                  </h1>
                  <p className="mt-2 text-sm text-slate-100 sm:text-base">
                    {centreName} in {location} is ready. Parents are already asking for the app.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-3xl border-[#CCFBF1] bg-[#F0FDFA]">
              <CardContent className="space-y-4 p-6">
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  We know how WhatsApp blows up.
                </h2>
                <p className="text-sm leading-7 text-slate-700 sm:text-base">
                  You are already doing great work for children. This guide just helps you
                  move faster with less stress. No jargon, no pressure, just practical steps.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-2xl bg-[#14B8A6] px-6 py-6 text-base font-semibold text-white hover:bg-[#0F766E]"
                  >
                    Let&apos;s get started
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-2xl border-[#14B8A6] px-6 py-6 text-base font-semibold text-[#0F172A]"
                  >
                    <Link href="/ecd/profile">Open my setup page</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : (
          <section className="space-y-8">
            <Card className="rounded-3xl border-[#E2E8F0]">
              <CardContent className="space-y-4 p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                  Your Welcome Guide
                </p>
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Your centre, your way.
                </h2>
                <p className="text-sm leading-7 text-slate-600 sm:text-base">
                  Tap any card below. You will see a real situation, simple steps,
                  and the best next button to press.
                </p>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Friendly note: parents already expect digital updates and safe pickup checks.
                  You are in the right place.
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {scenarios.map((scenario) => {
                const Icon = scenario.icon
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => setActiveScenario(scenario)}
                    className="group flex h-full min-h-[220px] flex-col justify-between rounded-3xl border-2 p-5 text-left transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(2,6,23,0.12)]"
                    style={{ background: scenario.bg, borderColor: scenario.accent }}
                  >
                    <div className="space-y-3">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                        <Icon className="h-5 w-5" color={scenario.color} />
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                        {scenario.shortTitle}
                      </p>
                      <h3
                        className="text-lg font-bold leading-snug sm:text-xl"
                        style={{ color: scenario.color }}
                      >
                        {scenario.title}
                      </h3>
                      <p className="text-sm leading-6 text-slate-700">
                        {scenario.pain}
                      </p>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                      Learn more
                    </span>
                  </button>
                )
              })}
            </div>

            <Card className="rounded-3xl border-[#E2E8F0]">
              <CardContent className="space-y-4 p-6 sm:p-8">
                <h3 className="text-xl font-bold text-slate-900">
                  Quick tips from other principals
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {tips.map((tip) => (
                    <div
                      key={tip}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
                    >
                      {tip}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-[#A7F3D0] bg-[#F0FDF4]">
              <CardContent className="space-y-5 p-6 text-center sm:p-8">
                <h3 className="text-2xl font-bold text-slate-900">
                  You are not doing this alone.
                </h3>
                <p className="text-sm leading-7 text-slate-700 sm:text-base">
                  Need a hand right now? WhatsApp us and we will walk the setup
                  with you, step by step.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    asChild
                    className="rounded-2xl bg-[#14B8A6] px-6 py-6 text-base font-semibold text-white hover:bg-[#0F766E]"
                  >
                    <Link href="/ecd/profile">Get Started</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-2xl border-[#22C55E] px-6 py-6 text-base font-semibold text-[#166534]"
                  >
                    <Link href="https://wa.me/27685356430?text=Hi%20CentreConnect%2C%20please%20help%20me%20set%20up.">
                      WhatsApp +27 68 535 6430
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      <Dialog open={Boolean(activeScenario)} onOpenChange={(open) => !open && setActiveScenario(null)}>
        {activeScenario && (
          <DialogContent className="max-h-[92vh] max-w-2xl overflow-hidden rounded-[28px] p-0">
            <div style={{ background: activeScenario.color }} className="px-6 pb-6 pt-8 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                {activeScenario.shortTitle}
              </p>
              <h3 className="mt-3 text-2xl font-bold leading-snug text-white sm:text-3xl">
                {activeScenario.title}
              </h3>
            </div>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-6 sm:px-8">
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
                  You know this situation
                </p>
                <p className="mt-2 text-sm leading-7 text-amber-900 sm:text-base">
                  {activeScenario.pain}
                </p>
              </div>

              <div
                className="rounded-2xl border-2 p-4"
                style={{ borderColor: activeScenario.accent, background: activeScenario.bg }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Here is how it works now
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700 sm:text-base">
                  {activeScenario.solution}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Step by step
                </p>
                <div className="space-y-2">
                  {activeScenario.steps.map((stepText, index) => (
                    <div key={stepText} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                      <span
                        className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: activeScenario.color }}
                      >
                        {index + 1}
                      </span>
                      <p className="text-sm leading-6 text-slate-700">{stepText}</p>
                    </div>
                  ))}
                </div>
              </div>

              <blockquote className="rounded-2xl border-l-4 border-slate-300 bg-slate-50 p-4 text-sm italic text-slate-700">
                <p>{activeScenario.quote}</p>
                <footer className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                  {activeScenario.quoteAuthor}
                </footer>
              </blockquote>

              <Button
                asChild
                className="w-full rounded-2xl bg-slate-900 py-6 text-base font-semibold text-white hover:bg-slate-800"
              >
                <Link href={activeScenario.ctaHref}>{activeScenario.ctaLabel}</Link>
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
