'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  ShieldCheck,
  Phone,
  User,
  AlertCircle,
  Loader2,
  Save,
  Wifi,
  WifiOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ensureParentReady } from '@/lib/auth/ensure-parent-ready'
import { toFriendlyClientError } from '@/lib/supabase/client-errors'
import { reportParentSubmitFailure } from '@/lib/telemetry/parent-submit-failures.client'
import { cn } from '@/lib/utils'
import { useParentProfileSync } from '@/lib/parent/use-profile-sync'

const STEPS = [
  { id: 'parent', title: 'Parent Info', icon: User },
  { id: 'child', title: 'Child Info', icon: Baby },
  { id: 'emergency', title: 'Emergency', icon: ShieldCheck },
  { id: 'preferences', title: 'Preferences', icon: MapPin }
]

const RELATIONSHIPS = ['Mother', 'Father', 'Guardian', 'Grandparent', 'Aunt/Uncle', 'Other']
const SUBURBS = ['Alexandra', 'Wynberg', 'Marlboro', 'Sandton', 'Bramley', 'Lombardy East']

const STORAGE_KEY = 'cc_parent_onboarding_draft'

type OnboardingData = {
  fullName: string
  phone: string
  relationship: string
  childFirstName: string
  childLastName: string
  childDob: string
  emergencyName: string
  emergencyPhone: string
  primarySuburb: string
}

const initialData: OnboardingData = {
  fullName: '',
  phone: '',
  relationship: '',
  childFirstName: '',
  childLastName: '',
  childDob: '',
  emergencyName: '',
  emergencyPhone: '',
  primarySuburb: 'Alexandra'
}

