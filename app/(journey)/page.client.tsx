'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PwaInstallCard } from '@/components/pwa/pwa-install-card'
import { formatDate, getJohannesburgGreeting } from '@/lib/utils'

type HomeClientPageProps = {
  userEmail: string | null
  role: 'platform_admin' | 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | 'parent_user' | null
  parentItems: Array<{
    id: string
    centreName: string
    childName: string
    status: string
  }>
  jobOpportunities: Array<{
    id: string
    title: string
    roleType: string
    closesAt: string | null
    centreName: string
    centreSlug: string | null
    suburb: string | null
    city: string | null
  }>
  shortlistCentres: Array<{
    id: string
    name: string
    slug: string
    suburb: string | null
    city: string | null
    tagline: string | null
    latitude: number | null
    longitude: number | null
  }>
}

export default function HomeClientPage({ userEmail, jobOpportunities, shortlistCentres }: HomeClientPageProps) {
  const isSignedIn = Boolean(userEmail)
  const [, setTimeGreeting] = useState(getJohannesburgGreeting())
  const activeJobs = jobOpportunities.slice(0, 6)

  // Use first centre's suburb as location hint if available, else Alexandra.
  const locationHint = shortlistCentres.length > 0 && shortlistCentres[0].suburb ? shortlistCentres[0].suburb : 'Alexandra'

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeGreeting(getJohannesburgGreeting())
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen snap-y snap-mandatory overflow-x-hidden bg-slate-50 overscroll-none selection:bg-cyan-100 selection:text-cyan-900">
      <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 pb-[calc(env(safe-area-inset-bottom)+4rem)] sm:px-6 lg:px-8">
        <div className="space-y-16 sm:space-y-24 lg:space-y-32">
          {/* SECTION 2 - Premium Hero */}
          <section className="relative snap-start overflow-hidden rounded-[3rem] bg-slate-900 px-6 py-12 sm:px-12 sm:py-20 lg:px-20 lg:py-32 shadow-[0_30px_100px_rgba(0,0,0,0.25)]">
            {/* Ambient Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950" />
            <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
            <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-teal-500/10 blur-[100px]" />
            <div className="absolute inset-0 opacity-[0.03] [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" 
                 style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="relative z-10 max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 mb-8 border border-white/10 backdrop-blur-md">
                <Sparkles className="h-3 w-3" />
                Launching in Johannesburg
              </div>
              
              <h2 className="font-display text-4xl font-black leading-[1.02] tracking-tighter text-white sm:text-6xl lg:text-8xl">
                Find the right creche,<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">minus the chaos.</span>
              </h2>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl font-medium">
                We help parents find trusted local centres, manage every document, and follow applications in one calm place. No more WhatsApp chasing or paper pile-ups.
              </p>

              <div className="mt-10 flex flex-wrap gap-4 sm:mt-14">
                <Button size="lg" className="h-16 rounded-[1.5rem] bg-cyan-500 px-10 text-base font-black text-slate-950 hover:bg-cyan-400 shadow-[0_20px_50px_rgba(6,182,212,0.3)] transition-transform active:scale-95" asChild>
                  <Link href="/directory">Browse Local Creches</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-16 rounded-[1.5rem] border-white/20 bg-white/5 px-8 text-base font-bold text-white hover:bg-white/10 backdrop-blur-sm transition-transform active:scale-95" asChild>
                  <Link href="/for-centres">I Run a Centre &rarr;</Link>
                </Button>
              </div>

              <div className="mt-12 grid grid-cols-2 gap-8 border-t border-white/10 pt-10 sm:mt-20 sm:grid-cols-3 sm:gap-12">
                <div className="space-y-1">
                  <p className="font-display text-4xl font-black text-white tracking-tighter">Verified</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Trusted Listings</p>
                </div>
                <div className="space-y-1">
                  <p className="font-display text-4xl font-black text-white tracking-tighter">{locationHint}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pilot Area</p>
                </div>
                <div className="hidden sm:block space-y-1">
                  <p className="font-display text-4xl font-black text-white tracking-tighter">R0.00</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Free for Parents</p>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3 - Parent journey strip */}
          <section className="snap-start px-2">
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  title: 'Search your area',
                  body: 'See trusted centres with real feedback, verified safety standards, and available spaces near you.',
                },
                {
                  title: 'Apply digitally',
                  body: 'Create one parent profile, upload your documents securely, and apply to any centre with a single tap.',
                },
                {
                  title: 'Stay informed',
                  body: 'Get instant updates on your phone the moment a centre replies, so you always know your child&apos;s status.',
                },
              ].map((step, index) => (
                <article key={step.title} className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_10px_40px_rgb(0,0,0,0.03)] transition-transform hover:translate-y-[-4px]">
                  <div className="h-14 w-14 rounded-2xl bg-cyan-50 flex items-center justify-center mb-6">
                    <span className="font-display text-3xl font-black text-cyan-600">{index + 1}</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">{step.title}</p>
                  <p className="mt-3 text-base font-medium text-slate-500 leading-relaxed">{step.body}</p>
                </article>
              ))}
            </div>
          </section>

          {/* SECTION 4 - Safety feature callout */}
          <section className="snap-start overflow-hidden rounded-[3rem] bg-gradient-to-br from-slate-900 to-teal-950 px-6 py-16 text-white sm:px-12 sm:py-24 lg:px-20 lg:py-32 shadow-2xl">
            <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 mb-6 border border-emerald-500/20">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Premium Safety Features
                </div>
                <h3 className="font-display text-4xl font-black tracking-tight sm:text-5xl lg:text-7xl leading-[1.05]">
                  Sleep better knowing they are safe.
                </h3>
                <p className="mt-8 text-lg leading-relaxed text-slate-300 sm:text-xl font-medium max-w-lg">
                  Secure pickup codes, instant gate alerts, and digital check-ins keep strangers out and your mind focused on your work day.
                </p>
                <div className="mt-10 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-200 uppercase tracking-widest">Verified by CentreConnect</p>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[360px] rounded-[3rem] border-[12px] border-slate-800 bg-slate-950 p-6 shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
                <div className="mx-auto mb-8 h-1.5 w-16 rounded-full bg-slate-800" />
                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-1">Gate Protocol</p>
                    <p className="text-base font-black text-white">Safe Child Pickup</p>
                  </div>
                  <div className="flex justify-center py-8">
                    <div className="flex gap-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex h-14 w-12 items-center justify-center rounded-2xl border-2 border-cyan-500/30 bg-cyan-500/5 text-2xl font-black text-cyan-400 shadow-inner">
                          {i === 1 ? '8' : i === 2 ? '4' : '•'}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                    <p className="text-xs font-black text-emerald-300 uppercase tracking-widest">Identity Verified</p>
                  </div>
                  <div className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-500 text-sm font-black text-slate-950 shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-transform">
                    Confirm Release
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="snap-start px-2">
            <PwaInstallCard />
          </section>

          {/* Call to Action Banner */}
          <section className="snap-start rounded-[3rem] border border-cyan-100 bg-white p-8 sm:p-12 lg:p-20 shadow-[0_20px_60px_rgba(6,182,212,0.08)] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 to-teal-500" />
            <div className="relative z-10 max-w-3xl mx-auto space-y-8">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-600">Start Your Journey Today</p>
              <h3 className="text-4xl font-black text-slate-900 sm:text-5xl lg:text-6xl tracking-tighter leading-tight">
                Don&apos;t wait to secure your child&apos;s seat for 2026.
              </h3>
              <p className="text-lg font-medium text-slate-500 max-w-xl mx-auto">
                Create your free parent profile today. One profile covers every application, message, and school update in one calm place.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="h-16 rounded-2xl bg-cyan-600 px-10 text-base font-black text-white hover:bg-cyan-700 shadow-xl shadow-cyan-900/20 transition-all active:scale-95" asChild>
                  <Link href="/register">Create My Parent Profile</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-16 rounded-2xl border-2 border-slate-100 bg-white px-10 text-base font-black text-slate-700 hover:bg-slate-50 transition-all active:scale-95" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* SECTION 4.5 - Family value */}
          <section className="snap-start py-12 px-2">
            <div className="mx-auto mb-20 max-w-3xl text-center space-y-4">
              <h3 className="font-display text-4xl font-black text-slate-900 sm:text-5xl lg:text-6xl tracking-tight">Parenting is hard enough.</h3>
              <p className="text-xl font-medium text-slate-500 leading-relaxed">CentreConnect keeps your school days feeling human, organized, and ahead of the next big morning.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  title: 'Find trusted neighbours',
                  body: 'See only reviewed, verified, and community-trusted ECD centres within your reach.',
                },
                {
                  title: 'Apply once, enroll anywhere',
                  body: 'Securely upload your documents once and apply to multiple centres without duplicating paperwork.',
                },
                {
                  title: 'Updates in real-time',
                  body: 'Receive instant notifications when a centre replies, asks for a chat, or offers your child a spot.',
                },
              ].map((t, i) => (
                <div key={i} className="rounded-[2.5rem] border border-slate-50 bg-slate-50/50 p-10 transition-colors hover:bg-white hover:shadow-xl group">
                  <div className="mb-8 h-1 w-16 rounded-full bg-cyan-200 transition-all group-hover:w-24 group-hover:bg-cyan-500" />
                  <p className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{t.title}</p>
                  <p className="mt-4 text-base font-medium text-slate-500 leading-relaxed">{t.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 4.6 - FAQ */}
          <section className="snap-start py-12 px-2">
            <div className="mx-auto max-w-4xl">
              <div className="mb-16 text-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Common Questions</p>
                <h3 className="font-display text-4xl font-black text-slate-900">Everything you need to know.</h3>
              </div>
              <div className="grid gap-4">
                {[
                  {
                    q: 'Is CentreConnect really free for parents?',
                    a: 'Yes. Searching, applying, and tracking updates is 100% free for all families. Our goal is to make quality education more accessible.',
                  },
                  {
                    q: 'How do you verify these centres?',
                    a: 'Every centre on our platform is either government-registered or actively working with us to improve their safety and educational standards.',
                  },
                  {
                    q: 'Can I apply to more than one creche?',
                    a: 'Absolutely. Your parent profile works for every child and every application, so you never have to fill in the same form twice.',
                  },
                  {
                    q: 'Will it work on my phone?',
                    a: 'Yes. We designed CentreConnect specifically for budget Android devices and limited data connections. It is fast, light, and reliable.',
                  },
                ].map((faq, i) => (
                  <div key={i} className="rounded-[2rem] border-2 border-slate-100 bg-white p-8 transition-all hover:border-cyan-200 hover:shadow-lg group">
                    <h4 className="mb-3 text-xl font-black text-slate-900 group-hover:text-cyan-700 transition-colors tracking-tight">{faq.q}</h4>
                    <p className="text-base font-medium text-slate-500 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 5 - For ECD Owners */}
          <section className="snap-start rounded-[3.5rem] bg-slate-900 p-8 sm:p-16 lg:p-24 text-white relative overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.3)]">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-800 to-slate-950 opacity-90" />
            <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px]" />
            
            <div className="relative z-10 max-w-4xl">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-6">Professional ECD Management</p>
              <h3 className="font-display text-4xl font-black tracking-tighter sm:text-6xl lg:text-7xl leading-[1.02]">
                Built for South African centres.<br/>
                <span className="text-teal-400">Starting in Alexandra.</span>
              </h3>
              <p className="mt-8 text-xl leading-relaxed text-slate-300 font-medium max-w-2xl">
                Not imported. Built from scratch for how creches actually work here. Manage your entire operation—from admissions to DSD compliance—from one secure screen.
              </p>
              
              <div className="mt-12 grid grid-cols-2 gap-x-12 gap-y-6 sm:grid-cols-3">
                {[
                  'Digital Admissions', 
                  'DSD Subsidy Export', 
                  'Attendance Roster',
                  'Secure Transport', 
                  'Parent Marketplace', 
                  'Daily Learner Reports'
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                    <span className="text-base font-bold text-slate-200">{feat}</span>
                  </div>
                ))}
              </div>
              
              <Button size="lg" className="mt-12 h-16 rounded-2xl bg-white px-10 text-base font-black text-slate-950 hover:bg-cyan-50 shadow-2xl transition-transform active:scale-95" asChild>
                <Link href="/for-centres">Register Your Centre &rarr;</Link>
              </Button>
            </div>
          </section>

          {/* SECTION 6 - Jobs strip */}
          <section id="active-jobs" className="rounded-[3rem] border border-slate-100 bg-white p-8 sm:p-12 lg:p-16 shadow-[0_15px_50px_rgba(0,0,0,0.02)]">
            <div className="space-y-6 max-w-3xl mb-12">
              <div className="flex flex-wrap items-center gap-4">
                <h3 className="font-display text-3xl font-black text-slate-900 sm:text-4xl tracking-tight">Work in Education</h3>
                <span className="rounded-full bg-cyan-100 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-800 border border-cyan-200">
                  {activeJobs.length} Roles Open
                </span>
              </div>
              <p className="text-lg font-medium text-slate-500 leading-relaxed">
                Find paid shifts at centres that respect your time and value child safety. Join a team where trust and transparency come first.
              </p>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2">
              {activeJobs.length === 0 ? (
                <div className="rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/50 p-12 sm:col-span-2 text-center">
                  <p className="text-lg font-bold text-slate-400">New opportunities are coming soon.</p>
                  <p className="mt-1 text-sm font-medium text-slate-400 uppercase tracking-widest">Check back next week.</p>
                </div>
              ) : (
                activeJobs.map((job) => {
                  const jobHref = job.centreSlug ? `/c/${job.centreSlug}/jobs/${job.id}` : `/c/centre/jobs/${job.id}`
                  const location = [job.suburb, job.city].filter(Boolean).join(', ')

                  return (
                    <Link
                      key={job.id}
                      href={jobHref}
                      className="group flex flex-col justify-between rounded-[2.5rem] border-2 border-slate-50 bg-white p-8 shadow-sm transition-all hover:border-cyan-200 hover:shadow-xl hover:translate-y-[-2px]"
                    >
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div>
                          <p className="text-2xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-cyan-700 transition-colors">{job.title}</p>
                          <p className="mt-2 text-base font-bold text-slate-400">{job.centreName}</p>
                        </div>
                        <div className="rounded-xl bg-slate-900 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.25em] text-white shadow-lg shadow-slate-900/20">
                          Sponsored
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm font-black text-slate-500 uppercase tracking-wide">
                        <MapPin className="h-4 w-4 text-cyan-500" />
                        {location || 'Johannesburg'}
                      </div>

                      <div className="mt-8 flex items-center justify-between border-t border-slate-50 pt-6">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">Closing Date</p>
                          <p className="text-sm font-bold text-slate-900">{job.closesAt ? formatDate(job.closesAt) : 'Rolling'}</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white transition-transform group-hover:scale-110 shadow-lg">
                          <ArrowRight className="h-5 w-5" />
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
