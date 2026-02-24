'use client'

import Link from 'next/link'
import { useEffect, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const AVATAR_BUCKET = 'parent-avatars'
const MAX_AVATAR_SIZE_BYTES = 3 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const RELATIONSHIP_OPTIONS = ['Mother', 'Father', 'Guardian', 'Grandparent', 'Aunt/Uncle', 'Other']
const CONTACT_METHOD_OPTIONS = ['WhatsApp', 'Phone Call', 'SMS', 'Email']
const HOME_LANGUAGE_OPTIONS = [
  'English',
  'isiZulu',
  'isiXhosa',
  'Afrikaans',
  'Sesotho',
  'Setswana',
  'Sepedi',
  'Xitsonga',
  'Tshivenda',
  'isiNdebele',
  'siSwati',
  'Other',
]
const CONTACT_TIME_OPTIONS = ['Anytime', 'Morning (08:00-12:00)', 'Afternoon (12:00-17:00)', 'Evening (17:00-20:00)', 'Weekends']
const FORM_STEPS = ['About You', 'Where You Live', 'Your Priorities', 'Stay in Touch', 'Payment']

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  phone: z.string().trim().optional(),
  alt_phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  suburb: z.string().trim().optional(),
  city: z.string().trim().optional(),
  province: z.string().trim().optional(),
  emergency_contact_name: z.string().trim().optional(),
  emergency_contact_phone: z.string().trim().optional(),
  preferred_contact_method: z.string().trim().optional(),
  preferred_contact_times: z.string().trim().optional(),
  home_language: z.string().trim().optional(),
  guardian_relationship: z.string().trim().optional(),
  preferred_start_month: z.string().trim().optional(),
  max_monthly_budget: z.string().trim().optional(),
  transport_needed: z.boolean().optional(),
  preferred_radius_km: z.string().trim().optional(),
  preferred_suburbs: z.string().trim().optional(),
  id_verification_status: z.string().trim().optional(),
  medical_aid_name: z.string().trim().optional(),
  medical_aid_number: z.string().trim().optional(),
  consent_data_sharing: z.boolean().optional(),
  consent_notifications: z.boolean().optional(),
  notifications_application_updates: z.boolean().optional(),
  notifications_reminders: z.boolean().optional(),
  notifications_marketing: z.boolean().optional(),
  quiet_hours_start: z.string().trim().optional(),
  quiet_hours_end: z.string().trim().optional(),
  billing_email: z.string().trim().optional(),
  auto_pay_enabled: z.boolean().optional(),
})

type ParentProfileFormValues = z.infer<typeof profileSchema>

type ParentProfileEditorProps = {
  initial: {
    full_name: string
    phone: string
    avatar_url: string
    alt_phone: string
    address: string
    suburb: string
    city: string
    province: string
    emergency_contact_name: string
    emergency_contact_phone: string
    preferred_contact_method: string
    preferred_contact_times: string
    home_language: string
    guardian_relationship: string
    preferred_start_month: string
    max_monthly_budget: string
    transport_needed: boolean
    preferred_radius_km: string
    preferred_suburbs: string
    id_verification_status: string
    medical_aid_name: string
    medical_aid_number: string
    consent_data_sharing: boolean
    consent_notifications: boolean
    notifications_application_updates: boolean
    notifications_reminders: boolean
    notifications_marketing: boolean
    quiet_hours_start: string
    quiet_hours_end: string
    billing_email: string
    auto_pay_enabled: boolean
  }
}

type StepField = keyof ParentProfileFormValues

const REQUIRED_FIELDS_BY_STEP: StepField[][] = [
  ['full_name', 'guardian_relationship'],
  ['emergency_contact_name', 'emergency_contact_phone', 'preferred_start_month'],
  ['preferred_radius_km'],
  ['preferred_contact_method'],
  [],
]

const FIELD_LABELS: Partial<Record<StepField, string>> = {
  full_name: 'Full name',
  guardian_relationship: 'Relationship to child',
  emergency_contact_name: 'Emergency contact name',
  emergency_contact_phone: 'Emergency contact phone',
  preferred_start_month: 'Preferred start date',
  preferred_radius_km: 'Preferred radius',
  preferred_contact_method: 'Preferred contact method',
}

