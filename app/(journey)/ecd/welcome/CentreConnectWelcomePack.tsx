'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { BrandMark } from '@/components/ecd/BrandMark'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const scenarios = [
  {
    id: 'applications',
    color: '#0D9488',
    bg: '#F0FDFA',
    accent: '#CCFBF1',
    title: 'No more chasing parents on WhatsApp',
    solution:
      'When a parent applies through CentreConnect, everything lands in one place. You just review the child, accept or decline, and a polite notification goes out automatically.',
    pain:
      'You post in the WhatsApp group, wait, chase, then chase again. Documents land in four different messages and you have to stop everything to find them.',
    steps: [
      'A parent finds your centre and fills in the application',
      'You hear the ping and open your dashboard',
      'Everything is already organised — review once, decide once',
      'Hit Accept, Decline, or Waitlist with one tap',
      'The parent gets a clear notification straight away',
    ],
    ctaLabel: 'See the Applications board',
    ctaHref: '/ecd/pipeline',
    quote: '"I used to spend two hours every Monday sorting messages. Now it is ten minutes."',
    quoteAuthor: 'Mama Thandi, Soweto ECD Centre',
  },
  {
    id: 'children',
    color: '#7C3AED',
    bg: '#FAF5FF',
    accent: '#EDE9FE',
    title: "Your children's records — finally organised",
    solution:
      'Add every child once. Birthdays, guardians, authorised pick-ups, health notes — everything lives on your phone so you can find it in seconds.',
    pain:
      'The big register works until you need something quickly. A parent is waiting, you are flipping to the right page — it takes forever.',
    steps: [
      "Add a child's name, DOB and age group",
      'Attach guardian contact details',
      'Add anyone allowed to pick them up',
      'Drop in allergies or medical notes',
      'Let staff open the file even when you are not there',
    ],
    ctaLabel: 'Start adding children',
    ctaHref: '/ecd/children',
    quote: '"When a mum called about an allergy, I used to panic. Now I just check on my phone."',
    quoteAuthor: 'Auntie Rose, Alexandra Crèche',
  },
  {
    id: 'attendance',
    color: '#0369A1',
    bg: '#F0F9FF',
    accent: '#BAE6FD',
    title: 'Attendance in 30 seconds, not 30 minutes',
    solution:
      'Mark every child present or absent with a tap. The system remembers, totals the month, and keeps parents informed without extra typing.',
    pain:
      'Roll call takes half the morning. At the end of the month you count ticks and try to remember who was away — it is draining.',
    steps: [
      'Open the attendance screen each morning',
      'Tap each child — green for present, grey for absent',
      'Add a reason when needed',
      'It saves automatically',
      'Use the monthly summary for invoicing or reports',
    ],
    ctaLabel: 'Open attendance',
    ctaHref: '/ecd/attendance',
    quote: '"End of month used to take a whole weekend. Now the counts are ready on Monday."',
    quoteAuthor: 'Mama Precious, Tembisa',
  },
  {
    id: 'pickup',
    color: '#B45309',
    bg: '#FFFBEB',
    accent: '#FDE68A',
    title: 'Safe pickup — no more gate confusion',
    solution:
      'Authorised people show a QR code at the gate. Scan it, get a green light, and send parents a delivery confirmation. No arguments, no guessing.',
    pain:
      'Someone you have never seen says they are picking up little Lethabo. You call the mum, she does not pick up, the guardian is getting restless.',
    steps: [
      'Add authorised pickup people to each child',
      'Print the QR poster for your gate',
      'Guardians show or scan the code',
      'You confirm with a tap',
      'Parents receive instant notification',
    ],
    ctaLabel: 'Set up safe pickup',
    ctaHref: '/ecd/pickup',
    quote: '"Before I sometimes let people through because conflict is hard. Now I say, the system says no."',
    quoteAuthor: 'Mama Lindiwe, Katlehong',
  },
  {
    id: 'parents',
    color: '#047857',
    bg: '#F0FDF4',
    accent: '#A7F3D0',
    title: 'Invite parents — show them what you are doing',
    solution:
      'Parents can see attendance, daily notes, and upload documents. They feel involved without you needing extra phone calls.',
    pain:
      'They drop their child, pick them up, and still do not know what happened. Communication waits until there is a problem.',
    steps: [
      'Share your centre link with parents',
      'They register on the app',
      'They apply for a space',
      'Enrolled parents see updates and notes',
      'Documents upload directly — no more WhatsApp images',
    ],
    ctaLabel: 'Get your share link',
    ctaHref: '/ecd/profile',
    quote: '"Parents started thanking me just for keeping them updated. That had never happened before."',
    quoteAuthor: 'Auntie Grace, Mamelodi',
  },
  {
    id: 'staff',
    color: '#9D174D',
    bg: '#FFF1F2',
    accent: '#FECDD3',
    title: 'Your staff — let them help without giving away control',
    solution:
      'Invite teachers, pick a role, and they get their own login. They can mark attendance and check pickup without seeing your billing.',
    pain:
      'You are not everywhere. Someone needs to mark attendance or check pickup while you are in a meeting.',
    steps: [
      'Go to centre settings',
      'Click invite staff',
      'Enter email and pick a role',
      'They receive a secure invite',
      'They work without touching your financials',
    ],
    ctaLabel: 'Invite your staff',
    ctaHref: '/ecd/staff',
    quote: '"My teacher now has her own login. I know she can handle things while I am away."',
    quoteAuthor: 'Mama Ntombi, Soweto',
  },
]