export function SetupWizard() {
  const router = useRouter()
  const supabase = createClient()
  const { syncToServer, resolveConflicts } = useParentProfileSync()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState<OnboardingData>(initialData)
  const [errors, setErrors] = useState<Partial<Record<keyof OnboardingData, string>>>({})

  // Load draft from localStorage and resolve conflicts
  useEffect(() => {
    const loadAndSync = async () => {
      const saved = localStorage.getItem(STORAGE_KEY)
      let localData = initialData
      if (saved) {
        try {
          localData = JSON.parse(saved)
        } catch (e) {
          console.error('Failed to parse saved onboarding draft', e)
        }
      }
      
      const mergedData = await resolveConflicts(localData)
      setFormData(mergedData)
    }
    
    loadAndSync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save draft to localStorage whenever formData changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
    setHasUnsavedChanges(true)
  }, [formData])

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.info('Back online! Syncing your draft...')
      // Proactively sync when back online
      saveDraftToServer()
    }
    const handleOffline = () => {
      setIsOnline(false)
      toast.warning('Working offline. Your changes are saved locally.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [formData])

  const validateStep = (stepIndex: number) => {
    const newErrors: Partial<Record<keyof OnboardingData, string>> = {}
    
    if (stepIndex === 0) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
      if (!formData.relationship) newErrors.relationship = 'Relationship is required'
    } else if (stepIndex === 1) {
      if (!formData.childFirstName.trim()) newErrors.childFirstName = 'First name is required'
      if (!formData.childLastName.trim()) newErrors.childLastName = 'Last name is required'
      if (!formData.childDob) newErrors.childDob = 'Date of birth is required'
    } else if (stepIndex === 2) {
      if (!formData.emergencyName.trim()) newErrors.emergencyName = 'Emergency contact name is required'
      if (!formData.emergencyPhone.trim()) newErrors.emergencyPhone = 'Emergency contact phone is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const saveDraftToServer = useCallback(async () => {
    if (!isOnline) return
    
    const result = await syncToServer(formData)
    if (result.ok) {
      setHasUnsavedChanges(false)
    }
  }, [formData, isOnline, syncToServer])

  // Auto-sync every 30 seconds if there are changes
  useEffect(() => {
    const timer = setInterval(() => {
      if (hasUnsavedChanges) {
        saveDraftToServer()
      }
    }, 30000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges])

  async function handleComplete() {
    if (!validateStep(3)) return
    setLoading(true)
    
    try {
      if (!isOnline) {
        throw new Error('You need to be online to complete your profile.')
      }

      const ready = await ensureParentReady(supabase)
      if (!ready.ok) {
        reportParentSubmitFailure({
          route: '/parent/onboarding',
          form: 'setup_wizard_complete',
          failureType: 'bootstrap_failed',
          message: ready.error,
        })
        throw new Error(ready.error)
      }

      // Final synchronization of all data
      const { error: parentError } = await supabase
        .from('parents')
        .update({ 
          guardian_relationship: formData.relationship,
          preferred_suburbs: [formData.primarySuburb],
          emergency_contact_name: formData.emergencyName,
          emergency_contact_phone: formData.emergencyPhone
        })
        .eq('id', ready.userId)
      
      if (parentError) throw parentError

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone
        })
        .eq('id', ready.userId)
      
      if (profileError) throw profileError

      // Create First Child
      const { error: childError } = await supabase
        .from('children')
        .insert({
          parent_id: ready.userId,
          first_name: formData.childFirstName,
          last_name: formData.childLastName,
          date_of_birth: formData.childDob,
          enrollment_status: 'draft' // Initial state
        } as any)

      if (childError) throw childError

      localStorage.removeItem(STORAGE_KEY)
      toast.success('Profile complete! Welcome to CentreConnect.')
      router.push('/parent/dashboard')
      router.refresh()
    } catch (error: unknown) {
      const message = toFriendlyClientError(error, 'Something went wrong')
      reportParentSubmitFailure({
        route: '/parent/onboarding',
        form: 'setup_wizard_complete',
        failureType: 'submit_failed',
        message,
      })
      toast.error(message)
      setLoading(false)
    }
  }

  const next = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(s => s + 1)
        saveDraftToServer() // Sync on step transition
      } else {
        handleComplete()
      }
    }
  }

  const back = () => currentStep > 0 && setCurrentStep(s => s - 1)

  const updateField = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <div className="max-w-md mx-auto w-full px-4">
      {/* Network Status & Sync Indicator */}
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500">
              <Wifi className="h-3 w-3" />
              Online
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-500">
              <WifiOff className="h-3 w-3" />
              Offline
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges ? (
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-500">
              <AlertCircle className="h-3 w-3" />
              Unsaved
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500">
              <CheckCircle2 className="h-3 w-3" />
              Synced
            </div>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="relative mb-12 px-2">
        <div className="flex justify-between relative z-10">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex flex-col items-center gap-2">
              <div 
                className={cn(
                  "h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                  i < currentStep ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200" :
                  i === currentStep ? "bg-white border-cyan-600 text-cyan-600 shadow-lg shadow-cyan-100 scale-110" :
                  "bg-white border-slate-100 text-slate-300"
                )}
              >
                {i < currentStep ? <CheckCircle2 className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest transition-colors duration-300",
                i === currentStep ? "text-cyan-600" : "text-slate-400"
              )}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
        {/* Progress Line */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-100 -z-0">
          <motion.div 
            className="h-full bg-cyan-600"
            initial={{ width: '0%' }}
            animate={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 min-h-[500px] flex flex-col relative overflow-hidden"
        >
          {/* Background Decorative Element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />

          {/* Step 1: Parent Info */}
          {currentStep === 0 && (
            <div className="flex-1 space-y-6 relative z-10">
              <header>
                <div className="h-14 w-14 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600 mb-6 shadow-sm">
                  <User className="h-7 w-7" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Welcome to the family</h2>
                <p className="text-slate-500 text-sm font-medium mt-2">Let&apos;s start with some basic info about you.</p>
              </header>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Your Full Name</Label>
                  <Input 
                    placeholder="Enter your name"
                    value={formData.fullName}
                    onChange={e => updateField('fullName', e.target.value)}
                    className={cn("h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-5 text-lg", errors.fullName && "border-rose-300 bg-rose-50")}
                  />
                  {errors.fullName && <p className="text-[10px] font-bold text-rose-500 ml-1 uppercase tracking-wider">{errors.fullName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</Label>
                  <Input 
                    placeholder="e.g. 082 123 4567"
                    value={formData.phone}
                    onChange={e => updateField('phone', e.target.value)}
                    className={cn("h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-5 text-lg", errors.phone && "border-rose-300 bg-rose-50")}
                  />
                  {errors.phone && <p className="text-[10px] font-bold text-rose-500 ml-1 uppercase tracking-wider">{errors.phone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Relationship to Child</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {RELATIONSHIPS.map(r => (
                      <Button
                        key={r}
                        type="button"
                        variant="outline"
                        onClick={() => updateField('relationship', r)}
                        className={cn(
                          "h-12 rounded-xl border-2 font-bold text-xs transition-all duration-200",
                          formData.relationship === r 
                            ? "border-cyan-600 bg-cyan-50 text-cyan-700 shadow-md scale-[1.02]" 
                            : "border-slate-50 hover:border-slate-200 text-slate-500 bg-slate-50/50"
                        )}
                      >
                        {r}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Child Info */}
          {currentStep === 1 && (
            <div className="flex-1 space-y-6 relative z-10">
              <header>
                <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-6 shadow-sm">
                  <Baby className="h-7 w-7" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Tell us about your child</h2>
                <p className="text-slate-500 text-sm font-medium mt-2">You can add more children later in your dashboard.</p>
              </header>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</Label>
                    <Input 
                      placeholder="Name"
                      value={formData.childFirstName}
                      onChange={e => updateField('childFirstName', e.target.value)}
                      className={cn("h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-5", errors.childFirstName && "border-rose-300 bg-rose-50")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</Label>
                    <Input 
                      placeholder="Surname"
                      value={formData.childLastName}
                      onChange={e => updateField('childLastName', e.target.value)}
                      className={cn("h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-5", errors.childLastName && "border-rose-300 bg-rose-50")}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date of Birth</Label>
                  <Input 
                    type="date"
                    value={formData.childDob}
                    onChange={e => updateField('childDob', e.target.value)}
                    className={cn("h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-5 text-lg", errors.childDob && "border-rose-300 bg-rose-50")}
                  />
                  {errors.childDob && <p className="text-[10px] font-bold text-rose-500 ml-1 uppercase tracking-wider">{errors.childDob}</p>}
                </div>
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    Crèches use this information to determine which class group your child will join.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Emergency */}
          {currentStep === 2 && (
            <div className="flex-1 space-y-6 relative z-10">
              <header>
                <div className="h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-6 shadow-sm">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Safety first</h2>
                <p className="text-slate-500 text-sm font-medium mt-2">Who should the crèche call if you&apos;re not available?</p>
              </header>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Emergency Contact Name</Label>
                  <Input 
                    placeholder="Full name"
                    value={formData.emergencyName}
                    onChange={e => updateField('emergencyName', e.target.value)}
                    className={cn("h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-5 text-lg", errors.emergencyName && "border-rose-300 bg-rose-50")}
                  />
                  {errors.emergencyName && <p className="text-[10px] font-bold text-rose-500 ml-1 uppercase tracking-wider">{errors.emergencyName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Emergency Contact Phone</Label>
                  <Input 
                    placeholder="Phone number"
                    value={formData.emergencyPhone}
                    onChange={e => updateField('emergencyPhone', e.target.value)}
                    className={cn("h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-5 text-lg", errors.emergencyPhone && "border-rose-300 bg-rose-50")}
                  />
                  {errors.emergencyPhone && <p className="text-[10px] font-bold text-rose-500 ml-1 uppercase tracking-wider">{errors.emergencyPhone}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Preferences */}
          {currentStep === 3 && (
            <div className="flex-1 space-y-6 relative z-10">
              <header>
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 shadow-sm">
                  <MapPin className="h-7 w-7" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Where are you looking?</h2>
                <p className="text-slate-500 text-sm font-medium mt-2">We&apos;ll prioritize crèches in your preferred area.</p>
              </header>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Primary Suburb</Label>
                  <select 
                    value={formData.primarySuburb}
                    onChange={e => updateField('primarySuburb', e.target.value)}
                    className="cc-native-field h-16 w-full rounded-2xl border-slate-100 bg-slate-50 px-6 text-xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-cyan-500/10 transition-all appearance-none"
                  >
                    {SUBURBS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                
                <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
                  <h3 className="text-sm font-black text-emerald-900 uppercase tracking-tight flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Almost ready!
                  </h3>
                  <p className="text-xs text-emerald-800 font-medium leading-relaxed mt-2">
                    Once you complete your profile, you can start applying to top-rated crèches with a single click.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-auto flex gap-3 pt-10">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={back}
                className="h-16 rounded-[2rem] border-slate-100 px-8 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
            )}
            <Button 
              disabled={loading}
              onClick={next}
              className={cn(
                "h-16 flex-1 rounded-[2rem] text-white font-black text-xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3",
                currentStep === STEPS.length - 1 ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-900 hover:bg-slate-800"
              )}
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  {currentStep === STEPS.length - 1 ? 'Start Exploring' : 'Continue'}
                  <ChevronRight className="h-6 w-6" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
      
      {/* Offline Banner */}
      {!isOnline && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-4 right-4 bg-rose-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between z-50"
        >
          <div className="flex items-center gap-3">
            <WifiOff className="h-5 w-5" />
            <p className="text-sm font-black uppercase tracking-tight">You are currently offline</p>
          </div>
          <p className="text-[10px] font-bold opacity-80">Local save active</p>
        </motion.div>
      )}
    </div>
  )
}
