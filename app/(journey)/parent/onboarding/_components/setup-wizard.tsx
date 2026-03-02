'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Baby, 
  MapPin, 
  Heart, 
  ChevronRight, 
  CheckCircle2, 
  Sparkles,
  ArrowLeft,
  Camera,
  ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  { id: 'role', title: 'Your Role', icon: Heart },
  { id: 'child', title: 'First Child', icon: Baby },
  { id: 'location', title: 'Location', icon: MapPin }
]

const RELATIONSHIPS = ['Mother', 'Father', 'Guardian', 'Grandparent', 'Aunt/Uncle']

export function SetupWizard() {
  const router = useRouter()
  const supabase = createClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  
  // Form State
  const [role, setRole] = useState('')
  const [child, setChild] = useState({ firstName: '', lastName: '', dob: '' })
  const [suburb, setSuburb] = useState('Alexandra')

  async function handleComplete() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Update Parent Profile
      const { error: parentError } = await supabase
        .from('parents')
        .update({ 
          guardian_relationship: role,
          preferred_suburbs: [suburb]
        })
        .eq('id', user.id)
      
      if (parentError) throw parentError

      // 2. Create First Child
      const { error: childError } = await supabase
        .from('children')
        .insert({
          parent_id: user.id,
          first_name: child.firstName,
          last_name: child.lastName,
          date_of_birth: child.dob || new Date().toISOString().split('T')[0] // Fallback
        } as any)

      if (childError) throw childError

      toast.success('Setup complete! Welcome to CentreConnect.')
      router.push('/parent/dashboard')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
      setLoading(false)
    }
  }

  const next = () => currentStep < STEPS.length - 1 ? setCurrentStep(s => s + 1) : handleComplete()
  const back = () => currentStep > 0 && setCurrentStep(s => s - 1)

  return (
    <div className="max-w-md mx-auto w-full">
      {/* Progress Dots */}
      <div className="flex justify-center gap-2 mb-8">
        {STEPS.map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentStep ? 'w-8 bg-cyan-600' : 'w-2 bg-slate-200'
            }`} 
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 min-h-[460px] flex flex-col"
        >
          {/* Step 1: Role */}
          {currentStep === 0 && (
            <div className="flex-1 space-y-6">
              <header>
                <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-4">
                  <Heart className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">How are you related?</h2>
                <p className="text-slate-500 text-sm font-medium">This helps crèches know who they are talking to.</p>
              </header>
              <div className="grid grid-cols-2 gap-3">
                {RELATIONSHIPS.map(r => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`h-14 rounded-2xl border-2 font-bold text-sm transition-all ${
                      role === r 
                        ? 'border-cyan-600 bg-cyan-50 text-cyan-700' 
                        : 'border-slate-100 hover:border-slate-200 text-slate-600'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Child */}
          {currentStep === 1 && (
            <div className="flex-1 space-y-6">
              <header>
                <div className="h-12 w-12 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600 mb-4">
                  <Baby className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tell us about your child</h2>
                <p className="text-slate-500 text-sm font-medium">You can add more children later.</p>
              </header>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</Label>
                  <Input 
                    placeholder="Child's name"
                    value={child.firstName}
                    onChange={e => setChild({...child, firstName: e.target.value})}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</Label>
                  <Input 
                    placeholder="Surname"
                    value={child.lastName}
                    onChange={e => setChild({...child, lastName: e.target.value})}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date of Birth</Label>
                  <Input 
                    type="date"
                    value={child.dob}
                    onChange={e => setChild({...child, dob: e.target.value})}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {currentStep === 2 && (
            <div className="flex-1 space-y-6">
              <header>
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
                  <MapPin className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Where are you looking?</h2>
                <p className="text-slate-500 text-sm font-medium">We&apos;ll show you crèches in this area first.</p>
              </header>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Primary Suburb</Label>
                  <select 
                    value={suburb}
                    onChange={e => setSuburb(e.target.value)}
                    className="cc-native-field h-14 w-full rounded-2xl border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-cyan-500 appearance-none"
                  >
                    <option value="Alexandra">Alexandra</option>
                    <option value="Wynberg">Wynberg</option>
                    <option value="Marlboro">Marlboro</option>
                    <option value="Sandton">Sandton</option>
                  </select>
                </div>
                
                <div className="bg-cyan-50 rounded-2xl p-4 border border-cyan-100 flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-cyan-800 font-medium leading-relaxed">
                    Setting your suburb helps us calculate distances and find crèches near your home or work.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-10 flex gap-3 pt-6 border-t border-slate-50">
            {currentStep > 0 && (
              <button 
                onClick={back}
                className="h-14 px-6 rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <Button 
              disabled={loading || (currentStep === 0 && !role) || (currentStep === 1 && !child.firstName)}
              onClick={next}
              className="h-14 flex-1 rounded-2xl bg-slate-900 text-white font-black text-lg shadow-xl active:scale-[0.98] transition-all"
            >
              {loading ? 'Finalizing...' : currentStep === STEPS.length - 1 ? 'Start Exploring' : 'Continue'}
              {!loading && <ChevronRight className="ml-2 h-5 w-5" />}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
