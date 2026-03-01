'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronRight, 
  Shield, 
  Users, 
  FileText, 
  Heart, 
  LogOut, 
  UserRound, 
  Phone, 
  Mail, 
  Lock, 
  Zap,
  Sliders,
  HelpCircle,
  BadgeCheck,
  CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { SurfaceCard } from '@/components/ui/surface-card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ecd/Button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useLiteMode } from '@/lib/context/LiteModeProvider'
import { Switch } from '@/components/ui/switch'

const RELATIONSHIP_OPTIONS = ['Mother', 'Father', 'Guardian', 'Grandparent', 'Aunt/Uncle', 'Other']

type ParentProfileHubInitial = {
  full_name: string
  phone: string
  email: string
  avatar_url: string
  guardian_relationship: string
  emergency_contact_name: string
  emergency_contact_phone: string
  notifications_application_updates: boolean
  notifications_reminders: boolean
  child_count: number
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'P'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase()
}

export function ParentProfileHub({ initial }: { initial: ParentProfileHubInitial }) {
  const router = useRouter()
  const supabase = createClient()
  const { isLiteMode, toggleLiteMode } = useLiteMode()
  
  const [profile, setProfile] = useState(initial)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeField, setActiveField] = useState<'full_name' | 'phone' | 'guardian_relationship' | 'emergency_contact_name' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const completionPct = Math.round(([
    profile.full_name, 
    profile.phone, 
    profile.guardian_relationship, 
    profile.emergency_contact_name
  ].filter(Boolean).length / 4) * 100)

  async function handleSignOut() {
    setIsSigningOut(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function openEdit(field: typeof activeField, current: string) {
    setActiveField(field)
    setEditValue(current || '')
    setSheetOpen(true)
  }

  async function saveField() {
    if (!activeField) return
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const isUserProfileField = ['full_name', 'phone'].includes(activeField)
      const table = isUserProfileField ? 'user_profiles' : 'parents'

      const { error } = await supabase
        .from(table)
        .update({ [activeField]: editValue })
        .eq('id', user.id)

      if (error) throw error

      setProfile(prev => ({ ...prev, [activeField]: editValue }))
      setSheetOpen(false)
      toast.success('Protocol updated successfully')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update field')
    } finally {
      setIsSaving(false)
    }
  }

  const menuGroups = [
    {
      label: 'Security & Account',
      items: [
        { 
          label: 'Full Name', 
          value: profile.full_name || 'Not set', 
          icon: UserRound, 
          onClick: () => openEdit('full_name', profile.full_name) 
        },
        { 
          label: 'Phone Number', 
          value: profile.phone || 'Not set', 
          icon: Phone, 
          onClick: () => openEdit('phone', profile.phone) 
        },
        { 
          label: 'Email Protocol', 
          value: profile.email, 
          icon: Mail, 
          readonly: true 
        },
      ]
    },
    {
      label: 'Family Architecture',
      items: [
        { 
          label: 'Parent Role', 
          value: profile.guardian_relationship || 'Not set', 
          icon: Heart, 
          onClick: () => openEdit('guardian_relationship', profile.guardian_relationship) 
        },
        { 
          label: 'Emergency Contact', 
          value: profile.emergency_contact_name || 'Not set', 
          icon: Shield, 
          onClick: () => openEdit('emergency_contact_name', profile.emergency_contact_name) 
        },
        { 
          label: 'Child Profiles', 
          value: `${profile.child_count} active profiles`, 
          icon: Users, 
          href: '/parent/children' 
        },
      ]
    },
    {
      label: 'App Environment',
      items: [
        { 
          label: 'Lite Mode', 
          icon: Zap, 
          custom: (
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
                <Zap className={cn("h-5 w-5 transition-colors", isLiteMode && "text-amber-500 fill-amber-500")} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">Lite Mode</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">Reduce data & animations</p>
              </div>
              <Switch checked={isLiteMode} onCheckedChange={toggleLiteMode} />
            </div>
          )
        },
        { label: 'Documents Vault', icon: FileText, href: '/parent/profile/documents' },
        { label: 'Discovery Engine', icon: Sliders, href: '/parent/preferences' },
        { label: 'Security History', icon: Lock, href: '/parent/profile/security' },
      ]
    }
  ]

  return (
    <div className="cc-stack pb-12">
      {/* Premium Profile Header */}
      <SurfaceCard className="p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-cyan-500/10 transition-colors" />
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="h-20 w-20 overflow-hidden rounded-[2rem] bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-2xl font-black text-white shadow-float ring-4 ring-white">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
            ) : initialsFromName(profile.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xl font-black text-slate-900 truncate tracking-tight">{profile.full_name || 'Operative'}</p>
              <BadgeCheck className="h-5 w-5 text-cyan-500 fill-cyan-50 shrink-0" />
            </div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Verified Family Account</p>
          </div>
        </div>
      </SurfaceCard>

      {/* Completion Pulse */}
      <SurfaceCard className="p-6 bg-slate-900 text-white border-none shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">Readiness Score</p>
          </div>
          <p className="text-lg font-black">{completionPct}%</p>
        </div>
        <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(34,211,238,0.5)]" 
            style={{ width: `${completionPct}%` }} 
          />
        </div>
        {completionPct < 100 ? (
          <p className="mt-4 text-xs text-slate-400 font-medium leading-relaxed">
            Your profile is being indexed. Complete missing fields to <span className="text-cyan-400 font-bold">accelerate admissions</span> by up to 300%.
          </p>
        ) : (
          <p className="mt-4 text-xs text-emerald-400 font-bold leading-relaxed flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            Profile protocols fully operational.
          </p>
        )}
      </SurfaceCard>

      {/* Menu Architecture */}
      <div className="space-y-8 mt-2">
        {menuGroups.map(group => (
          <div key={group.label} className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">{group.label}</p>
            <SurfaceCard className="p-0 overflow-hidden border-slate-100">
              <div className="divide-y divide-slate-50">
                {group.items.map(item => {
                  if ('custom' in item) {
                    return (
                      <div key={item.label} className="px-5 py-5 min-h-[64px]">
                        {item.custom}
                      </div>
                    )
                  }

                  const Content = (
                    <div className="flex items-center justify-between w-full px-5 py-5 min-h-[64px] group/item">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover/item:bg-cyan-50 group-hover/item:text-cyan-600 transition-all">
                          <item.icon className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black text-slate-900 tracking-tight">{item.label}</p>
                          {('value' in item && item.value) && (
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">{item.value}</p>
                          )}
                        </div>
                      </div>
                      {(!('readonly' in item) || !item.readonly) && (
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover/item:translate-x-1 transition-transform" />
                      )}
                    </div>
                  )

                  if ('href' in item && item.href) {
                    return (
                      <Link key={item.label} href={item.href} className="block hover:bg-slate-50/50 transition-colors">
                        {Content}
                      </Link>
                    )
                  }

                  if ('onClick' in item && item.onClick) {
                    return (
                      <button key={item.label} onClick={item.onClick} className="w-full block hover:bg-slate-50/50 transition-colors">
                        {Content}
                      </button>
                    )
                  }

                  return <div key={item.label}>{Content}</div>
                })}
              </div>
            </SurfaceCard>
          </div>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="pt-4 px-1">
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full h-16 rounded-[2rem] bg-rose-50/50 border border-rose-100 text-rose-600 font-black text-sm hover:bg-rose-50 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          <LogOut className="h-5 w-5" />
          {isSigningOut ? 'Terminating Session...' : 'Terminate Session'}
        </button>
      </div>

      {/* Global Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[3rem] p-8 outline-none border-t-4 border-t-cyan-500 h-[auto] max-h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-8">
            <div className="h-1.5 w-12 bg-slate-200 rounded-full mx-auto mb-6" />
            <SheetTitle className="text-2xl font-black tracking-tighter text-slate-900 text-center">
              Update {activeField === 'full_name' ? 'Identity' : 
                    activeField === 'phone' ? 'Telemetry' : 
                    activeField === 'guardian_relationship' ? 'Architecture' : 
                    'Security Protocol'}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-8 max-w-md mx-auto">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
                {activeField === 'guardian_relationship' ? 'Relationship to Child' : 'New Value'}
              </Label>
              {activeField === 'guardian_relationship' ? (
                <select 
                  className="cc-native-field h-16 rounded-[1.5rem] border-slate-100 bg-slate-50 px-6 font-bold text-lg focus:ring-cyan-500/20" 
                  value={editValue} 
                  onChange={(e) => setEditValue(e.target.value)}
                >
                  <option value="">Select status</option>
                  {RELATIONSHIP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <Input 
                  className="h-16 rounded-[1.5rem] border-slate-100 bg-slate-50 px-6 text-xl font-bold text-slate-900 focus:ring-cyan-500/20" 
                  value={editValue} 
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={`Enter ${activeField?.replace(/_/g, ' ')}`}
                  autoFocus
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button 
                className="h-16 rounded-[2rem] font-black text-lg bg-slate-900 hover:bg-slate-800 text-white shadow-2xl transition-all active:scale-95" 
                onClick={saveField}
                disabled={isSaving}
              >
                {isSaving ? 'Safeguarding...' : 'Verify & Save'}
              </Button>
              <button 
                className="h-12 rounded-xl font-bold text-slate-400 hover:text-slate-600 transition-colors"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Sparkles({ className }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  )
}
