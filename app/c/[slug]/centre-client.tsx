'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { 
  CheckCircle2, 
  Users, 
  Star, 
  Wallet, 
  Clock, 
  MapPin, 
  ShieldCheck,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Phone,
} from 'lucide-react'

// Import premium UI components
import { HeroPill } from '@/components/ui/hero-pill'
import { StatChip } from '@/components/ui/stat-chip'
import { Section } from '@/components/ui/section'
import { ModernCard } from '@/components/ui/modern-card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Container } from '@/components/layout/container'
import { ApplyCTA } from '@/components/public/ApplyCTA'
import { SaveCentreButton } from '@/components/parent/SaveCentreButton'
import { ContactCentreSheet } from './contact-centre-sheet'
import { CentreContactCard } from '@/components/public/CentreContactCard'
import { getCentreHeroImage } from '@/lib/ui/centre-hero-images'

type Centre = {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  email: string | null
  phone: string | null
  address: string | null
  suburb: string
  city: string
  province: string
  age_groups: string[] | null
  logo_url: string | null
  cover_image_url: string | null
  is_registered: boolean | null
  capacity: number | null
  fees_display_mode: 'exact' | 'range' | 'contact' | null
  monthly_fee_min: number | null
  monthly_fee_max: number | null
  registration_fee: number | null
  subsidy_accepted: boolean | null
  fees_notes: string | null
  fees_last_updated_at: string | null
  contact_whatsapp: string | null
  contact_phone: string | null
}

