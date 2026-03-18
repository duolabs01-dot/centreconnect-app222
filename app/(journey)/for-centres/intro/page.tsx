import type { Metadata } from 'next'
import Image from 'next/image'
import { Container } from '@/components/layout/container'
import { CentreDiscoveryFlow } from '@/components/ecd/CentreDiscoveryFlow'
import { 
  CheckCircle2, 
  HeartHandshake, 
  ShieldCheck, 
  Smartphone, 
  Zap,
  MessageCircle,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import '../../../ecd/ecd-theme.css'

export const metadata: Metadata = {
  title: 'Grow Your Creche - CentreConnect',
  description: 'How CentreConnect helps South African ECD centres manage admissions, safety, and compliance.',
}

export default function CentreIntroPage() {
  return (
    <main className="min-h-screen ecd-premium-shell pb-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 px-6 py-16 text-white sm:py-24 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 opacity-90" />
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px]" />
        
        <Container className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 mb-3 border border-white/10 backdrop-blur-md">
            For ECD Owners & Principals
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200 mb-8 border border-amber-200/30 backdrop-blur-md">
            Pilot offer: Onboarding fee waived + first month free until end of April 2026
          </div>
          <h1 className="mx-auto max-w-4xl font-display text-4xl font-black leading-[1.05] tracking-tighter sm:text-6xl lg:text-7xl">
            Stop running your creche on WhatsApp and paper.
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg font-medium text-slate-300 sm:text-xl leading-relaxed">
            Every morning: chase parents for fees. Chase teachers for registers. Chase yourself for time. CentreConnect was built by someone who watched this happen in Alexandra — and decided to fix it.
          </p>
        </Container>
      </section>

      <Container className="-mt-12 relative z-20">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Content Side */}
          <div className="space-y-8">
            <div className="rounded-[2.5rem] bg-white p-8 shadow-xl border border-slate-50">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6">What changes in the first week</h2>
              
              <div className="space-y-6">
                {[
                  {
                    title: "Parents applying by WhatsApp? Done.",
                    desc: "Parents apply online and upload their docs directly. You see everything in one clean office view.",
                    icon: MessageCircle,
                    color: "text-cyan-600",
                    bg: "bg-cyan-50"
                  },
                  {
                    title: "Chasing attendance registers?",
                    desc: "Mark who's in from your phone. No paper. No catch-up.",
                    icon: ShieldCheck,
                    color: "text-emerald-600",
                    bg: "bg-emerald-50"
                  },
                  {
                    title: "Applications buried in your inbox?",
                    desc: "Every new application goes to one place. You decide. Parents get notified automatically.",
                    icon: Zap,
                    color: "text-amber-600",
                    bg: "bg-amber-50"
                  }
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0", item.bg)}>
                      <item.icon className={cn("h-6 w-6", item.color)} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 leading-tight">{item.title}</h3>
                      <p className="mt-1 text-sm font-medium text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2.5rem] bg-gradient-to-br from-cyan-600 to-teal-600 p-8 text-white shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/founder-mandlenkosi.jpeg"
                  alt="Mandlenkosi"
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full border-2 border-white/30 object-cover"
                />
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-cyan-100">A note from Mandla</p>
                  <p className="text-xs font-bold text-cyan-50 opacity-80">Founder, CentreConnect</p>
                </div>
              </div>
              <p className="text-lg font-medium leading-relaxed italic">
                &quot;We didn&apos;t build this for big fancy schools. We built it for the principals and MaGogos who show up every day for our children. I will personally help you set up your centre on WhatsApp.&quot;
              </p>
            </div>
          </div>

          {/* Discovery Flow Side */}
          <div id="discovery" className="rounded-[3rem] bg-white p-2 shadow-2xl border border-white">
            <div className="h-full rounded-[2.8rem] bg-slate-50/50 border border-slate-100/50 p-6 sm:p-10">
              <CentreDiscoveryFlow />
            </div>
          </div>
        </div>
      </Container>

      {/* Parent Guard Section */}
      <Container className="mt-20">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Wait, are you a parent?</p>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Looking for a creche for your child?</h3>
          <p className="text-sm text-slate-500">
            This page is for school owners. If you want to find and apply to a creche near you, please visit our Parent Discover page.
          </p>
          <Link 
            href="/directory"
            className="inline-flex items-center gap-2 text-cyan-600 font-black text-sm uppercase tracking-widest hover:text-cyan-700"
          >
            Go to Parent Search <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    </main>
  )
}

