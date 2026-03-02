import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/layout/AppHeader'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'For ECD - CentreConnect',
  description: 'Discover ECDs on CentreConnect and register your own centre workspace.',
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
    <main className="min-h-screen bg-white text-slate-900">
      <AppHeader
        links={[
          { href: '#listed-ecds', label: 'Listed ECDs' },
          { href: '/ecd/login', label: 'ECD Login' },
        ]}
        cta={{ href: '/for-centres/register', label: 'Register Your ECD (Wizard)' }}
      />

      <Section className="py-16 md:py-24 text-center">
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl md:text-6xl max-w-4xl mx-auto">
          Run a Better ECD Centre. Starting Today.
        </h1>
        <p className="mt-4 max-w-3xl mx-auto text-lg text-slate-600 sm:text-xl">
          CentreConnect gives ECD owners the tools to manage admissions, communicate with parents,
          track development, and grow — all in one place.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-[var(--shadow-elevation-3)]">
            <Link href="/for-centres/register">Register Your ECD &rarr;</Link>
          </Button>
          <Button variant="outline" asChild size="lg" className="border-slate-300 text-slate-700 hover:bg-slate-100">
            <Link href="#value-props">See how it works &darr;</Link>
          </Button>
        </div>
      </Section>

      <Section id="value-props" className="bg-gradient-to-br from-blue-50 to-indigo-50 py-16 md:py-24">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose CentreConnect?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-16 h-16 text-indigo-600 mx-auto">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <h3 className="text-xl font-semibold">Fill your centre faster</h3>
            <p className="text-slate-600">Parents apply online. You review, shortlist, and enrol — all from one dashboard. No paperwork, no WhatsApp threads.</p>
          </div>
          <div className="space-y-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-16 h-16 text-green-600 mx-auto">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <h3 className="text-xl font-semibold">Stay compliant effortlessly</h3>
            <p className="text-slate-600">Track DSD registration, upload documents, and generate compliance reports. Stay audit-ready without the stress.</p>
          </div>
          <div className="space-y-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-16 h-16 text-purple-600 mx-auto">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            <h3 className="text-xl font-semibold">Look professional</h3>
            <p className="text-slate-600">Your own centre profile page, parent announcements, and a job board — live in minutes, not months.</p>
          </div>
        </div>
      </Section>

      <Section id="pricing" className="py-16 md:py-24 bg-white">
        <h2 className="text-3xl font-bold text-center mb-12">Flexible Pricing for Every Centre</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {/* Pilot Card */}
          <Card className="flex flex-col border-cyan-200 shadow-[var(--shadow-elevation-2)] hover:shadow-[var(--shadow-elevation-3)] transition-shadow duration-300">
            <CardHeader className="bg-cyan-50 border-b border-cyan-100 py-6 text-center">
              <h3 className="text-2xl font-bold text-cyan-700">Pilot</h3>
              <p className="mt-2 text-4xl font-extrabold text-slate-900">R0<span className="text-lg font-medium text-slate-600"> trial</span></p>
            </CardHeader>
            <CardContent className="flex-1 p-6 space-y-4">
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Start immediately</li>
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>No card details required</li>
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Manual onboarding support</li>
              </ul>
              <Button asChild className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
                <Link href="/for-centres/register?plan=pilot">Start Pilot</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Basic Card */}
          <Card className="flex flex-col border-slate-200 shadow-[var(--shadow-elevation-2)] hover:shadow-[var(--shadow-elevation-3)] transition-shadow duration-300">
            <CardHeader className="bg-slate-50 border-b border-slate-200 py-6 text-center">
              <h3 className="text-2xl font-bold text-indigo-600">Basic</h3>
              <p className="mt-2 text-4xl font-extrabold text-slate-900">R199<span className="text-lg font-medium text-slate-600">/month</span></p>
            </CardHeader>
            <CardContent className="flex-1 p-6 space-y-4">
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Centre Profile Page</li>
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Parent Communication</li>
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Basic Reporting</li>
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Dedicated Support</li>
              </ul>
              <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                <Link href="/for-centres/register?plan=basic">Start with Basic</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Standard Card (Most Popular) */}
          <Card className="relative flex flex-col border-2 border-indigo-500 shadow-[var(--shadow-elevation-4)]">
            <div className="absolute -top-3 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Most Popular</div>
            <CardHeader className="bg-indigo-600 py-6 text-center">
              <h3 className="text-2xl font-bold text-white">Standard</h3>
              <p className="mt-2 text-4xl font-extrabold text-white">R299<span className="text-lg font-medium text-indigo-200">/month</span></p>
            </CardHeader>
            <CardContent className="flex-1 p-6 space-y-4">
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>All Basic Features</li>
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Advanced Admissions</li>
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Child Development Tracking</li>
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Event Management</li>
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Customizable Forms</li>
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Attendance Tracking</li>
              </ul>
              <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                <Link href="/for-centres/register?plan=standard">Start with Standard</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Premium Card */}
          <Card className="flex flex-col border-slate-200 shadow-[var(--shadow-elevation-2)] hover:shadow-[var(--shadow-elevation-3)] transition-shadow duration-300">
            <CardHeader className="bg-slate-50 border-b border-slate-200 py-6 text-center">
              <h3 className="text-2xl font-bold text-teal-600">Premium</h3>
              <p className="mt-2 text-4xl font-extrabold text-slate-900">R499<span className="text-lg font-medium text-slate-600">/month</span></p>
            </CardHeader>
            <CardContent className="flex-1 p-6 space-y-4">
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>All Standard Features</li>
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Integrated Website Builder</li>
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Transport Management</li>
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Custom Reporting & Analytics</li>
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Priority Support Channel</li>
                <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>API Access</li>
              </ul>
              <Button asChild className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                <Link href="/for-centres/register?plan=premium">Start with Premium</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section id="listed-ecds" className="border-y border-slate-200 bg-slate-50" containerClassName="cc-section">
        <h2 className="text-3xl font-bold text-center mb-12">Already on CentreConnect</h2>
        <p className="text-center text-slate-600 mb-8">{centres.length} centres listed</p>

        {centres.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-5 text-sm text-slate-600">No active centres listed yet.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {centres.map((centre) => (
              <Card key={centre.id} className="border-slate-200">
                <CardContent className="space-y-3 p-5">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{centre.name}</p>
                    <p className="text-sm text-slate-600">
                      {centre.suburb}, {centre.city}
                    </p>
                  </div>
                  {centre.tagline ? <p className="text-sm text-slate-700">{centre.tagline}</p> : null}
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        centre.is_registered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {centre.is_registered ? 'Registered' : 'Listed'}
                    </span>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/centre/${centre.slug}`}>View profile</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section className="bg-gradient-to-br from-cyan-600 to-indigo-700 py-16 md:py-24 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to join them?</h2>
        <p className="text-lg mb-8">Register your ECD in 10 minutes and unlock your centre&apos;s full potential.</p>
        <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-slate-100 shadow-[var(--shadow-elevation-3)]">
          <Link href="/for-centres/register">Register Your ECD &rarr;</Link>
        </Button>
      </Section>

      <section className="py-16 bg-gradient-to-r from-cyan-600 to-blue-700 text-white text-center px-4">
        <h2 className="text-3xl font-bold mb-3">
          Ready to grow your centre?
        </h2>
        <p className="text-cyan-100 mb-8 max-w-xl mx-auto text-lg">
          Join centres across South Africa already on CentreConnect.
          Registration takes 10 minutes.
        </p>
        <a
          href="/for-centres/register"
          className="inline-block bg-white text-cyan-700 font-bold px-8 py-4 rounded-xl hover:bg-cyan-50 transition-colors shadow-[var(--shadow-elevation-3)] text-lg"
        >
          Register Your ECD →
        </a>
      </section>
    </main>
  )
}


