'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { completeOnboarding } from './actions'

type Step = 1 | 2 | 3 | 4
type InviteRole = 'ecd_admin' | 'ecd_staff'

type MembershipRow = {
  ecd_id: string
  ecd_centres:
    | {
        id: string
        name: string | null
        slug: string | null
        tagline: string | null
        phone: string | null
        address: string | null
        suburb: string | null
        onboarding_complete: boolean | null
      }
    | Array<{
        id: string
        name: string | null
        slug: string | null
        tagline: string | null
        phone: string | null
        address: string | null
        suburb: string | null
        onboarding_complete: boolean | null
      }>
    | null
}

type FormDataState = {
  centreName: string
  tagline: string
  phone: string
  address: string
  suburb: string
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function EcdOnboardingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [loadingCentre, setLoadingCentre] = useState(true)
  const [saving, setSaving] = useState(false)

  const [ecdId, setEcdId] = useState<string | null>(null)
  const [slug, setSlug] = useState<string>('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InviteRole>('ecd_staff')

  const [formData, setFormData] = useState<FormDataState>({
    centreName: '',
    tagline: '',
    phone: '',
    address: '',
    suburb: '',
  })

  useEffect(() => {
    let active = true

    async function bootstrap() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!active) return
      if (!user) {
        router.replace('/ecd/login')
        return
      }

      const { data: membership, error } = await supabase
        .from('ecd_admins')
        .select('ecd_id, ecd_centres(id, name, slug, tagline, phone, address, suburb, onboarding_complete)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (!active) return

      if (error || !membership) {
        toast.error('Unable to load centre onboarding profile.')
        setLoadingCentre(false)
        return
      }

      const typedMembership = membership as MembershipRow
      const centre = normalizeOne(typedMembership.ecd_centres)
      if (!centre) {
        toast.error('No centre profile found.')
        setLoadingCentre(false)
        return
      }

      if (centre.onboarding_complete) {
        router.replace('/ecd/dashboard')
        return
      }

      setEcdId(typedMembership.ecd_id)
      setSlug(centre.slug ?? '')
      setFormData({
        centreName: centre.name ?? '',
        tagline: centre.tagline ?? '',
        phone: centre.phone ?? '',
        address: centre.address ?? '',
        suburb: centre.suburb ?? '',
      })
      setLoadingCentre(false)
    }

    void bootstrap()
    return () => {
      active = false
    }
  }, [router, supabase])

  function setField<K extends keyof FormDataState>(key: K, value: FormDataState[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  async function saveStepOne() {
    if (!ecdId) return
    if (!formData.centreName.trim()) {
      toast.error('Centre name is required')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('ecd_centres')
      .update({
        name: formData.centreName.trim(),
        tagline: formData.tagline.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        suburb: formData.suburb.trim() || null,
      })
      .eq('id', ecdId)

    setSaving(false)
    if (error) {
      toast.error(error.message || 'Failed to save step')
      return
    }
    setCurrentStep(2)
  }

  async function uploadImage(file: File, pathPrefix: 'logo' | 'cover') {
    if (!ecdId) throw new Error('Missing centre ID')
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^/.]+$/, '')
    const path = `${ecdId}/${pathPrefix}-${Date.now()}-${sanitizedName}.${extension}`
    const { error } = await supabase.storage.from('ecd-media').upload(path, file, { upsert: true })
    if (error) throw error
    return supabase.storage.from('ecd-media').getPublicUrl(path).data.publicUrl
  }

  async function saveStepTwo() {
    if (!ecdId) return
    setSaving(true)
    try {
      const updatePayload: { logo_url?: string; cover_image_url?: string } = {}
      if (logoFile) updatePayload.logo_url = await uploadImage(logoFile, 'logo')
      if (coverFile) updatePayload.cover_image_url = await uploadImage(coverFile, 'cover')

      if (Object.keys(updatePayload).length > 0) {
        const { error } = await supabase.from('ecd_centres').update(updatePayload).eq('id', ecdId)
        if (error) throw error
      }

      setCurrentStep(3)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save images')
    } finally {
      setSaving(false)
    }
  }

  async function saveStepThree() {
    if (!ecdId) return
    if (!inviteEmail.trim()) {
      toast.error('Enter an email or skip this step')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/ecd/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ecdId,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string; linkedExistingUser?: boolean }
      if (!response.ok) {
        toast.error(payload.error || 'Failed to invite staff member')
        return
      }

      toast.success(payload.linkedExistingUser ? 'Existing account linked and invited' : 'Invitation sent')
      setCurrentStep(4)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to invite staff member')
    } finally {
      setSaving(false)
    }
  }

  function skipTo(step: Step) {
    setCurrentStep(step)
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://centerconnect.co.za').replace(/\/$/, '')
  const publicUrl = slug ? `${appUrl}/c/${slug}` : `${appUrl}/c/your-centre`

  if (loadingCentre) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Loading onboarding...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">CentreConnect</p>
          <p className="mt-1 text-sm text-slate-600">Step {currentStep} of 4</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((dot) => (
              <span
                key={dot}
                className={`h-2.5 w-2.5 rounded-full ${dot <= currentStep ? 'bg-cyan-600' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-elevation-2)]">
          {currentStep === 1 ? (
            <div className="space-y-4">
              <h1 className="text-xl font-bold text-slate-900">Welcome - Let&apos;s set up your centre</h1>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Centre Name</label>
                <input
                  className="cc-native-field"
                  value={formData.centreName}
                  onChange={(event) => setField('centreName', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tagline</label>
                <input
                  className="cc-native-field"
                  value={formData.tagline}
                  onChange={(event) => setField('tagline', event.target.value)}
                  placeholder="A short description of your centre"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone Number</label>
                <input
                  className="cc-native-field"
                  value={formData.phone}
                  onChange={(event) => setField('phone', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</label>
                <input
                  className="cc-native-field"
                  value={formData.address}
                  onChange={(event) => setField('address', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suburb</label>
                <input
                  className="cc-native-field"
                  value={formData.suburb}
                  onChange={(event) => setField('suburb', event.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={saveStepOne}
                disabled={saving}
                className="w-full rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save and Continue'}
              </button>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Your centre&apos;s identity</h2>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Logo Upload</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                  className="cc-native-field"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cover Image Upload</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
                  className="cc-native-field"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveStepTwo}
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save and Continue'}
                </button>
                <button
                  type="button"
                  onClick={() => skipTo(3)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Skip for now
                </button>
              </div>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Invite your first staff member</h2>
              <p className="text-sm text-slate-600">Optional: invite someone now to help run your centre.</p>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Staff Email</label>
                <input
                  type="email"
                  className="cc-native-field"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</label>
                <select
                  className="cc-native-field"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as InviteRole)}
                >
                  <option value="ecd_admin">ecd_admin</option>
                  <option value="ecd_staff">ecd_staff</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveStepThree}
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {saving ? 'Sending...' : 'Send Invite and Continue'}
                </button>
                <button
                  type="button"
                  onClick={() => skipTo(4)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Skip for now
                </button>
              </div>
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">You&apos;re live!</h2>
              <p className="text-sm text-slate-600">Your centre is ready on CentreConnect.</p>
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Public Profile URL</p>
                <p className="mt-1 break-all text-sm font-semibold text-cyan-900">{publicUrl}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(publicUrl)
                    toast.success('Link copied')
                  } catch {
                    toast.error('Could not copy link')
                  }
                }}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Copy Link
              </button>
              <form action={completeOnboarding}>
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-cyan-600 px-4 py-3 text-base font-bold text-white hover:bg-cyan-700"
                >
                  Open My Dashboard \u2192
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

