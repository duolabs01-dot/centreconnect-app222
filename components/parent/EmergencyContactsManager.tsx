'use client'

import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ensureParentReady } from '@/lib/auth/ensure-parent-ready'
import { toFriendlyClientError } from '@/lib/supabase/client-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SurfaceCard } from '@/components/ui/surface-card'
import { UserPlus, Shield, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const RELATIONSHIP_OPTIONS = ['Parent', 'Grandparent', 'Sibling', 'Aunt/Uncle', 'Family Friend', 'Other']

type EmergencyContact = {
  id: string
  full_name: string
  phone: string
  relationship: string | null
  is_primary: boolean
}

type Props = {
  initialContacts: EmergencyContact[]
}

export function EmergencyContactsManager({ initialContacts }: Props) {
  const supabase = createClient()
  const [contacts, setContacts] = useState(initialContacts)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [relationship, setRelationship] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)

  async function addContact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!fullName.trim() || !phone.trim()) {
      toast.error('Name and phone are required')
      return
    }
    setSaving(true)
    try {
      const ready = await ensureParentReady(supabase)
      if (!ready.ok) throw new Error(ready.error)

      if (isPrimary) {
        await supabase
          .from('parent_emergency_contacts')
          .update({ is_primary: false })
          .eq('parent_id', ready.userId)
      }

      const { data, error } = await supabase
        .from('parent_emergency_contacts')
        .insert({
          parent_id: ready.userId,
          full_name: fullName.trim(),
          phone: phone.trim(),
          relationship: relationship.trim() || null,
          is_primary: isPrimary,
        })
        .select('id,full_name,phone,relationship,is_primary')
        .single()
      if (error) throw error

      setContacts((prev) => [data as EmergencyContact, ...prev.map((c) => (isPrimary ? { ...c, is_primary: false } : c))])
      setFullName('')
      setPhone('')
      setRelationship('')
      setIsPrimary(false)
      toast.success('Emergency contact added')
    } catch (error: unknown) {
      toast.error(toFriendlyClientError(error, 'Failed to add contact'))
    } finally {
      setSaving(false)
    }
  }

  async function removeContact(id: string) {
    setSaving(true)
    try {
      const ready = await ensureParentReady(supabase)
      if (!ready.ok) throw new Error(ready.error)

      const { error } = await supabase
        .from('parent_emergency_contacts')
        .delete()
        .eq('id', id)
        .eq('parent_id', ready.userId)
      if (error) throw error
      setContacts((prev) => prev.filter((c) => c.id !== id))
      toast.success('Removed')
    } catch (error: unknown) {
      toast.error(toFriendlyClientError(error, 'Failed to remove'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cc-stack space-y-8">
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <UserPlus className="h-4 w-4 text-cyan-600" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Add Protocol</p>
        </div>
        <SurfaceCard className="p-6">
          <form onSubmit={addContact} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-900 ml-1">Full Name</Label>
                <Input 
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-4"
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="e.g. Sipho Gumede"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-900 ml-1">Phone</Label>
                <Input 
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-4"
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="082 000 0000"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-900 ml-1">Relationship</Label>
                <select 
                  value={relationship} 
                  onChange={(e) => setRelationship(e.target.value)} 
                  className="cc-native-field flex border bg-gradient-to-b from-white to-slate-50/90 py-2 shadow-[var(--shadow-elevation-1)] transition-[border-color,box-shadow,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 h-14 rounded-2xl border-slate-100 bg-slate-50 px-4 text-sm font-bold text-slate-900 focus:ring-cyan-500/20 w-full appearance-none"
                >
                  <option value="">Select relationship</option>
                  {RELATIONSHIP_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isPrimary} 
                      onChange={(e) => setIsPrimary(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </div>
                  <span className="text-sm font-bold text-slate-700">Set as Primary Contact</span>
                </label>
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={saving} 
              className="w-full h-16 rounded-[2rem] font-black text-lg bg-slate-900 hover:bg-slate-800 text-white shadow-2xl transition-all active:scale-95"
            >
              {saving ? 'Safeguarding...' : 'Register Contact'}
            </Button>
          </form>
        </SurfaceCard>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Shield className="h-4 w-4 text-emerald-600" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Trusted Network</p>
        </div>
        <div className="space-y-3">
          {contacts.length === 0 ? (
            <SurfaceCard className="p-12 text-center border-dashed border-2 bg-slate-50/50">
              <Shield className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-500 italic">No emergency protocols defined yet.</p>
            </SurfaceCard>
          ) : (
            contacts.map((contact) => (
              <SurfaceCard key={contact.id} className={cn("p-5 border-l-4 transition-all", contact.is_primary ? "border-l-emerald-500 bg-emerald-50/5" : "border-l-slate-200")}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 tracking-tight">{contact.full_name}</p>
                      {contact.is_primary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-tight">
                      {contact.relationship || 'Verified Contact'} • {contact.phone}
                    </p>
                  </div>
                  <button 
                    onClick={() => removeContact(contact.id)} 
                    disabled={saving}
                    className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors active:scale-90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </SurfaceCard>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
