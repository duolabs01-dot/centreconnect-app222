'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  HeartHandshake,
  MessageCircle,
  QrCode,
  Sparkles,
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Lock,
  Smartphone,
  ShieldCheck,
  Zap,
  Printer,
  Globe,
  Settings2,
  Lightbulb
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CentreCard } from '@/components/parent/CentreCard'
import { trackAnalyticsEvent } from '@/lib/analytics/client-events'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// High-quality imagery: African preschool children with smiling teacher
const HERO_IMAGE = 'https://images.unsplash.com/photo-1540479859555-17af45c78602?q=80&w=1600&auto=format&fit=crop'
const FOUNDER_PHOTO = '/founder-mandlenkosi.jpeg'

const scenarios = [
  {
    id: 'attendance',
    emoji: '✅',
    title: 'DSD-Ready Attendance',
    tag: 'DSD COMPLIANT',
    desc: 'Paper registers take hours. This takes 30 seconds.',
    value: 'Saves 10+ hours of admin every week.',
    detail: 'Tap Present, Absent, or Sick on your phone. At month-end, click "Export PDF" and your official DSD register is ready to print and sign for inspectors.'
  },
  {
    id: 'pickup',
    emoji: '🔐',
    title: 'Safe Gate Security',
    tag: 'GATE SECURITY',
    desc: 'Stop arguing at the gate with unknown people.',
    value: 'Keeps staff calm and children 100% safe.',
    detail: 'Approved guardians show a secure QR code on their phone. You scan it, the system says "Verified," and the gate opens. Simple, firm, and safe.'
  },
  {
    id: 'referral',
    emoji: '💸',
    title: 'Refer & Earn R100',
    tag: 'EARN R100',
    desc: 'Get rewarded for helping other Creche Owners.',
    value: 'R100 for you, 1st month fee free for them.',
    detail: 'Share your invite link with another ECD Owner. When they join the pilot, you get R100 off your next bill and they get their first month completely free.'
  }
]

const principalTips = [
  { emoji: "📱", tip: "Add CentreConnect to your home screen. It works like an app — no download needed." },
  { emoji: "💾", tip: "Start by adding just 5 children from your register. You'll see how quick it is." },
  { emoji: "📸", tip: "Add a photo of your centre. Parents choose with their eyes first." },
]

function toSafeText(value: string | null | undefined, fallback: string) {
  const next = (value ?? '').trim()
  return next.length > 0 ? next : fallback
}

function toLocation(suburb: string | null | undefined, city: string | null | undefined) {
  const parts = [suburb, city].map((part) => (part ?? '').trim()).filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'your area'
}