const timeline = [
  { label: 'Create your account', detail: 'Finish sign-up, confirm email, and pick a password.' },
  { label: 'Open the welcome pack', detail: 'Tap the CTA and walk through the animated scenarios.' },
  { label: 'Visit your starter page', detail: 'Head to the website/setup screen and start importing children.' },
]

const tips = [
  'Add CentreConnect to your home screen — no download required.',
  'Start with five children from your register; add the rest once you feel the pace.',
  'Print the Safe Pickup QR poster and pin it by the gate.',
  'Upload a great centre photo; parents choose with their eyes first.',
]

type Scenario = (typeof scenarios)[number]

function ScenarioModal({ scenario, onClose }: { scenario: Scenario; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-2xl rounded-[28px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="rounded-t-[28px] p-8" style={{ background: scenario.color }}>
          <div className="flex items-start justify-between">
            <p className="text-4xl text-white">•</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/20 px-3 py-1 text-xl text-white"
            >
              ✕
            </button>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white">{scenario.title}</h2>
        </div>
        <div className="space-y-6 px-8 py-10">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">You know this situation...</p>
            <p className="mt-2 text-base text-slate-700">{scenario.pain}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Here&apos;s how it works now</p>
            <p className="mt-2 text-base text-slate-700">{scenario.solution}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Step by step</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {scenario.steps.map((step, index) => (
                <p key={step} className="flex items-start gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  {step}
                </p>
              ))}
            </div>
          </div>
          <blockquote className="rounded-2xl border-l-4 border-slate-200 bg-slate-50 p-4 text-sm italic text-slate-700">
            <p>{scenario.quote}</p>
            <footer className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{scenario.quoteAuthor}</footer>
          </blockquote>
          <Button asChild className="block rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            <Link href={scenario.ctaHref}>{scenario.ctaLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function CentreConnectWelcomePack() {
  const [active, setActive] = useState<Scenario | null>(null)
  const timelineSteps = useMemo(() => timeline, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7FAFC] via-white to-[#EFF6FF] px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-10 rounded-[32px] bg-white p-8 shadow-[0_25px_60px_rgba(15,23,42,0.12)]">
        <header className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <BrandMark compact className="h-12 w-auto" />
            <span className="hidden text-xs font-black uppercase tracking-[0.5em] text-slate-400 sm:inline">Early Childhood Development</span>
          </div>
      <p className="text-base text-slate-600">This is your living welcome pack. Tap any card, read the story, and follow the CTA to start the right page.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="rounded-full bg-[#14B8A6] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#0ea5a0]/40 transition hover:-translate-y-0.5">
              <Link href="/ecd/profile">Launch your starter page</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-[#14B8A6] px-5 py-2 text-sm font-semibold text-[#0D1F3C] transition hover:border-[#0ea5a0]">
              <Link href="https://centerconnect.co.za/CentreConnect_Pilot_Welcome_FINAL.html">Open the welcome pack</Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {timelineSteps.map((item) => (
            <Card key={item.label} className="rounded-2xl border-slate-100 bg-[#F8FAFC] p-0 shadow-sm">
              <CardContent className="space-y-2 p-5 text-center">
                <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">{item.label}</p>
                <p className="text-sm text-slate-600">{item.detail}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setActive(scenario)}
                className="group flex min-h-[220px] flex-col gap-3 rounded-2xl border-2 p-5 text-left transition hover:-translate-y-1 hover:shadow-2xl"
                style={{ background: scenario.bg, borderColor: scenario.accent }}
              >
                <span className="text-3xl" aria-hidden>
                  •
                </span>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-600">{scenario.id}</p>
                  <h3 className="text-xl font-bold" style={{ color: scenario.color }}>
                    {scenario.title}
                  </h3>
                  <p className="text-sm text-slate-600">{scenario.pain}</p>
                </div>
                <span className="text-sm font-semibold text-slate-900">Tap to explore →</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Quick tips</p>
          <div className="grid gap-4 md:grid-cols-2">
            {tips.map((tip) => (
              <Card key={tip} className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-600 shadow-sm">
                <CardContent>{tip}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        <footer className="space-y-4 border-t border-slate-100 pt-6 text-center">
          <p className="text-sm text-slate-500">Need help? WhatsApp +27 68 535 6430 — real humans answer in minutes.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="rounded-full bg-[#0D9488] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#0d9488]/40">
              <Link href="/ecd/dashboard">Open my dashboard</Link>
            </Button>
            <Button asChild variant="ghost" className="rounded-full border border-[#0D1F3C] px-5 py-2 text-sm font-semibold text-[#0D1F3C]">
              <Link href="https://centerconnect.co.za/website">Visit the website setup page</Link>
            </Button>
          </div>
        </footer>
      </div>
      {active && <ScenarioModal scenario={active} onClose={() => setActive(null)} />}
    </div>
  )
}
