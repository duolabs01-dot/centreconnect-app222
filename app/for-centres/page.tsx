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
  key: 'starter' | 'growth' | 'pro'
  title: string
  price: string
  cadence: string
  description: string
  bestFor: string
  features: string[]
  outcomes: string[]
  packageIncludes: string[]
  cta: string
  highlighted?: boolean
}

const plans: Plan[] = [
  {
    key: 'starter',
    title: 'Starter',
    price: 'R199',
    cadence: '/month',
    description: 'Best for centres that want to fill open spaces quickly.',
    bestFor: 'Community and small centres starting digital admissions.',
    features: [
      'Get listed where parents are searching',
      'Accept online applications in one inbox',
      'Send announcements and direct parent messages',
    ],
    outcomes: [
      'Reduce missed parent leads with one admissions inbox',
      'Respond to applications faster with structured child profiles',
      'Keep parent communication professional and consistent',
    ],
    packageIncludes: [
      'Public centre profile with logo, photos, and contact details',
      'Application pipeline with status tracking',
      'In-app parent notifications and announcement delivery',
      'Basic admissions reporting and support setup',
    ],
    cta: 'Choose Starter',
  },
  {
    key: 'growth',
    title: 'Growth',
    price: 'R299',
    cadence: '/month',
    description: 'For busy centres that need strong daily operations.',
    bestFor: 'Growing centres managing multiple classrooms and higher volume.',
    features: [
      'Everything in Starter',
      'Attendance and calendar in one workflow',
      'Faster follow-up on pending applications',
    ],
    outcomes: [
      'Track attendance daily with less admin overhead',
      'Improve conversion from application to enrollment',
      'Keep parent updates predictable with operational workflows',
    ],
    packageIncludes: [
      'Everything in Starter',
      'Attendance register and classroom routines',
      'Daily reports and pickup workflow foundations',
      'Expanded workflow automations for applications and reminders',
    ],
    cta: 'Choose Growth',
    highlighted: true,
  },
  {
    key: 'pro',
    title: 'Pro',
    price: 'R499',
    cadence: '/month',
    description: 'For centres that want full control and premium support.',
    bestFor: 'Established centres scaling operations and visibility.',
    features: [
      'Everything in Growth',
      'Website and growth tools',
      'Priority support and onboarding help',
    ],
    outcomes: [
      'Run admissions, operations, and website from one system',
      'Present a stronger digital brand to parents discovering your centre',
      'Launch faster with priority onboarding guidance',
    ],
    packageIncludes: [
      'Everything in Growth',
      'Website builder with managed sections and media',
      'Advanced operational configuration and support priority',
      'Growth-focused setup guidance for admissions performance',
    ],
    cta: 'Choose Pro',
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
          { href: '#active-centres', label: 'Active Centres' },
          { href: '/ecd/login', label: 'ECD Login' },
        ]}
        cta={{ href: '/for-centres/register?plan=growth&flow=confirm', label: 'Register Your ECD' }}
      />

      <Section className="py-12 md:py-16 lg:py-20" containerClassName="cc-section">
        <div className="rounded-3xl border border-border bg-card px-6 py-8 shadow-[var(--shadow-elevation-1)] sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-600">For ECD Owners</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Fill your creche faster and get paid on time.
          </h1>
          <p className="mt-4 max-w-3xl text-sm text-slate-600 sm:text-base">
            One simple system for applications, parent communication, attendance, and billing so your team spends less time on admin.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="h-11 rounded-2xl bg-teal-600 px-6 text-sm font-bold text-white hover:bg-teal-700">
              <Link href="/for-centres/register?plan=growth&flow=confirm">Start Your ECD Setup</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-2xl border-border bg-card px-6 text-sm font-semibold">
              <Link href="#pricing">See Plans</Link>
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
          <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Simple plans that grow with your creche</h2>
          <p className="mt-2 text-sm text-slate-600">Choose Starter, Growth, or Pro based on your current stage.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Best For</p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">{plan.bestFor}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Package Includes</p>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {plan.packageIncludes.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Expected Outcomes</p>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {plan.outcomes.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <Button
                  asChild
                  className={`h-11 w-full rounded-2xl text-sm font-bold ${
                    plan.highlighted ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <Link href={`/for-centres/register?plan=${plan.key}&flow=confirm`}>{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Pricing shown is monthly platform subscription pricing per centre. Final onboarding details are confirmed during registration.
        </p>
      </Section>

      <Section id="active-centres" className="py-10 md:py-12" containerClassName="cc-section">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Active centres on CentreConnect</h2>
            <p className="mt-1 text-sm text-slate-600">{centres.length} active centres currently listed</p>
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
                      <Link href={`/c/${centre.slug}`}>View profile</Link>
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
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Ready to fill your creche faster?</h2>
          <p className="mt-2 max-w-2xl text-sm text-teal-50 sm:text-base">
            Register in about 10 minutes. We will help you go live quickly and onboard your team.
          </p>
          <Button asChild className="mt-5 h-11 rounded-2xl bg-white px-6 text-sm font-bold text-teal-700 hover:bg-teal-50">
            <Link href="/for-centres/register?plan=growth&flow=confirm">Register Your ECD</Link>
          </Button>
        </div>
      </Section>
    </main>
  )
}
