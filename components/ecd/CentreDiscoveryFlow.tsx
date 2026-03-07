'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  BookOpen, 
  ShieldCheck, 
  Zap, 
  MessageCircle, 
  ArrowRight, 
  CheckCircle2,
  Phone,
  Smartphone,
  X,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type DiscoveryStep = 'welcome' | 'size' | 'registers' | 'dsd' | 'headache' | 'help' | 'result'

type DiscoveryData = {
  size: string
  usesPaper: boolean | null
  isDsd: boolean | null
  headache: string
  wantsPersonalHelp: boolean | null
}

const STEPS: DiscoveryStep[] = ['welcome', 'size', 'registers', 'dsd', 'headache', 'help', 'result']

export function CentreDiscoveryFlow() {
  const [step, setStep] = useState<DiscoveryStep>('welcome')
  const [data, setData] = useState<DiscoveryData>({
    size: '',
    usesPaper: null,
    isDsd: null,
    headache: '',
    wantsPersonalHelp: null,
  })

  const next = () => {
    const currentIndex = STEPS.indexOf(step)
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1])
    }
  }

  const back = () => {
    const currentIndex = STEPS.indexOf(step)
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1])
    }
  }

  const selectSize = (size: string) => {
    setData({ ...data, size })
    next()
  }

  const selectRegisters = (usesPaper: boolean) => {
    setData({ ...data, usesPaper })
    next()
  }

  const selectDsd = (isDsd: boolean) => {
    setData({ ...data, isDsd })
    next()
  }

  const selectHeadache = (headache: string) => {
    setData({ ...data, headache })
    next()
  }

  const selectHelp = (wantsPersonalHelp: boolean) => {
    setData({ ...data, wantsPersonalHelp })
    next()
  }

  // Logic to determine recommended package
  const getRecommendation = () => {
    if (data.size === '50+' || data.isDsd) return {
      name: 'Platinum Founding Package',
      price: 'R299',
      reason: 'Because you have a big centre and need help with DSD government rules.',
      features: ['DSD Attendance Exports', 'Safe Gate Security', 'Direct WhatsApp Support'],
      tier: 'growth' // Mapping to internal growth tier
    }
    
    if (data.headache === 'Finding new parents') return {
      name: 'Growth & Visibility Package',
      price: 'R199',
      reason: 'To help more parents find you online and fill your open spaces.',
      features: ['Professional Website', 'Online Applications', 'WhatsApp Sharing'],
      tier: 'starter'
    }

    return {
      name: 'Standard Package',
      price: 'R199',
      reason: 'Everything you need to move your paper books to your phone.',
      features: ['Digital Register', 'Parent Messaging', 'Secure Records'],
      tier: 'starter'
    }
  }

  const recommendation = getRecommendation()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6"
          >
            <div className="mx-auto h-20 w-20 rounded-[2rem] bg-cyan-100 flex items-center justify-center shadow-inner">
              <Smartphone className="h-10 w-10 text-cyan-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Let&apos;s see how we can help your creche.
            </h2>
            <p className="text-lg text-slate-600 font-medium leading-relaxed">
              We know running a centre is a lot of work. Answer 5 quick questions and we&apos;ll show you the best way to start.
            </p>
            <Button 
              onClick={next}
              className="h-14 w-full rounded-2xl bg-cyan-600 text-lg font-black shadow-lg shadow-cyan-900/20"
            >
              Start Now →
            </Button>
          </motion.div>
        )}

        {step === 'size' && (
          <motion.div
            key="size"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-600">Question 1 of 5</p>
              <h2 className="text-2xl font-black text-slate-900">How many children are at your creche right now?</h2>
            </div>
            <div className="grid gap-3">
              {['1 - 20 children', '21 - 50 children', '50+ children'].map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  onClick={() => selectSize(s)}
                  className="h-16 rounded-2xl border-2 border-slate-100 justify-start px-6 text-base font-bold hover:border-cyan-500 hover:bg-cyan-50"
                >
                  <Users className="mr-3 h-5 w-5 text-cyan-600" />
                  {s}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'registers' && (
          <motion.div
            key="registers"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-600">Question 2 of 5</p>
              <h2 className="text-2xl font-black text-slate-900">Do you still use paper books or folders for your names and attendance?</h2>
            </div>
            <div className="grid gap-3">
              <Button
                variant="outline"
                onClick={() => selectRegisters(true)}
                className="h-16 rounded-2xl border-2 border-slate-100 justify-start px-6 text-base font-bold hover:border-cyan-500 hover:bg-cyan-50"
              >
                <BookOpen className="mr-3 h-5 w-5 text-cyan-600" />
                Yes, mostly paper and books
              </Button>
              <Button
                variant="outline"
                onClick={() => selectRegisters(false)}
                className="h-16 rounded-2xl border-2 border-slate-100 justify-start px-6 text-base font-bold hover:border-cyan-500 hover:bg-cyan-50"
              >
                <Smartphone className="mr-3 h-5 w-5 text-cyan-600" />
                No, we use some other apps/tools
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'dsd' && (
          <motion.div
            key="dsd"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-600">Question 3 of 5</p>
              <h2 className="text-2xl font-black text-slate-900">Are you registered with the government (DSD) or getting subsidies?</h2>
            </div>
            <div className="grid gap-3">
              <Button
                variant="outline"
                onClick={() => selectDsd(true)}
                className="h-16 rounded-2xl border-2 border-slate-100 justify-start px-6 text-base font-bold hover:border-cyan-500 hover:bg-cyan-50"
              >
                <ShieldCheck className="mr-3 h-5 w-5 text-emerald-600" />
                Yes, we are registered
              </Button>
              <Button
                variant="outline"
                onClick={() => selectDsd(false)}
                className="h-16 rounded-2xl border-2 border-slate-100 justify-start px-6 text-base font-bold hover:border-cyan-500 hover:bg-cyan-50"
              >
                <X className="mr-3 h-5 w-5 text-slate-400" />
                Not yet
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'headache' && (
          <motion.div
            key="headache"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-600">Question 4 of 5</p>
              <h2 className="text-2xl font-black text-slate-900">What is your biggest headache today?</h2>
            </div>
            <div className="grid gap-3">
              {[
                'Finding new parents',
                'Safety at the gate',
                'Counting days for DSD money',
                'Too many WhatsApp messages'
              ].map((h) => (
                <Button
                  key={h}
                  variant="outline"
                  onClick={() => selectHeadache(h)}
                  className="h-16 rounded-2xl border-2 border-slate-100 justify-start px-6 text-base font-bold hover:border-cyan-500 hover:bg-cyan-50"
                >
                  <Zap className="mr-3 h-5 w-5 text-amber-500" />
                  {h}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'help' && (
          <motion.div
            key="help"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-600">Question 5 of 5</p>
              <h2 className="text-2xl font-black text-slate-900">Would you like Mandla to help you set it up personally on WhatsApp?</h2>
            </div>
            <div className="grid gap-3">
              <Button
                variant="outline"
                onClick={() => selectHelp(true)}
                className="h-16 rounded-2xl border-2 border-slate-100 justify-start px-6 text-base font-bold hover:border-cyan-500 hover:bg-cyan-50"
              >
                <MessageCircle className="mr-3 h-5 w-5 text-[#25D366]" />
                Yes, I&apos;d like a hand
              </Button>
              <Button
                variant="outline"
                onClick={() => selectHelp(false)}
                className="h-16 rounded-2xl border-2 border-slate-100 justify-start px-6 text-base font-bold hover:border-cyan-500 hover:bg-cyan-50"
              >
                <ArrowRight className="mr-3 h-5 w-5 text-slate-400" />
                No, I can try it myself
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 shadow-sm border border-emerald-200 mb-2">
                <Sparkles className="h-3 w-3" />
                Founding Member Match
              </div>
              <h2 className="text-3xl font-black text-slate-900">The {recommendation.name}</h2>
              <p className="text-slate-600 font-medium">{recommendation.reason}</p>
            </div>

            <div className="rounded-[2.5rem] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-slate-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Sparkles className="h-32 w-32 text-cyan-600" />
              </div>
              
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pilot Month Fee</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-black text-teal-700">R0</p>
                    <p className="text-lg font-bold text-slate-300 line-through">{recommendation.price}</p>
                  </div>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-cyan-50 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-cyan-600" />
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-xs font-black uppercase tracking-widest text-cyan-600">What&apos;s Included</p>
                <div className="grid gap-3">
                  {recommendation.features.map((f) => (
                    <div key={f} className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 mb-8 border border-slate-100">
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  <strong>Note</strong>: Your first 4 weeks are free. After the pilot, you keep this package at just {recommendation.price}/mo (locked in forever).
                </p>
              </div>

              <div className="grid gap-3">
                <Button asChild className="h-14 rounded-2xl bg-cyan-600 text-lg font-black shadow-xl shadow-cyan-900/20 transition-transform active:scale-95">
                  <Link href={`/for-centres/register?plan=${recommendation.tier}&flow=confirm`}>
                    Enroll My Creche Now
                  </Link>
                </Button>
                
                {data.wantsPersonalHelp && (
                  <Button asChild variant="outline" className="h-14 rounded-2xl border-2 border-slate-100 bg-white text-[#25D366] font-black hover:bg-emerald-50">
                    <Link href="https://wa.me/27685356430?text=Hi%20Mandla%2C%20I%20just%20finished%20the%20discovery%20questions%20and%20I%20need%20help%20setting%20up%20my%20creche.">
                      <MessageCircle className="mr-2 h-5 w-5 fill-current" />
                      Help me on WhatsApp
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <div className="text-center">
              <button 
                onClick={() => setStep('size')}
                className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-cyan-600 transition-colors"
              >
                ← Change my answers
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