function hasReturningProfileData(initial: ParentProfileEditorProps['initial']) {
  const signalFields = [
    initial.alt_phone,
    initial.address,
    initial.suburb,
    initial.city,
    initial.province,
    initial.emergency_contact_name,
    initial.emergency_contact_phone,
    initial.preferred_contact_method,
    initial.preferred_contact_times,
    initial.home_language,
    initial.guardian_relationship,
    initial.preferred_start_month,
    initial.max_monthly_budget,
    initial.preferred_radius_km,
    initial.preferred_suburbs,
    initial.medical_aid_name,
    initial.medical_aid_number,
    initial.billing_email,
  ]

  return signalFields.some((value) => value.trim().length > 0)
}

function firstDayOfNextMonthIso() {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const year = nextMonth.getFullYear()
  const month = String(nextMonth.getMonth() + 1).padStart(2, '0')
  const day = String(nextMonth.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function withSmartDefaults(initial: ParentProfileEditorProps['initial']) {
  if (!hasReturningProfileData(initial)) {
    return initial
  }

  return {
    ...initial,
    guardian_relationship: initial.guardian_relationship || 'Guardian',
    home_language: initial.home_language || 'English',
    preferred_contact_method: initial.preferred_contact_method || 'WhatsApp',
    preferred_contact_times: initial.preferred_contact_times || 'Evening (17:00-20:00)',
    preferred_start_month: initial.preferred_start_month || firstDayOfNextMonthIso(),
    preferred_radius_km: initial.preferred_radius_km || '8',
  }
}

function isMissingRequired(value: string | undefined) {
  return !value || value.trim().length === 0
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'P'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase()
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function extensionFromFile(file: File) {
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  const parts = file.name.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg'
}

function normalizePreferredStartDate(value: string) {
  if (!value) return ''
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`
  return value
}

export function ParentProfileEditor({ initial }: ParentProfileEditorProps) {
  const router = useRouter()
  const supabase = createClient()
  const smartInitial = withSmartDefaults(initial)
  const [saving, setSaving] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [avatarPreview, setAvatarPreview] = useState(smartInitial.avatar_url)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [authEmail, setAuthEmail] = useState('')

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    clearErrors,
    setFocus,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ParentProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      ...smartInitial,
      preferred_start_month: normalizePreferredStartDate(smartInitial.preferred_start_month),
      preferred_radius_km: smartInitial.preferred_radius_km || '8',
    },
  })

  const currentName = watch('full_name') ?? smartInitial.full_name
  const radiusValue = watch('preferred_radius_km') || '8'
  const preferredContactTimesValue = watch('preferred_contact_times') || ''
  const knownContactTime = CONTACT_TIME_OPTIONS.includes(preferredContactTimesValue)
  const finalStepIndex = FORM_STEPS.length - 1
  const progressPercent = ((stepIndex + 1) / FORM_STEPS.length) * 100

  function getFirstMissingRequiredField(values: ParentProfileFormValues) {
    for (let step = 0; step < REQUIRED_FIELDS_BY_STEP.length; step += 1) {
      const fields = REQUIRED_FIELDS_BY_STEP[step]
      for (const field of fields) {
        const value = values[field]
        if (typeof value === 'string' && isMissingRequired(value)) {
          return { step, field }
        }
      }
    }
    return null
  }

  function jumpToMissingField(step: number, field: StepField) {
    const label = FIELD_LABELS[field] ?? 'This field'
    setStepIndex(step)
    setError(field, { type: 'manual', message: `${label} is required` })
    toast.error(`${label} is required`)
    setTimeout(() => setFocus(field), 0)
  }

  function goToNextStep() {
    const values = getValues()
    const missingField = REQUIRED_FIELDS_BY_STEP[stepIndex].find((field) => {
      const value = values[field]
      return typeof value === 'string' && isMissingRequired(value)
    })

    if (missingField) {
      jumpToMissingField(stepIndex, missingField)
      return
    }

    REQUIRED_FIELDS_BY_STEP[stepIndex].forEach((field) => clearErrors(field))
    setStepIndex((prev) => Math.min(finalStepIndex, prev + 1))
  }

  useEffect(() => {
    if (!avatarPreview?.startsWith('blob:')) return
    return () => URL.revokeObjectURL(avatarPreview)
  }, [avatarPreview])

  useEffect(() => {
    let active = true
    const authClient = createClient()
    void authClient.auth.getUser().then(({ data }) => {
      if (!active) return
      setAuthEmail(data.user?.email ?? '')
    })
    return () => {
      active = false
    }
  }, [])

  function onAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error('Use JPG, PNG, or WEBP')
      e.currentTarget.value = ''
      return
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      toast.error('Image must be under 3MB')
      e.currentTarget.value = ''
      return
    }
    const localUrl = URL.createObjectURL(file)
    setAvatarPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return localUrl
    })
    setAvatarFile(file)
    setRemoveAvatar(false)
  }

  const onSubmit = handleSubmit(async (values) => {
    const firstMissing = getFirstMissingRequiredField(values)
    if (firstMissing) {
      jumpToMissingField(firstMissing.step, firstMissing.field)
      return
    }

    REQUIRED_FIELDS_BY_STEP.flat().forEach((field) => clearErrors(field))
    setSaving(true)
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        toast.error('Please sign in again')
        router.push('/login?next=/parent/profile/edit')
        return
      }

      const fullName = values.full_name.trim()
      const phone = values.phone?.trim() || null
      let avatarUrl = initial.avatar_url?.trim() || null

      if (removeAvatar) {
        avatarUrl = null
      }

      if (avatarFile) {
        const ext = extensionFromFile(avatarFile)
        const storagePath = `${user.id}/${Date.now()}-${sanitizeFileName(avatarFile.name).replace(/\.[^/.]+$/, '')}.${ext}`
        const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(storagePath, avatarFile, {
          upsert: false,
          cacheControl: '3600',
          contentType: avatarFile.type,
        })
        if (uploadError) throw uploadError
        avatarUrl = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(storagePath).data.publicUrl
      }

      const profilePayload: Record<string, string | null> = {
        full_name: fullName,
        phone,
        avatar_url: avatarUrl,
      }

      let { error: profileError } = await supabase.from('user_profiles').update(profilePayload).eq('id', user.id)
      const missingAvatarColumn =
        profileError &&
        typeof profileError.message === 'string' &&
        profileError.message.includes("'avatar_url' column")
      if (missingAvatarColumn) {
        const { avatar_url: _ignored, ...fallbackPayload } = profilePayload
        const fallback = await supabase.from('user_profiles').update(fallbackPayload).eq('id', user.id)
        profileError = fallback.error
      }
      if (profileError) throw profileError

      const parsedBudget =
        values.max_monthly_budget && !Number.isNaN(Number(values.max_monthly_budget))
          ? Number(values.max_monthly_budget)
          : null
      const parsedRadius =
        values.preferred_radius_km && !Number.isNaN(Number(values.preferred_radius_km))
          ? Number(values.preferred_radius_km)
          : null
      const suburbList =
        values.preferred_suburbs
          ?.split(',')
          .map((v) => v.trim())
          .filter(Boolean) ?? []

      const { error: parentError } = await supabase.from('parents').upsert(
        {
          id: user.id,
          alt_phone: values.alt_phone?.trim() || null,
          address: values.address?.trim() || null,
          suburb: values.suburb?.trim() || null,
          city: values.city?.trim() || null,
          province: values.province?.trim() || null,
          emergency_contact_name: values.emergency_contact_name?.trim() || null,
          emergency_contact_phone: values.emergency_contact_phone?.trim() || null,
          preferred_contact_method: values.preferred_contact_method?.trim() || null,
          preferred_contact_times: values.preferred_contact_times?.trim() || null,
          home_language: values.home_language?.trim() || null,
          guardian_relationship: values.guardian_relationship?.trim() || null,
          preferred_start_month: values.preferred_start_month?.trim() || null,
          max_monthly_budget: parsedBudget,
          transport_needed: Boolean(values.transport_needed),
          preferred_radius_km: parsedRadius,
          preferred_suburbs: suburbList.length > 0 ? suburbList : null,
          id_verification_status: values.id_verification_status?.trim() || null,
          medical_aid_name: values.medical_aid_name?.trim() || null,
          medical_aid_number: values.medical_aid_number?.trim() || null,
          consent_data_sharing: Boolean(values.consent_data_sharing),
          consent_notifications: Boolean(values.consent_notifications),
          notifications_application_updates: Boolean(values.notifications_application_updates),
          notifications_reminders: Boolean(values.notifications_reminders),
          notifications_marketing: Boolean(values.notifications_marketing),
          quiet_hours_start: values.quiet_hours_start?.trim() || null,
          quiet_hours_end: values.quiet_hours_end?.trim() || null,
          billing_email: values.billing_email?.trim() || null,
          auto_pay_enabled: Boolean(values.auto_pay_enabled),
        },
        { onConflict: 'id' }
      )
      if (parentError) {
        const missingNewParentColumns =
          typeof parentError.message === 'string' &&
          (parentError.message.includes('schema cache') || parentError.message.includes('Could not find the'))

        if (missingNewParentColumns) {
          const fallbackParent = await supabase.from('parents').upsert(
            {
              id: user.id,
              alt_phone: values.alt_phone?.trim() || null,
              address: values.address?.trim() || null,
              suburb: values.suburb?.trim() || null,
              city: values.city?.trim() || null,
              province: values.province?.trim() || null,
              emergency_contact_name: values.emergency_contact_name?.trim() || null,
              emergency_contact_phone: values.emergency_contact_phone?.trim() || null,
            },
            { onConflict: 'id' }
          )
          if (fallbackParent.error) throw fallbackParent.error
        } else {
          throw parentError
        }
      }

      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone: phone ?? undefined,
          avatar_url: avatarUrl ?? undefined,
        },
      })

      await supabase.from('parent_security_events').insert({
        parent_id: user.id,
        event_type: 'profile_updated',
        details: 'Parent profile updated',
      })

      toast.success('Profile updated')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  })

  return (
    <Card className="border-slate-200">
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>
                Step {stepIndex + 1} of {FORM_STEPS.length}
              </span>
              <span>{FORM_STEPS[stepIndex]}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-cyan-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <input type="hidden" {...register('id_verification_status')} />

          {stepIndex === 0 ? (
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white/70 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Profile Photo</h3>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Profile photo preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-base font-semibold text-slate-500">
                    {initialsFromName(currentName)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={onAvatarChange} />
                <p className="text-xs text-slate-500">JPG, PNG, WEBP. Max 3MB.</p>
                {avatarPreview ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-rose-600 hover:underline"
                    onClick={() => {
                      setAvatarFile(null)
                      setRemoveAvatar(true)
                      setAvatarPreview('')
                    }}
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>
            </section>
          ) : null}

          {stepIndex === 0 ? (
            <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Basic Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" {...register('full_name')} />
                {errors.full_name ? <p className="text-xs text-red-600">{errors.full_name.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardian_relationship">Relationship to Child</Label>
                <select id="guardian_relationship" className="cc-native-field" {...register('guardian_relationship')}>
                  <option value="">Select relationship</option>
                  {RELATIONSHIP_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.guardian_relationship ? <p className="text-xs text-red-600">{errors.guardian_relationship.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Primary Phone</Label>
                <Input id="phone" {...register('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alt_phone">Alternative Phone</Label>
                <Input id="alt_phone" {...register('alt_phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="home_language">Home Language</Label>
                <select id="home_language" className="cc-native-field" {...register('home_language')}>
                  <option value="">Select home language</option>
                  {HOME_LANGUAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            </section>
          ) : null}

          {stepIndex === 1 ? (
            <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Home & Emergency</h3>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="suburb">Suburb</Label>
                <Input id="suburb" {...register('suburb')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Input id="province" {...register('province')} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input id="emergency_contact_name" {...register('emergency_contact_name')} />
                {errors.emergency_contact_name ? <p className="text-xs text-red-600">{errors.emergency_contact_name.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input id="emergency_contact_phone" {...register('emergency_contact_phone')} />
                {errors.emergency_contact_phone ? <p className="text-xs text-red-600">{errors.emergency_contact_phone.message}</p> : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_start_month">Preferred Start Date</Label>
              <Input id="preferred_start_month" type="date" {...register('preferred_start_month')} />
              {errors.preferred_start_month ? <p className="text-xs text-red-600">{errors.preferred_start_month.message}</p> : null}
            </div>
            </section>
          ) : null}

          {stepIndex === 2 ? (
            <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Enrollment Preferences</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="max_monthly_budget">Max Monthly Budget (R)</Label>
                <Input id="max_monthly_budget" type="number" min="0" step="1" {...register('max_monthly_budget')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_radius_km">Preferred Radius (km)</Label>
                <div className="space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <input
                    id="preferred_radius_km"
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={radiusValue}
                    onChange={(event) => setValue('preferred_radius_km', event.target.value, { shouldDirty: true })}
                    className="w-full accent-cyan-600"
                  />
                  <p className="text-sm font-medium text-slate-800">{radiusValue} km</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_suburbs">Preferred Suburbs (comma separated)</Label>
                <Input id="preferred_suburbs" placeholder="Alexandra, Sandton" {...register('preferred_suburbs')} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...register('transport_needed')} />
              Transport needed
            </label>
            </section>
          ) : null}

          {stepIndex === 3 ? (
            <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Communication & Notification Controls</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="preferred_contact_method">Preferred Contact Method</Label>
                <select id="preferred_contact_method" className="cc-native-field" {...register('preferred_contact_method')}>
                  <option value="">Select contact method</option>
                  {CONTACT_METHOD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.preferred_contact_method ? <p className="text-xs text-red-600">{errors.preferred_contact_method.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_contact_times">Preferred Contact Times</Label>
                <select id="preferred_contact_times" className="cc-native-field" {...register('preferred_contact_times')}>
                  <option value="">Select time preference</option>
                  {!knownContactTime && preferredContactTimesValue ? (
                    <option value={preferredContactTimesValue}>{preferredContactTimesValue}</option>
                  ) : null}
                  {CONTACT_TIME_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet_hours_start">Quiet Hours Start</Label>
                <Input id="quiet_hours_start" type="time" {...register('quiet_hours_start')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet_hours_end">Quiet Hours End</Label>
                <Input id="quiet_hours_end" type="time" {...register('quiet_hours_end')} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" {...register('consent_data_sharing')} />
                Consent to data sharing
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" {...register('consent_notifications')} />
                Consent to notifications
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" {...register('notifications_application_updates')} />
                Application updates
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" {...register('notifications_reminders')} />
                Reminders
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input type="checkbox" {...register('notifications_marketing')} />
                Marketing messages
              </label>
            </div>
            </section>
          ) : null}

          {stepIndex === 4 ? (
            <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Medical Aid & Billing</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="medical_aid_name">Medical Aid Name</Label>
                <Input id="medical_aid_name" {...register('medical_aid_name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medical_aid_number">Medical Aid Number</Label>
                <Input id="medical_aid_number" {...register('medical_aid_number')} />
              </div>
              <div className="space-y-2">
                <input type="hidden" {...register('billing_email')} />
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Email Address
                  </Label>
                  <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    {authEmail || initial.billing_email || 'No email available'}. Email cannot be changed here. Contact support to update.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
                <input type="checkbox" {...register('auto_pay_enabled')} />
                Enable Auto-pay
              </label>
            </div>
            </section>
          ) : null}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button type="button" variant="outline" disabled={stepIndex === 0 || saving} onClick={() => setStepIndex((prev) => prev - 1)}>
              Back
            </Button>
            {stepIndex < finalStepIndex ? (
              <Button type="button" disabled={saving} onClick={goToNextStep}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

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

type EditableField = 'full_name' | 'phone' | 'guardian_relationship' | 'emergency_contact_name'
type ToggleField = 'notifications_application_updates' | 'notifications_reminders'

const EDITABLE_FIELD_CONFIG: Record<EditableField, { label: string; type: 'text' | 'tel'; required?: boolean }> = {
  full_name: { label: 'Full Name', type: 'text', required: true },
  phone: { label: 'Phone', type: 'tel' },
  guardian_relationship: { label: 'Role', type: 'text' },
  emergency_contact_name: { label: 'Emergency Contact', type: 'text' },
}

export function ParentProfileHub({ initial }: { initial: ParentProfileHubInitial }) {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(initial)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeField, setActiveField] = useState<EditableField | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [savingField, setSavingField] = useState<EditableField | null>(null)
  const [savingToggle, setSavingToggle] = useState<ToggleField | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const completedFields = [
    profile.full_name,
    profile.phone,
    profile.emergency_contact_name,
    profile.emergency_contact_phone,
  ].filter(Boolean).length
  const totalFields = 4
  const completionPct = Math.round((completedFields / totalFields) * 100)
  const activeFieldConfig = activeField ? EDITABLE_FIELD_CONFIG[activeField] : null

  function openFieldEditor(field: EditableField) {
    setActiveField(field)
    setDraftValue(profile[field] ?? '')
    setSheetOpen(true)
  }

  function closeFieldEditor() {
    if (savingField) return
    setSheetOpen(false)
    setActiveField(null)
    setDraftValue('')
  }

  async function saveField() {
    if (!activeField) return
    const config = EDITABLE_FIELD_CONFIG[activeField]
    const nextValue = draftValue.trim()

    if (config.required && !nextValue) {
      toast.error(`${config.label} is required`)
      return
    }

    const field = activeField
    const previousValue = profile[field]
    if (nextValue === previousValue) {
      closeFieldEditor()
      return
    }

    setProfile((current) => ({
      ...current,
      [field]: nextValue,
    }))
    setSavingField(field)
    setSheetOpen(false)

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) throw new Error('Please sign in again to update your profile.')

      if (field === 'full_name' || field === 'phone') {
        const profilePayload: { full_name?: string | null; phone?: string | null } = {}
        if (field === 'full_name') profilePayload.full_name = nextValue || null
        if (field === 'phone') profilePayload.phone = nextValue || null

        const { error: userProfileError } = await supabase.from('user_profiles').update(profilePayload).eq('id', user.id)
        if (userProfileError) throw userProfileError

        if (field === 'full_name') {
          const { error: authUpdateError } = await supabase.auth.updateUser({
            data: { full_name: nextValue || undefined },
          })
          if (authUpdateError) throw authUpdateError
        } else {
          const { error: authUpdateError } = await supabase.auth.updateUser({
            data: { phone: nextValue || undefined },
          })
          if (authUpdateError) throw authUpdateError
        }
      } else {
        const parentPayload: { guardian_relationship?: string | null; emergency_contact_name?: string | null } = {}
        if (field === 'guardian_relationship') parentPayload.guardian_relationship = nextValue || null
        if (field === 'emergency_contact_name') parentPayload.emergency_contact_name = nextValue || null

        const { error: parentError } = await supabase
          .from('parents')
          .upsert({ id: user.id, ...parentPayload }, { onConflict: 'id' })
        if (parentError) throw parentError
      }

      toast.success('Changes saved')
    } catch (error: any) {
      setProfile((current) => ({
        ...current,
        [field]: previousValue,
      }))
      toast.error(error?.message || 'Failed to save changes')
    } finally {
      setSavingField((current) => (current === field ? null : current))
      setActiveField(null)
      setDraftValue('')
    }
  }

  async function togglePreference(field: ToggleField) {
    const previousValue = profile[field]
    const nextValue = !previousValue

    setProfile((current) => ({
      ...current,
      [field]: nextValue,
    }))
    setSavingToggle(field)

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Please sign in again to update your profile.')

      const { error: parentError } = await supabase
        .from('parents')
        .upsert({ id: user.id, [field]: nextValue }, { onConflict: 'id' })
      if (parentError) throw parentError

      toast.success('Preference updated')
    } catch (error: any) {
      setProfile((current) => ({
        ...current,
        [field]: previousValue,
      }))
      toast.error(error?.message || 'Failed to update preference')
    } finally {
      setSavingToggle((current) => (current === field ? null : current))
    }
  }

  async function handleSignOut() {
    if (isSigningOut) return
    setIsSigningOut(true)

    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(error.message || 'Failed to sign out')
      setIsSigningOut(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 mb-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-xl font-bold text-white">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="Profile photo" className="h-full w-full object-cover" />
          ) : profile.full_name ? (
            profile.full_name.charAt(0).toUpperCase()
          ) : (
            '?'
          )}
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">{profile.full_name || 'Your Name'}</p>
          <p className="text-sm text-slate-500">Manage your family profile</p>
        </div>
      </div>

      <p className="text-sm font-semibold text-slate-700">Profile {completionPct}% complete</p>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-slate-500">Profile completeness</p>
          <p className="text-xs font-bold text-cyan-700">{completionPct}%</p>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        {completionPct < 100 && (
          <p className="mt-1 text-xs text-slate-400">Complete your profile to improve your application outcomes.</p>
        )}
      </div>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Account</p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
            onClick={() => openFieldEditor('full_name')}
            disabled={savingField === 'full_name'}
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">Full Name</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-500">{profile.full_name || 'Not set'}</p>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
            onClick={() => openFieldEditor('phone')}
            disabled={savingField === 'phone'}
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">Phone</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-500">{profile.phone || 'Not set'}</p>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </button>
          <div className="flex w-full items-center justify-between px-4 py-3.5 text-left">
            <div>
              <p className="text-sm font-semibold text-slate-900">Email</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-500">{profile.email || 'Not set'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Family</p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
            onClick={() => openFieldEditor('guardian_relationship')}
            disabled={savingField === 'guardian_relationship'}
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">Role</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-500">{profile.guardian_relationship || 'Not set'}</p>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
            onClick={() => openFieldEditor('emergency_contact_name')}
            disabled={savingField === 'emergency_contact_name'}
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">Emergency Contact</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-500">{profile.emergency_contact_name || 'Not set'}</p>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Children</p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          <Link
            href="/parent/children"
            className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">My Children</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-100 px-1.5 text-xs font-semibold text-cyan-700">
                {profile.child_count}
              </span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </Link>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Documents</p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          <Link
            href="/parent/profile/documents"
            className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">Documents Vault</p>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </Link>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Security</p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          <Link
            href="/parent/profile/security"
            className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">Security & Sign-in Activity</p>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </Link>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notifications</p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          <div className="flex w-full items-center justify-between px-4 py-3.5 text-left">
            <div>
              <p className="text-sm font-semibold text-slate-900">Application updates</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={profile.notifications_application_updates}
              disabled={savingToggle === 'notifications_application_updates'}
              onClick={() => togglePreference('notifications_application_updates')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                profile.notifications_application_updates ? 'bg-cyan-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  profile.notifications_application_updates ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <div className="flex w-full items-center justify-between px-4 py-3.5 text-left">
            <div>
              <p className="text-sm font-semibold text-slate-900">Reminders</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={profile.notifications_reminders}
              disabled={savingToggle === 'notifications_reminders'}
              onClick={() => togglePreference('notifications_reminders')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                profile.notifications_reminders ? 'bg-cyan-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  profile.notifications_reminders ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full px-4 py-3.5 text-center text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 active:bg-red-100"
          >
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
      </section>

      <Sheet open={sheetOpen} onOpenChange={(isOpen) => (!isOpen ? closeFieldEditor() : null)}>
        <SheetContent side="bottom" className="rounded-t-3xl border-slate-200 pb-8">
          {activeField && activeFieldConfig ? (
            <div className="space-y-5 pr-8">
              <SheetHeader className="text-left">
                <SheetTitle>{activeFieldConfig.label}</SheetTitle>
              </SheetHeader>
              <Input
                value={draftValue}
                onChange={(event) => setDraftValue(event.target.value)}
                type={activeFieldConfig.type}
                className="cc-native-field"
                disabled={Boolean(savingField)}
              />
              <Button type="button" className="w-full" disabled={Boolean(savingField)} onClick={saveField}>
                {savingField ? 'Saving...' : 'Save'}
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