export default function CentreConnectWelcomePack() {
  const supabase = useMemo(() => createClient(), [])

  // Navigation State
  const [currentPage, setCurrentPage] = useState<number>(0)
  const [step, setStep] = useState<0 | 1>(0) // 0 = Password Setup, 1 = The Guide
  
  // Centre Data
  const [contactName, setContactName] = useState('Friend')
  const [centreName, setCentreName] = useState('your creche')
  const [location, setLocation] = useState('your area')
  const [centreSlug, setCentreSlug] = useState('')
  const [ecdId, setEcdId] = useState<string | null>(null)
  const [centreLogoUrl, setCentreLogoUrl] = useState<string | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string>(HERO_IMAGE)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'done'>('idle')

  // Password Setup State
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const firstName = useMemo(() => contactName.split(' ')[0] || 'Friend', [contactName])
  const posterHref = centreSlug ? `/centre/${centreSlug}/poster` : ''

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      
      const signedIn = Boolean(session)
      setHasSession(signedIn)

      if (signedIn && session?.user?.id) {
        const { data: profile } = await supabase.from('user_profiles').select('first_password_set_at').eq('id', session.user.id).maybeSingle()
        const mustSetPassword = !profile?.first_password_set_at
        setRequiresPasswordSetup(mustSetPassword)
        if (!mustSetPassword) setStep(1)

        const { data: centre } = await supabase.from('ecd_centres').select('id,slug,name,logo_url,cover_image_url,suburb,city').eq('owner_id', session.user.id).maybeSingle()
        if (centre && mounted) {
          setEcdId(centre.id)
          setCentreSlug(centre.slug)
          setCentreName(centre.name)
          setCentreLogoUrl(centre.logo_url)
          if (centre.cover_image_url) setCoverImageUrl(centre.cover_image_url)
          setLocation(toLocation(centre.suburb, centre.city))
        }
      }
      setCheckingSession(false)
    }
    void load()
    return () => { mounted = false }
  }, [supabase])

  const handlePasswordSetup = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setPasswordError('Use at least 8 characters.'); return }
    if (password !== confirmPassword) { setPasswordError('Passwords do not match.'); return }
    
    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setPasswordError(error.message); setPasswordSaving(false); return }
    
    await fetch('/api/auth/password-setup-confirmed', { method: 'POST' }).catch(() => null)
    setRequiresPasswordSetup(false)
    setStep(1)
    toast.success('Secure password set! Welcome to your guide.')
  }

  const pages = [
    // PAGE 0: Welcome Hero
    <div key="page0" className="space-y-8">
      <div className="relative w-full overflow-hidden rounded-[2.5rem] border-4 border-white shadow-2xl bg-white aspect-[16/9]">
        <Image src={coverImageUrl} alt="Children in a Johannesburg creche playing with teacher smiling" fill className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
        <div className="absolute bottom-0 p-8 text-white">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400">Welcome Home</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight lg:text-6xl leading-tight">Sawubona, {firstName} 👋</h1>
          <p className="mt-4 max-w-xl text-lg font-medium text-slate-200">{centreName} is now digital. Built for the principals and MaGogos who do the hard work every day.</p>
        </div>
      </div>
      <div className="text-center space-y-4">
        <p className="text-slate-600 font-bold text-lg italic">Swipe or click to peruse your new Digital Office guide.</p>
        <div className="flex justify-center gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={cn("h-2 rounded-full transition-all duration-300", currentPage === i ? "w-8 bg-cyan-600" : "w-2 bg-slate-200")} />
          ))}
        </div>
      </div>
    </div>,

    // PAGE 1: Value Scenarios
    <div key="page1" className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Simple Tools, Powerful Results</h2>
        <p className="text-slate-500 font-medium">Click any card to see how it saves you time.</p>
      </div>
      <div className="grid gap-4">
        {scenarios.map(s => (
          <button 
            key={s.id}
            onClick={() => toast.info('For demo purposes: This is just a preview!', { icon: '💡' })}
            className="flex flex-col items-start p-6 rounded-[2rem] border-2 border-slate-100 bg-white text-left transition-all hover:border-cyan-200 hover:shadow-xl group"
          >
            <div className="flex w-full items-center justify-between mb-3">
              <span className="text-3xl">{s.emoji}</span>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-700">{s.tag}</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 group-hover:text-cyan-700">{s.title}</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">{s.desc}</p>
            <div className="mt-4 pt-4 border-t border-slate-50 w-full">
              <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">The Win: {s.value}</p>
            </div>
          </button>
        ))}
      </div>
    </div>,

    // PAGE 2: Digital Identity (Mock Snapshot)
    <div key="page2" className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Your Identity Online</h2>
        <p className="text-slate-500 font-medium">This is how parents see your creche in our directory.</p>
      </div>
      <div className="mx-auto max-w-sm">
        <CentreCard
          id={ecdId || 'preview'}
          slug={centreSlug}
          name={centreName}
          logo_url={centreLogoUrl || undefined}
          cover_image_url={coverImageUrl}
          address={location}
          age_groups={['3m - 6y old']}
          tagline={toSafeText(centreName, 'Trusted local creche')}
          is_claimed={true}
          rating={4.8}
        />
      </div>
      <div className="rounded-[2.5rem] bg-emerald-600 p-8 text-white text-center shadow-2xl shadow-emerald-900/30">
        <h3 className="text-2xl font-black mb-2">Activation Step</h3>
        <p className="text-emerald-100 mb-6 font-medium">Tap below to list your centre and go live instantly.</p>
        <Button 
          className="h-16 w-full rounded-2xl bg-white text-emerald-700 font-black text-lg hover:bg-emerald-50 shadow-xl active:scale-95 transition-all"
          onClick={() => toast.success('🚀 Activation Done! Your centre is now indexed and live.')}
        >
          🚀 Launch My Profile & Go Live
        </Button>
      </div>
    </div>,

    // PAGE 3: Quick Tools & Actions
    <div key="page3" className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Quick Actions</h2>
        <p className="text-slate-500 font-medium">Start using your digital office right now.</p>
      </div>
      
      <div className="grid gap-4">
        <Card className="rounded-[2.5rem] border-2 border-slate-100 bg-white p-6 shadow-lg">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" className="h-14 rounded-2xl border-2 border-cyan-100 bg-cyan-50/30 font-black text-cyan-800 hover:bg-cyan-50 transition-all">
              <Link href={posterHref} target="_blank">
                <Printer className="mr-2 h-5 w-5" /> Print Gate Poster
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-14 rounded-2xl border-2 border-slate-100 bg-white font-black text-slate-700 hover:bg-slate-50">
              <Link href="/ecd/website">
                <Globe className="mr-2 h-5 w-5" /> Website Setup
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-14 rounded-2xl border-2 border-slate-100 bg-white font-black text-slate-700 hover:bg-slate-50">
              <Link href="/ecd/profile">
                <Settings2 className="mr-2 h-5 w-5" /> Centre Settings
              </Link>
            </Button>
            <Button 
              onClick={() => {
                const absolute = `${window.location.origin}/centre/${centreSlug}`
                navigator.clipboard.writeText(absolute)
                setCopyStatus('done')
                toast.success('Link copied! Share it on WhatsApp.')
                setTimeout(() => setCopyStatus('idle'), 2000)
              }}
              variant="outline" 
              className={cn("h-14 rounded-2xl border-2 border-slate-100 bg-white font-black text-slate-700 hover:bg-slate-50", copyStatus === 'done' && "border-emerald-500 text-emerald-700 bg-emerald-50")}
            >
              <Copy className="mr-2 h-5 w-5" /> {copyStatus === 'done' ? 'Link Copied!' : 'Share My Link'}
            </Button>
          </div>
        </Card>

        <Card className="rounded-[2.5rem] border-2 border-amber-100 bg-amber-50/50 p-6 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-amber-600" />
            <p className="text-xs font-black uppercase tracking-widest text-amber-700">Tips from other Principals</p>
          </div>
          <div className="space-y-3">
            {principalTips.map((t, i) => (
              <div key={i} className="flex items-start gap-3 bg-white/80 p-3 rounded-2xl border border-amber-100/50">
                <span className="text-xl">{t.emoji}</span>
                <p className="text-sm font-bold text-slate-700 leading-snug">{t.tip}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>,

    // PAGE 4: Founding Member Pricing
    <div key="page4" className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Your Founding Package</h2>
        <p className="text-slate-500 font-medium">You are on the Platinum Pilot tier for the next 4 weeks.</p>
      </div>
      
      <Card className="rounded-[2.5rem] border-2 border-cyan-100 bg-white p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12"><Sparkles size={120} /></div>
        <div className="flex items-center justify-between border-b pb-6 border-slate-100 mb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Pilot Month Fee</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900">R0</span>
              <span className="text-xl text-slate-300 line-through font-bold">R299</span>
            </div>
          </div>
          <div className="h-16 w-16 rounded-[1.5rem] bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={32} />
          </div>
        </div>
        
        <table className="w-full text-left mb-6">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              <th className="py-2">Features</th>
              <th className="text-center py-2">Starter</th>
              <th className="text-center py-2 text-cyan-600">Platinum</th>
            </tr>
          </thead>
          <tbody className="text-sm font-bold text-slate-700">
            {[
              { label: 'DSD Register', s: false, p: true },
              { label: 'QR Security', s: false, p: true },
              { label: 'Parent App', s: true, p: true },
              { label: 'WhatsApp Help', s: false, p: true },
            ].map((row) => (
              <tr key={row.label} className="border-t border-slate-50">
                <td className="py-2.5">{row.label}</td>
                <td className="text-center py-2.5">{row.s ? '✓' : '—'}</td>
                <td className="text-center py-2.5 text-cyan-600">✓</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs font-black text-slate-400 text-center uppercase tracking-widest">Locked In forever as a pilot member</p>
      </Card>

      <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <Image src={FOUNDER_PHOTO} alt="Mandlenkosi" width={64} height={64} className="h-16 w-16 rounded-full border-2 border-white/20 object-cover shadow-md" />
          <div>
            <p className="text-base font-black leading-tight text-white">Direct Support</p>
            <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mt-1">Founder, CentreConnect</p>
          </div>
        </div>
        <p className="text-base font-medium leading-relaxed mb-6">
          Need a hand setting up? WhatsApp me directly. I am here to help you move from paper to digital.
        </p>
        <Button asChild className="h-14 w-full rounded-2xl bg-[#25D366] text-white font-black text-lg hover:bg-green-600 shadow-xl shadow-green-900/20 active:scale-95 transition-all">
          <Link href="https://wa.me/27685356430?text=Hi%20Mandla%2C%20I%20ready%20to%20start!">
            <MessageCircle className="mr-2 h-6 w-6 fill-current" /> WhatsApp Mandla Now
          </Link>
        </Button>
      </div>
    </div>
  ]

  return (
    <div className="min-h-screen bg-slate-50 pb-20 selection:bg-cyan-100 selection:text-cyan-900">
      
      {/* Sticky Progress Bar */}
      <div className="sticky top-0 z-[100] w-full bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3 shadow-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-cyan-600 flex items-center justify-center text-white shadow-lg">
              <BookOpen size={16} />
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Onboarding</p>
              <p className="text-xs font-black text-slate-900">Welcome Guide</p>
            </div>
          </div>
          <div className="flex-1 max-w-xs h-2 rounded-full bg-slate-100 overflow-hidden mx-2">
            <motion.div 
              className="h-full bg-cyan-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
            />
          </div>
          <p className="text-[10px] font-black text-cyan-700 whitespace-nowrap">{currentPage + 1} / {pages.length}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.section 
            key="auth"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col items-center justify-center px-4"
          >
            <Card className="w-full rounded-[2.5rem] border-slate-200 bg-white shadow-2xl p-8">
              <div className="text-center space-y-2 mb-8">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600 mb-4">
                  <Lock size={24} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Secure Your Office</h2>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">Set your password to open your Guide and Dashboard.</p>
              </div>
              <form onSubmit={handlePasswordSetup} className="space-y-4">
                <input 
                  type="password" placeholder="New Password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="h-14 w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-4 font-bold outline-none focus:border-cyan-500 transition-all shadow-inner"
                />
                <input 
                  type="password" placeholder="Confirm Password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className="h-14 w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-4 font-bold outline-none focus:border-cyan-500 transition-all shadow-inner"
                />
                {passwordError && <p className="text-xs font-bold text-rose-600 px-2">{passwordError}</p>}
                <Button className="h-14 w-full rounded-2xl bg-cyan-600 font-black shadow-lg shadow-cyan-900/20 text-lg active:scale-95 transition-all" disabled={passwordSaving}>
                  {passwordSaving ? 'Securing...' : 'Set Password & Open Guide →'}
                </Button>
              </form>
            </Card>
          </motion.section>
        ) : (
          <motion.main 
            key="guide"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mx-auto max-w-5xl px-4 pt-12"
          >
            <div className="relative min-h-[650px] pb-24">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {pages[currentPage]}
                </motion.div>
              </AnimatePresence>

              {/* Book Controls */}
              <div className="fixed bottom-8 inset-x-4 flex justify-between gap-4 max-w-5xl mx-auto z-[90]">
                <Button 
                  variant="outline" 
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="h-14 w-14 rounded-2xl border-2 bg-white shadow-xl active:scale-90 flex-shrink-0"
                >
                  <ChevronLeft size={24} />
                </Button>
                
                {currentPage < pages.length - 1 ? (
                  <Button 
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="h-14 flex-1 rounded-2xl bg-slate-900 text-white font-black text-lg shadow-xl active:scale-95 transition-all"
                  >
                    Next Page <ChevronRight size={20} className="ml-2" />
                  </Button>
                ) : (
                  <Button asChild className="h-14 flex-1 rounded-2xl bg-cyan-600 text-white font-black text-lg shadow-xl shadow-cyan-900/30 active:scale-95 transition-all border-none">
                    <Link href="/ecd/dashboard">Go to My Dashboard 🚀</Link>
                  </Button>
                )}
              </div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  )
}