export function CentreClient({ slug }: { slug: string }) {
  const [centre, setCentre] = useState<Centre | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCentre() {
      const supabase = createClient()
      
      // Get centre data
      const { data, error } = await supabase
        .from('ecd_centres')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error || !data) {
        // Try fallback table if needed
        const { data: fallbackData } = await supabase
          .from('public_ecd_centres')
          .select('*')
          .eq('slug', slug)
          .maybeSingle()
        
        if (fallbackData) {
          setCentre(fallbackData as any)
        } else {
          setCentre(null)
        }
      } else {
        setCentre(data)
      }

      // Get user role if logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setUserRole(profile?.role ?? null)
      }
      
      setLoading(false)
    }

    fetchCentre()
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#065A82] border-t-transparent" />
      </div>
    )
  }

  if (!centre) return notFound()

  const heroImage = getCentreHeroImage(centre.slug, centre.cover_image_url)
  const heroFacts = [
    centre.is_registered ? 'DSD Registered' : null,
    centre.subsidy_accepted ? 'Subsidy Friendly' : null,
    'Verified Profile',
    'Open for 2026'
  ].filter(Boolean) as string[]

  const feesLabel = centre.fees_display_mode === 'exact' 
    ? `R${centre.monthly_fee_min}` 
    : centre.fees_display_mode === 'range' 
      ? `R${centre.monthly_fee_min} - R${centre.monthly_fee_max}` 
      : 'Contact Us'

  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-32">
      {/* Premium Hero Section */}
      <section className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
        <Image src={heroImage} alt={centre.name} fill className="object-cover" priority quality={90} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        
        <Container className="relative h-full">
          <div className="flex h-full flex-col justify-end pb-16">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-xs font-black text-white backdrop-blur-xl border border-white/30 shadow-2xl">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                4.8 Premium ECD
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-xs font-black text-white backdrop-blur-xl border border-white/30 shadow-2xl">
                <MapPin className="h-3.5 w-3.5" />
                {centre.suburb}, {centre.city}
              </div>
            </div>
            
            <h1 className="text-5xl font-black tracking-tighter text-white sm:text-7xl lg:text-8xl leading-[0.9]">
              {centre.name}
            </h1>
            
            {centre.tagline && (
              <p className="mt-6 max-w-2xl text-xl font-medium text-white/90 sm:text-2xl leading-relaxed">
                {centre.tagline}
              </p>
            )}
          </div>
        </Container>
      </section>

      <Container className="-mt-12 space-y-16 relative z-10">
        {/* Facts Row */}
        <div className="flex flex-wrap gap-3 overflow-x-auto pb-4 scrollbar-none">
          {heroFacts.map((fact) => (
            <HeroPill key={fact} className="whitespace-nowrap bg-white text-slate-900 border-none shadow-xl px-6 py-3 text-sm">
              {fact}
            </HeroPill>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatChip label="Age Groups" value={centre.age_groups?.join(', ') || '3m - 6y'} icon={<Users className="h-6 w-6" />} accent="teal" />
          <StatChip label="Monthly Fee" value={feesLabel} icon={<Wallet className="h-6 w-6" />} accent="teal" />
          <StatChip label="Capacity" value={centre.capacity || 'Varies'} icon={<GraduationCap className="h-6 w-6" />} accent="teal" />
          <StatChip label="Hours" value="07:00 - 17:30" icon={<Clock className="h-6 w-6" />} accent="teal" />
        </div>

        {/* Content Layout */}
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-16">
            
            {/* About Section */}
            <Section id="about" emoji="👋" title="About Our Centre">
              <div className="space-y-6">
                <p className="text-xl leading-relaxed font-medium text-slate-700">
                  {centre.description || 'Welcome to our centre. We provide a safe, nurturing environment for your children to learn and grow.'}
                </p>
                
                {centre.capacity && (
                  <div className="pt-4">
                    <ProgressBar 
                      value={82} 
                      label="Available Capacity" 
                      subLabel="Applying early is recommended to secure your preferred intake date." 
                    />
                  </div>
                )}
              </div>
            </Section>

            {/* Programs Section */}
            <Section id="programs" emoji="🎓" title="Programmes & Learning">
              <div className="grid gap-6 sm:grid-cols-2">
                <ModernCard className="flex flex-col gap-4 border-l-4 border-l-[#065A82]">
                  <div className="h-12 w-12 rounded-2xl bg-[#065A82]/10 flex items-center justify-center text-[#065A82]">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Holistic Curriculum</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Our play-based learning approach focuses on social, emotional, and cognitive development for all ages.
                  </p>
                </ModernCard>
                <ModernCard className="flex flex-col gap-4 border-l-4 border-l-cyan-500">
                  <div className="h-12 w-12 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Age-Appropriate Groups</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Children are grouped by developmental stage to ensure they receive the right level of care and stimulation.
                  </p>
                </ModernCard>
              </div>
            </Section>

            {/* Location & Trust */}
            <Section id="location" emoji="📍" title="Location & Contact">
              <div className="grid gap-6 sm:grid-cols-2">
                <ModernCard className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Address</p>
                      <p className="text-sm font-bold text-slate-900">{centre.address || `${centre.suburb}, ${centre.city}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Phone</p>
                      <p className="text-sm font-bold text-slate-900">{centre.contact_phone || 'Available on request'}</p>
                    </div>
                  </div>
                </ModernCard>
                <div className="h-[240px] rounded-[2rem] bg-slate-100 overflow-hidden relative group">
                  <div className="absolute inset-0 bg-slate-200 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Map View Coming Soon</p>
                  </div>
                </div>
              </div>
            </Section>

          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:block">
            <ModernCard className="sticky top-24 space-y-8 border-t-8 border-t-[#065A82] shadow-2xl">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admissions</p>
                  <ShieldCheck className="h-6 w-6 text-[#065A82]" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Apply for a Spot</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Secure and transparent application process managed through CentreConnect.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    No application fees. Only pay once your child is accepted.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <ApplyCTA variant="hero" centreSlug={centre.slug} userRole={userRole} />
                <div className="grid grid-cols-2 gap-2">
                  <ContactCentreSheet centreId={centre.id} centreName={centre.name} />
                  <SaveCentreButton centreId={centre.id} initialSaved={false} />
                </div>
              </div>
            </ModernCard>

            <CentreContactCard centreId={centre.id} centreName={centre.name} />
          </aside>
        </div>
      </Container>

      {/* Floating Bottom Bar for Mobile */}
      <div className="fixed bottom-8 inset-x-6 z-50 lg:hidden">
        <div className="bg-[#1A1A2E] rounded-full p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 backdrop-blur-2xl flex items-center justify-between gap-4">
          <div className="pl-6">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Fee Starts From</p>
            <p className="text-lg font-black text-white leading-none">{feesLabel}</p>
          </div>
          <div className="shrink-0 w-1/2">
            <ApplyCTA variant="hero" centreSlug={centre.slug} userRole={userRole} />
          </div>
        </div>
      </div>
    </main>
  )
}
