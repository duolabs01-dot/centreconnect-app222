'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !phone.trim()) {
      toast.error('Name and phone are required')
      return
    }
    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Please sign in again')

      if (isPrimary) {
        await supabase.from('parent_emergency_contacts').update({ is_primary: false }).eq('parent_id', user.id)
      }

      const { data, error } = await supabase
        .from('parent_emergency_contacts')
        .insert({
          parent_id: user.id,
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
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add contact')
    } finally {
      setSaving(false)
    }
  }

  async function removeContact(id: string) {
    setSaving(true)
    try {
      const { error } = await supabase.from('parent_emergency_contacts').delete().eq('id', id)
      if (error) throw error
      setContacts((prev) => prev.filter((c) => c.id !== id))
      toast.success('Removed')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to remove')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addContact} className="grid gap-3 rounded-xl border border-slate-200 bg-white/80 p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Relationship</Label>
          <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className="cc-native-field">
            <option value="">Select relationship</option>
            {RELATIONSHIP_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
          Set as primary
        </label>
        <Button type="submit" disabled={saving} className="sm:col-span-2">
          {saving ? 'Saving...' : 'Add Contact'}
        </Button>
      </form>

      <div className="space-y-2">
        {contacts.length === 0 ? (
          <p className="text-sm text-slate-600">No emergency contacts yet.</p>
        ) : (
          contacts.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
              <div>
                <p className="font-medium text-slate-900">
                  {contact.full_name} {contact.is_primary ? <span className="text-xs text-emerald-600">(Primary)</span> : null}
                </p>
                <p className="text-sm text-slate-600">{contact.phone}</p>
                {contact.relationship ? <p className="text-xs text-slate-500">{contact.relationship}</p> : null}
              </div>
              <Button variant="outline" onClick={() => removeContact(contact.id)} disabled={saving}>
                Remove
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
