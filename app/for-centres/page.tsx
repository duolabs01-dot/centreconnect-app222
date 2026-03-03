import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/layout/AppHeader'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'For ECD Centres - CentreConnect',
  description: 'Grow your creche with modern admissions, parent communication, and operations tools.',
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

type Plan = {
  key: 'pilot' | 'basic' | 'standard' | 'premium'
  title: string
  price: string
  cadence: string
  description: string
  features: string[]
  cta: string
  highlighted?: boolean
}

const plans: Plan[] = [
  {
    key: 'pilot',
    title: 'Pilot',
    price: 'R0',
    cadence: 'trial',
    description: 'Founding-partner onboarding with no card details required.',
    features: ['Start immediately', 'No card details required', 'Manual onboarding support'],
    cta: 'Start Pilot',
  },
  {
    key: 'basic',
    title: 'Basic',
    price: 'R199',
    cadence: '/month',
    description: 'Best for smaller centres that need strong basics.',
    features: ['Centre profile page', 'Parent messages', 'Basic reporting'],
    cta: 'Choose Basic',
  },
  {
    key: 'standard',
    title: 'Standard',
    price: 'R299',
    cadence: '/month',
    description: 'Great for active centres managing steady admissions.',
    features: ['Everything in Basic', 'Advanced admissions', 'Attendance and calendar', 'Daily reports'],
    cta: 'Choose Standard',
    highlighted: true,
  },
  {
    key: 'premium',
    title: 'Premium',
    price: 'R499',
    cadence: '/month',
    description: 'For high-volume centres with bigger operations.',
    features: ['Everything in Standard', 'Website tools', 'Transport workflows', 'Priority support'],
    cta: 'Choose Premium',
  },
]

function statusLabel(isRegistered: boolean) {
  return isRegistered ? 'Registered' : 'Listed'
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

  return (
    <main className="min-h-screen bg-slate-50 text-foreground">
      <AppHeader
        links={[
          { href: '#listed-centres', label: 'Listed Centres' },
          { href: '/ecd/login', label: 'ECD Login' },
        ]}
        cta={{ href: '/for-centres/register', label: 'Register Your ECD' }}
      />

      <Section className="py-12 md:py-16 lg:py-20" containerClassName="cc-section">
        <div className="rounded-3xl border border-border bg-card px-6 py-8 shadow-[var(--shadow-elevation-1)] sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-600">For ECD Owners</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Fill your creche faster and run daily operations from one clean dashboard.
          </h1>
          <p className="mt-4 max-w-3xl text-sm text-slate-600 sm:text-base">
            CentreConnect helps you manage applications, parent communication, compliance and reporting without admin stress.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="h-11 rounded-2xl bg-teal-600 px-6 text-sm font-bold text-white hover:bg-teal-700">
              <Link href="/for-centres/register">Register Your ECD</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-2xl border-border bg-card px-6 text-sm font-semibold">
              <Link href="#pricing">View Plans</Link>
            </Button>
          </div>
        </div>
      </Section>

      <Section id="value" className="py-8 md:py-10" containerClassName="cc-section">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-elevation-1)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Admissions that move</CardTitle>
              <CardDescription>Review, respond, and enroll from one place.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Parents apply online and your team sees a clear pipeline instead of scattered messages.
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-elevation-1)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Professional communication</CardTitle>
              <CardDescription>Simple updates, announcements, and reminders.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Keep parents informed with consistent messages that build trust and reduce back-and-forth.
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-elevation-1)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Compliance visibility</CardTitle>
              <CardDescription>Track key documents and team readiness.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Stay audit-ready with one view for requirements, expiries, and outstanding actions.
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section id="pricing" className="py-10 md:py-12" containerClassName="cc-section">
        <div className="mb-6">
          <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Simple monthly plans</h2>
          <p className="mt-2 text-sm text-slate-600">Start with Pilot and upgrade when you are ready.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <Card
              key={plan.key}
              className={`rounded-3xl border bg-card shadow-[var(--shadow-elevation-1)] ${
                plan.highlighted ? 'border-teal-300 ring-1 ring-teal-200' : 'border-border'
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-black">{plan.title}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-black text-foreground">{plan.price}</p>
                  <p className="text-xs text-slate-500">{plan.cadence}</p>
                </div>
                <ul className="space-y-1.5 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature}>- {feature}</li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={`h-11 w-full rounded-2xl text-sm font-bold ${
                    plan.highlighted ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <Link href={`/for-centres/register?plan=${plan.key}`}>{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="listed-centres" className="py-10 md:py-12" containerClassName="cc-section">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Centres already on CentreConnect</h2>
            <p className="mt-1 text-sm text-slate-600">{centres.length} centres currently listed</p>
          </div>
        </div>

        {centres.length === 0 ? (
          <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-elevation-1)]">
            <CardContent className="p-6 text-sm text-slate-600">No active centres listed yet.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {centres.map((centre) => (
              <Card key={centre.id} className="rounded-3xl border-border bg-card shadow-[var(--shadow-elevation-1)]">
                <CardContent className="space-y-3 p-5">
                  <div>
                    <p className="text-base font-bold text-foreground">{centre.name}</p>
                    <p className="text-sm text-slate-600">
                      {centre.suburb}, {centre.city}
                    </p>
                  </div>
                  {centre.tagline ? <p className="text-sm text-slate-600">{centre.tagline}</p> : null}
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-border bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {statusLabel(centre.is_registered)}
                    </span>
                    <Button variant="outline" size="sm" asChild className="h-9 rounded-2xl border-border bg-card px-3 text-xs font-semibold">
                      <Link href={`/centre/${centre.slug}`}>View profile</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section className="py-12 md:py-16" containerClassName="cc-section">
        <div className="rounded-3xl border border-teal-200 bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-8 text-white shadow-[var(--shadow-elevation-2)] sm:px-8 sm:py-10 lg:px-12">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Ready to register your centre?</h2>
          <p className="mt-2 max-w-2xl text-sm text-teal-50 sm:text-base">
            Complete the registration wizard in about 10 minutes and we will help you get live quickly.
          </p>
          <Button asChild className="mt-5 h-11 rounded-2xl bg-white px-6 text-sm font-bold text-teal-700 hover:bg-teal-50">
            <Link href="/for-centres/register">Register Your ECD</Link>
          </Button>
        </div>
      </Section>
    </main>
  )
}
