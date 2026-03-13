'use client'

import { useMemo, useState, useTransition, type ComponentType } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Bot, CheckCircle2, FileImage, HeartPulse, ShieldCheck, Sparkles, UserRoundPlus, Users } from 'lucide-react'
import { AiSuggestedBadge } from '@/components/ui/ai-suggested-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  bulkCreateExistingChildrenAction,
  extractChildDocumentWithGeminiAction,
  saveTempChildProfileAndInviteParentAction,
  type ExistingChildBulkDraft,
  type GeminiExtractionResult,
} from './actions'

type ChildEnrollmentWizardProps = {
  centreName: string
  classes: Array<{ id: string; name: string; age_group: string | null }>
}

type WizardStep = 'basic' | 'medical' | 'guardians' | 'documents'
type ChildDocumentType = 'birth_certificate' | 'medical_card' | 'immunization_record'
type ChildConfidenceMap = NonNullable<GeminiExtractionResult['confidence']>
type GuardianContactDraft = {
  full_name: string
  relationship: string
  phone: string
  email: string
  can_pickup: boolean
}

type EmergencyContactDraft = {
  full_name: string
  relationship: string
  phone: string
  notes: string
}

const STEPS: Array<{ id: WizardStep; label: string; hint: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'basic', label: 'Basic Info', hint: 'Child profile core details', icon: UserRoundPlus },
  { id: 'medical', label: 'Medical', hint: 'Health and support fields', icon: HeartPulse },
  { id: 'guardians', label: 'Guardians', hint: 'Parent and caregiver contacts', icon: Users },
  { id: 'documents', label: 'Documents', hint: 'AI extraction + review', icon: FileImage },
]

type WizardState = {
  first_name: string
  last_name: string
  enrollment_start_date: string
  date_of_birth: string
  class_id: string
  gender: string
  blood_type: string
  doctor_name: string
  medical_aid_number: string
  immunization_status: string
  immunization_due_date: string
  immunization_notes: string
  emergency_contact_name: string
  emergency_contact_phone: string
  dietary_restrictions: string
  special_needs_notes: string
  development_notes: string
  last_checkup_date: string
  allergies_text: string
  medical_conditions_text: string
  medications_text: string
  parent_name: string
  parent_phone: string
  parent_email: string
  secondary_guardian_name: string
  secondary_guardian_phone: string
  secondary_guardian_email: string
  ai_review_notes: string
}

const DEFAULT_STATE: WizardState = {
  first_name: '',
  last_name: '',
  enrollment_start_date: '',
  date_of_birth: '',
  class_id: '',
  gender: '',
  blood_type: '',
  doctor_name: '',
  medical_aid_number: '',
  immunization_status: '',
  immunization_due_date: '',
  immunization_notes: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  dietary_restrictions: '',
  special_needs_notes: '',
  development_notes: '',
  last_checkup_date: '',
  allergies_text: '',
  medical_conditions_text: '',
  medications_text: '',
  parent_name: '',
  parent_phone: '',
  parent_email: '',
  secondary_guardian_name: '',
  secondary_guardian_phone: '',
  secondary_guardian_email: '',
  ai_review_notes: '',
}

const DEFAULT_GUARDIAN_CONTACT: GuardianContactDraft = {
  full_name: '',
  relationship: 'parent',
  phone: '',
  email: '',
  can_pickup: true,
}

const DEFAULT_EMERGENCY_CONTACT: EmergencyContactDraft = {
  full_name: '',
  relationship: 'family',
  phone: '',
  notes: '',
}

function listToArray(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function arrayToCsv(value?: string[]) {
  return value && value.length > 0 ? value.join(', ') : ''
}

async function compressImageForBulkExtract(file: File) {
  if (!file.type.startsWith('image/')) return file

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image()
      nextImage.onload = () => resolve(nextImage)
      nextImage.onerror = () => reject(new Error('Could not read image for upload optimization.'))
      nextImage.src = objectUrl
    })

    const maxDimension = 1600
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return file

    context.drawImage(image, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    })

    if (!blob || blob.size >= file.size) return file

    const baseName = file.name.replace(/\.[^/.]+$/, '')
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function mergeAiSuggestions(
  current: GeminiExtractionResult['prefill'],
  incoming: GeminiExtractionResult['prefill']
) {
  return {
    ...(current ?? {}),
    ...(incoming ?? {}),
    allergies: incoming?.allergies ?? current?.allergies,
    medical_conditions: incoming?.medical_conditions ?? current?.medical_conditions,
    medications: incoming?.medications ?? current?.medications,
  }
}

function mergeAiConfidence(current: GeminiExtractionResult['confidence'], incoming: GeminiExtractionResult['confidence']) {
  return {
    ...(current ?? {}),
    ...(incoming ?? {}),
  }
}

function getInputAiClass(confidence: number | undefined) {
  return confidence ? 'border-teal-300 ring-2 ring-teal-100' : ''
}

export function ChildEnrollmentWizard({ centreName, classes }: ChildEnrollmentWizardProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState<WizardState>(DEFAULT_STATE)
  const [guardianContacts, setGuardianContacts] = useState<GuardianContactDraft[]>([DEFAULT_GUARDIAN_CONTACT])
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContactDraft[]>([DEFAULT_EMERGENCY_CONTACT])
  const [birthCertificateFile, setBirthCertificateFile] = useState<File | null>(null)
  const [medicalCardFile, setMedicalCardFile] = useState<File | null>(null)
  const [immunizationRecordFile, setImmunizationRecordFile] = useState<File | null>(null)
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [bulkDrafts, setBulkDrafts] = useState<ExistingChildBulkDraft[]>([])
  const [bulkSummary, setBulkSummary] = useState<string>('')
  const [aiSuggestion, setAiSuggestion] = useState<GeminiExtractionResult['prefill']>()
  const [aiConfidence, setAiConfidence] = useState<GeminiExtractionResult['confidence']>()
  const [documentUrls, setDocumentUrls] = useState<Partial<Record<ChildDocumentType, string>>>({})
  const [savedResult, setSavedResult] = useState<{ tempProfileId?: string; whatsappHref?: string } | null>(null)
  const [isExtracting, startExtractTransition] = useTransition()
  const [isBulkExtracting, startBulkExtractTransition] = useTransition()
  const [isBulkSaving, startBulkSaveTransition] = useTransition()
  const [isSaving, startSaveTransition] = useTransition()

  const activeStep = STEPS[stepIndex]
  const progress = useMemo(() => Math.round(((stepIndex + 1) / STEPS.length) * 100), [stepIndex])
  const confidenceMap = aiConfidence as ChildConfidenceMap | undefined

  function fieldConfidence(field: keyof ChildConfidenceMap) {
    return confidenceMap?.[field]
  }

  function updateField<K extends keyof WizardState>(field: K, value: WizardState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateGuardianContact(index: number, patch: Partial<GuardianContactDraft>) {
    setGuardianContacts((current) => current.map((entry, idx) => (idx === index ? { ...entry, ...patch } : entry)))
  }

  function addGuardianContact() {
    setGuardianContacts((current) => [...current, DEFAULT_GUARDIAN_CONTACT])
  }

  function removeGuardianContact(index: number) {
    setGuardianContacts((current) => {
      const next = current.filter((_, idx) => idx !== index)
      return next.length > 0 ? next : [DEFAULT_GUARDIAN_CONTACT]
    })
  }

  function updateEmergencyContact(index: number, patch: Partial<EmergencyContactDraft>) {
    setEmergencyContacts((current) => current.map((entry, idx) => (idx === index ? { ...entry, ...patch } : entry)))
  }

  function addEmergencyContact() {
    setEmergencyContacts((current) => [...current, DEFAULT_EMERGENCY_CONTACT])
  }

  function removeEmergencyContact(index: number) {
    setEmergencyContacts((current) => {
      const next = current.filter((_, idx) => idx !== index)
      return next.length > 0 ? next : [DEFAULT_EMERGENCY_CONTACT]
    })
  }

  function goToNextStep() {
    if (activeStep.id === 'basic') {
      if (!form.first_name.trim() || !form.last_name.trim() || !form.enrollment_start_date) {
        toast.error('Add first name, last name, and start date before moving on.')
        return
      }
    }

    if (activeStep.id === 'guardians') {
      const hasGuardianPhone = guardianContacts.some((entry) => entry.phone.trim().length >= 7)
      if (!hasGuardianPhone) {
        toast.error('Add at least one guardian phone number before moving on.')
        return
      }
    }

    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  function goToPreviousStep() {
    setStepIndex((prev) => Math.max(prev - 1, 0))
  }

  function applyAiPrefill() {
    if (!aiSuggestion) {
      toast.error('No AI suggestion to apply yet.')
      return
    }

    setForm((prev) => ({
      ...prev,
      first_name: aiSuggestion.first_name ?? prev.first_name,
      last_name: aiSuggestion.last_name ?? prev.last_name,
      date_of_birth: aiSuggestion.date_of_birth ?? prev.date_of_birth,
      blood_type: aiSuggestion.blood_type ?? prev.blood_type,
      doctor_name: aiSuggestion.doctor_name ?? prev.doctor_name,
      medical_aid_number: aiSuggestion.medical_aid_number ?? prev.medical_aid_number,
      immunization_status: prev.immunization_status,
      immunization_due_date: prev.immunization_due_date,
      immunization_notes: prev.immunization_notes,
      emergency_contact_name: aiSuggestion.emergency_contact_name ?? prev.emergency_contact_name,
      emergency_contact_phone: aiSuggestion.emergency_contact_phone ?? prev.emergency_contact_phone,
      dietary_restrictions: aiSuggestion.dietary_restrictions ?? prev.dietary_restrictions,
      special_needs_notes: aiSuggestion.special_needs_notes ?? prev.special_needs_notes,
      development_notes: aiSuggestion.development_notes ?? prev.development_notes,
      last_checkup_date: aiSuggestion.last_checkup_date ?? prev.last_checkup_date,
      allergies_text: aiSuggestion.allergies ? arrayToCsv(aiSuggestion.allergies) : prev.allergies_text,
      medical_conditions_text: aiSuggestion.medical_conditions
        ? arrayToCsv(aiSuggestion.medical_conditions)
        : prev.medical_conditions_text,
      medications_text: aiSuggestion.medications ? arrayToCsv(aiSuggestion.medications) : prev.medications_text,
    }))

    if (aiSuggestion.emergency_contact_name || aiSuggestion.emergency_contact_phone) {
      setEmergencyContacts((current) => {
        const next = [...current]
        const first = next[0] ?? DEFAULT_EMERGENCY_CONTACT
        next[0] = {
          ...first,
          full_name: aiSuggestion.emergency_contact_name ?? first.full_name,
          phone: aiSuggestion.emergency_contact_phone ?? first.phone,
        }
        return next
      })
    }

    toast.success('AI pre-fill applied. Review all fields before saving.')
  }

  function runGeminiExtraction(documentType: ChildDocumentType) {
    const file =
      documentType === 'birth_certificate'
        ? birthCertificateFile
        : documentType === 'medical_card'
          ? medicalCardFile
          : immunizationRecordFile

    if (!file) {
      const label =
        documentType === 'birth_certificate'
          ? 'birth certificate'
          : documentType === 'medical_card'
            ? 'medical card'
            : 'immunization record'
      toast.error(`Upload the ${label} first.`)
      return
    }

    startExtractTransition(async () => {
      const formData = new FormData()
      formData.set('documentType', documentType)
      formData.set('file', file)

      const result = await extractChildDocumentWithGeminiAction(formData)
      if (result.storagePublicUrl) {
        setDocumentUrls((current) => ({ ...current, [documentType]: result.storagePublicUrl! }))
      }
      if (!result.success || !result.prefill) {
        toast.error(result.message)
        return
      }

      setAiSuggestion((current) => mergeAiSuggestions(current, result.prefill))
      setAiConfidence((current) => mergeAiConfidence(current, result.confidence))
      toast.success(
        documentType === 'birth_certificate'
          ? 'Birth certificate uploaded and extracted.'
          : documentType === 'medical_card'
            ? 'Medical card uploaded and extracted.'
            : 'Immunization record uploaded and extracted.'
      )
    })
  }

  function handleSaveAndShare() {
    const normalizedGuardianContacts = guardianContacts
      .map((entry) => ({
        full_name: entry.full_name.trim(),
        relationship: entry.relationship.trim(),
        phone: entry.phone.trim(),
        email: entry.email.trim(),
        can_pickup: Boolean(entry.can_pickup),
      }))
      .filter((entry) => entry.full_name || entry.phone || entry.email)

    const normalizedEmergencyContacts = emergencyContacts
      .map((entry) => ({
        full_name: entry.full_name.trim(),
        relationship: entry.relationship.trim(),
        phone: entry.phone.trim(),
        notes: entry.notes.trim(),
      }))
      .filter((entry) => entry.full_name || entry.phone || entry.notes)

    const primaryGuardian = normalizedGuardianContacts.find((entry) => entry.phone.length >= 7)

    if (!form.first_name.trim() || !form.last_name.trim() || !form.enrollment_start_date || !primaryGuardian) {
      toast.error('Child names, start date, and at least one guardian phone number are required.')
      return
    }

    startSaveTransition(async () => {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        enrollment_start_date: form.enrollment_start_date,
        date_of_birth: form.date_of_birth || null,
        class_id: form.class_id || null,
        gender: form.gender || null,
        blood_type: form.blood_type.trim() || null,
        doctor_name: form.doctor_name.trim() || null,
        medical_aid_number: form.medical_aid_number.trim() || null,
        immunization_status: form.immunization_status.trim() || null,
        immunization_due_date: form.immunization_due_date || null,
        immunization_notes: form.immunization_notes.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        dietary_restrictions: form.dietary_restrictions.trim() || null,
        special_needs_notes: form.special_needs_notes.trim() || null,
        development_notes: form.development_notes.trim() || null,
        last_checkup_date: form.last_checkup_date || null,
        allergies: listToArray(form.allergies_text),
        medical_conditions: listToArray(form.medical_conditions_text),
        medications: listToArray(form.medications_text),
        parent_name: primaryGuardian.full_name || form.parent_name.trim() || null,
        parent_phone: primaryGuardian.phone,
        parent_email: primaryGuardian.email || form.parent_email.trim() || null,
        secondary_guardian_name: normalizedGuardianContacts[1]?.full_name || form.secondary_guardian_name.trim() || null,
        secondary_guardian_phone: normalizedGuardianContacts[1]?.phone || form.secondary_guardian_phone.trim() || null,
        secondary_guardian_email: normalizedGuardianContacts[1]?.email || form.secondary_guardian_email.trim() || null,
        guardian_contacts: normalizedGuardianContacts.map((entry, index) => ({
          full_name: entry.full_name || null,
          relationship: entry.relationship || (index === 0 ? 'parent' : 'guardian'),
          phone: entry.phone || null,
          email: entry.email || null,
          can_pickup: entry.can_pickup,
        })),
        emergency_contacts: normalizedEmergencyContacts.map((entry) => ({
          full_name: entry.full_name || null,
          relationship: entry.relationship || 'emergency',
          phone: entry.phone || null,
          notes: entry.notes || null,
        })),
        birth_certificate_file_name: birthCertificateFile?.name ?? null,
        birth_certificate_file_url: documentUrls.birth_certificate ?? null,
        medical_card_file_name: medicalCardFile?.name ?? null,
        medical_card_file_url: documentUrls.medical_card ?? null,
        immunization_record_file_name: immunizationRecordFile?.name ?? null,
        immunization_record_file_url: documentUrls.immunization_record ?? null,
        ai_review_notes: form.ai_review_notes.trim() || null,
        ai_prefill_snapshot: aiSuggestion ?? null,
        ai_confidence_snapshot: aiConfidence ?? null,
      }

      const result = await saveTempChildProfileAndInviteParentAction(payload)
      if (!result.success) {
        toast.error(result.message)
        return
      }

      setSavedResult({
        tempProfileId: result.tempProfileId,
        whatsappHref: result.whatsappHref,
      })
      toast.success(result.message)

      if (result.whatsappHref) {
        const popup = window.open(result.whatsappHref, '_blank', 'noopener,noreferrer')
        if (!popup) {
          await navigator.clipboard.writeText(result.whatsappHref)
          toast.info('WhatsApp link copied. Paste it into WhatsApp to continue.')
        }
      }
    })
  }

  function updateBulkDraft(index: number, patch: Partial<ExistingChildBulkDraft>) {
    setBulkDrafts((current) => current.map((draft, idx) => (idx === index ? { ...draft, ...patch } : draft)))
  }

  function removeBulkDraft(index: number) {
    setBulkDrafts((current) => current.filter((_, idx) => idx !== index))
  }

  function runBulkExtract() {
    if (!bulkFile) {
      toast.error('Upload a register photo first.')
      return
    }

    const maxUploadMb = 18
    if (bulkFile.size > maxUploadMb * 1024 * 1024) {
      toast.error(`Image is too large (${Math.round(bulkFile.size / (1024 * 1024))}MB). Please use an image under ${maxUploadMb}MB.`)
      return
    }

    startBulkExtractTransition(async () => {
      let timeoutId: number | null = null
      try {
        const uploadFile = await compressImageForBulkExtract(bulkFile)
        const formData = new FormData()
        formData.set('file', uploadFile)
        if (form.enrollment_start_date) {
          formData.set('default_start_date', form.enrollment_start_date)
        }

        const endpoint = new URL('/api/ecd/children/extract-register', window.location.origin).toString()
        const controller = new AbortController()
        timeoutId = window.setTimeout(() => controller.abort(), 45000)
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        })

        const raw = await response.text()
        const result = (raw ? JSON.parse(raw) : null) as {
          success?: boolean
          message?: string
          drafts?: ExistingChildBulkDraft[]
          summary?: string
        }

        if (!response.ok || !result || !result.success || !result.drafts) {
          toast.error(result?.message ?? `Extraction request failed (${response.status}).`)
          return
        }

        setBulkDrafts(result.drafts)
        setBulkSummary(result.summary ?? '')
        toast.success(result.message)
      } catch (error) {
        console.error('[children] bulk register extraction client failure', { error })
        const message =
          error instanceof DOMException && error.name === 'AbortError'
            ? 'Extraction timed out after 45 seconds. Try a clearer image or use CSV import if urgent.'
            : error instanceof Error && error.message
            ? error.message
            : 'Extraction request failed before a response. Refresh once, then try again.'
        toast.error(message)
      } finally {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId)
        }
      }
    })
  }

  function saveBulkDrafts() {
    if (bulkDrafts.length === 0) {
      toast.error('No extracted children to save yet.')
      return
    }

    const hasInvalid = bulkDrafts.some((draft) => !draft.full_name.trim() || !draft.enrollment_start_date)
    if (hasInvalid) {
      toast.error('Each child needs a name and start date.')
      return
    }

    startBulkSaveTransition(async () => {
      const result = await bulkCreateExistingChildrenAction({
        children: bulkDrafts.map((draft) => ({
          full_name: draft.full_name.trim(),
          enrollment_start_date: draft.enrollment_start_date,
          date_of_birth: draft.date_of_birth ?? null,
        })),
      })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      setBulkDrafts([])
      setBulkSummary('')
      setBulkFile(null)
    })
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50 shadow-[0_20px_50px_rgba(13,148,136,0.12)]">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-black text-slate-900">Add New Child</CardTitle>
              <CardDescription className="mt-1 text-slate-600">
                Fast manual enrollment for {centreName}. Capture essentials in minutes, then send the parent handoff link.
              </CardDescription>
            </div>
            <div className="inline-flex items-center gap-2 rounded-3xl border border-teal-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-teal-700">
              <Sparkles className="h-4 w-4" />
              Step {stepIndex + 1} of {STEPS.length}
            </div>
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-teal-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {STEPS.map((step, idx) => {
              const Icon = step.icon
              const active = idx === stepIndex
              const complete = idx < stepIndex
              return (
                <Button
                  key={step.id}
                  type="button"
                  variant="outline"
                  onClick={() => setStepIndex(idx)}
                  className={cn(
                    'flex h-auto min-h-[60px] items-center gap-3 rounded-3xl px-4 py-3 text-left transition-colors duration-200',
                    complete && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                    active && 'border-teal-400 bg-teal-600 text-white shadow-[0_10px_26px_rgba(13,148,136,0.34)]',
                    !active && !complete && 'border-slate-200 bg-white text-slate-600 hover:border-teal-200'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">{step.label}</p>
                    <p className={cn('text-[11px] font-medium', active ? 'text-teal-100' : 'text-slate-500')}>{step.hint}</p>
                  </div>
                </Button>
              )
            })}
          </div>
        </CardHeader>
      </Card>

      <Card id="bulk-existing-children" className="rounded-3xl border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
            <Users className="h-5 w-5 text-teal-600" />
            Bulk Add Existing Children
          </CardTitle>
          <CardDescription className="text-slate-600">
            AI-first register extraction with Gemini, with local OCR fallback if AI is unavailable. Upload a clear register photo, review names, set start dates, then create profiles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Register Photo</label>
              <Input
                type="file"
                accept="image/*,.pdf"
                className="h-12 rounded-3xl"
                onChange={(event) => setBulkFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Default Start Date</label>
              <Input
                type="date"
                className="h-12 rounded-3xl"
                value={form.enrollment_start_date}
                onChange={(event) => updateField('enrollment_start_date', event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-11 rounded-3xl bg-teal-600 px-5 text-white hover:bg-teal-700"
              onClick={runBulkExtract}
              disabled={isBulkExtracting || !bulkFile}
            >
              {isBulkExtracting ? 'Reading photo...' : 'Read photo'}
            </Button>
            <Button variant="outline" asChild className="h-11 rounded-3xl border-slate-200 bg-white text-slate-700">
              <Link href="/ecd/attendance">Open attendance register</Link>
            </Button>
          </div>

          {bulkSummary ? (
            <p className="rounded-2xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-700">{bulkSummary}</p>
          ) : null}

          {bulkDrafts.length > 0 ? (
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Review extracted children</p>
              {bulkDrafts.map((draft, index) => (
                <div
                  key={`${draft.full_name}-${index}`}
                  className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_180px_auto]"
                >
                  <Input
                    className="h-11 rounded-2xl"
                    value={draft.full_name}
                    onChange={(event) => updateBulkDraft(index, { full_name: event.target.value })}
                    placeholder="Child full name"
                  />
                  <Input
                    type="date"
                    className="h-11 rounded-2xl"
                    value={draft.enrollment_start_date}
                    onChange={(event) => updateBulkDraft(index, { enrollment_start_date: event.target.value })}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <AiSuggestedBadge confidence={draft.confidence} />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-2xl border-red-200 bg-white px-3 text-red-600 hover:bg-red-50"
                      onClick={() => removeBulkDraft(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                className="h-11 rounded-3xl bg-emerald-600 px-5 text-white hover:bg-emerald-700"
                onClick={saveBulkDrafts}
                disabled={isBulkSaving}
              >
                {isBulkSaving ? 'Saving...' : `Create ${bulkDrafts.length} Child Profiles`}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {activeStep.id === 'basic' ? (
        <Card className="rounded-3xl border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-900">Basic Information</CardTitle>
            <CardDescription className="text-slate-600">
              Start with identity details. AI can pre-fill some of these from uploaded documents later.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                First Name *
                <AiSuggestedBadge confidence={fieldConfidence('first_name')} />
              </label>
              <Input
                className={cn('h-12 rounded-3xl', getInputAiClass(fieldConfidence('first_name')))}
                value={form.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                Last Name *
                <AiSuggestedBadge confidence={fieldConfidence('last_name')} />
              </label>
              <Input
                className={cn('h-12 rounded-3xl', getInputAiClass(fieldConfidence('last_name')))}
                value={form.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">Start Date *</label>
              <Input
                type="date"
                className="h-12 rounded-3xl"
                value={form.enrollment_start_date}
                onChange={(e) => updateField('enrollment_start_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                Date of Birth
                <AiSuggestedBadge confidence={fieldConfidence('date_of_birth')} />
              </label>
              <Input
                type="date"
                className={cn('h-12 rounded-3xl', getInputAiClass(fieldConfidence('date_of_birth')))}
                value={form.date_of_birth}
                onChange={(e) => updateField('date_of_birth', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">Gender</label>
              <select
                className="cc-native-field h-12 rounded-3xl"
                value={form.gender}
                onChange={(e) => updateField('gender', e.target.value)}
              >
                <option value="">Select gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other / Prefer not to say</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">Assigned Class (DSD)</label>
              <select
                className="cc-native-field h-12 rounded-3xl"
                value={form.class_id}
                onChange={(e) => updateField('class_id', e.target.value)}
              >
                <option value="">No class assigned</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.age_group ? `(${cls.age_group})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeStep.id === 'medical' ? (
        <Card className="rounded-3xl border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-900">Medical & Development</CardTitle>
            <CardDescription className="text-slate-600">
              Capture richer health details for safer onboarding and classroom planning.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                Blood Type
                <AiSuggestedBadge confidence={fieldConfidence('blood_type')} />
              </label>
              <Input
                className={cn('h-12 rounded-3xl', getInputAiClass(fieldConfidence('blood_type')))}
                placeholder="Blood Type (e.g. O+)"
                value={form.blood_type}
                onChange={(e) => updateField('blood_type', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                Doctor Name
                <AiSuggestedBadge confidence={fieldConfidence('doctor_name')} />
              </label>
              <Input
                className={cn('h-12 rounded-3xl', getInputAiClass(fieldConfidence('doctor_name')))}
                placeholder="Doctor Name"
                value={form.doctor_name}
                onChange={(e) => updateField('doctor_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                Medical Aid Number
                <AiSuggestedBadge confidence={fieldConfidence('medical_aid_number')} />
              </label>
              <Input
                className={cn('h-12 rounded-3xl', getInputAiClass(fieldConfidence('medical_aid_number')))}
                placeholder="Medical Aid Number"
                value={form.medical_aid_number}
                onChange={(e) => updateField('medical_aid_number', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">Immunization Status</label>
              <select
                className="cc-native-field h-12 rounded-3xl"
                value={form.immunization_status}
                onChange={(e) => updateField('immunization_status', e.target.value)}
              >
                <option value="">Select status</option>
                <option value="up_to_date">Up to date</option>
                <option value="catching_up">Catching up</option>
                <option value="not_started">Not started</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">Next Immunization Due</label>
              <Input
                type="date"
                className="h-12 rounded-3xl"
                value={form.immunization_due_date}
                onChange={(e) => updateField('immunization_due_date', e.target.value)}
              />
            </div>
            <Textarea
              className="min-h-[90px] rounded-3xl md:col-span-2"
              placeholder="Immunization notes"
              value={form.immunization_notes}
              onChange={(e) => updateField('immunization_notes', e.target.value)}
            />
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                Last Checkup Date
                <AiSuggestedBadge confidence={fieldConfidence('last_checkup_date')} />
              </label>
              <Input
                type="date"
                className={cn('h-12 rounded-3xl', getInputAiClass(fieldConfidence('last_checkup_date')))}
                value={form.last_checkup_date}
                onChange={(e) => updateField('last_checkup_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                Emergency Contact Name
                <AiSuggestedBadge confidence={fieldConfidence('emergency_contact_name')} />
              </label>
              <Input
                className={cn('h-12 rounded-3xl', getInputAiClass(fieldConfidence('emergency_contact_name')))}
                placeholder="Emergency Contact Name"
                value={form.emergency_contact_name}
                onChange={(e) => updateField('emergency_contact_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                Emergency Contact Phone
                <AiSuggestedBadge confidence={fieldConfidence('emergency_contact_phone')} />
              </label>
              <Input
                className={cn('h-12 rounded-3xl', getInputAiClass(fieldConfidence('emergency_contact_phone')))}
                placeholder="Emergency Contact Phone"
                value={form.emergency_contact_phone}
                onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
              />
            </div>
            <Textarea
              className={cn('min-h-[110px] rounded-3xl md:col-span-2', getInputAiClass(fieldConfidence('allergies')))}
              placeholder="Allergies (comma separated)"
              value={form.allergies_text}
              onChange={(e) => updateField('allergies_text', e.target.value)}
            />
            <Textarea
              className={cn(
                'min-h-[110px] rounded-3xl md:col-span-2',
                getInputAiClass(fieldConfidence('medical_conditions'))
              )}
              placeholder="Medical conditions (comma separated)"
              value={form.medical_conditions_text}
              onChange={(e) => updateField('medical_conditions_text', e.target.value)}
            />
            <Textarea
              className={cn('min-h-[110px] rounded-3xl md:col-span-2', getInputAiClass(fieldConfidence('medications')))}
              placeholder="Medications (comma separated)"
              value={form.medications_text}
              onChange={(e) => updateField('medications_text', e.target.value)}
            />
            <Textarea
              className={cn(
                'min-h-[110px] rounded-3xl md:col-span-2',
                getInputAiClass(fieldConfidence('dietary_restrictions'))
              )}
              placeholder="Dietary restrictions"
              value={form.dietary_restrictions}
              onChange={(e) => updateField('dietary_restrictions', e.target.value)}
            />
            <Textarea
              className={cn(
                'min-h-[120px] rounded-3xl md:col-span-2',
                getInputAiClass(fieldConfidence('special_needs_notes'))
              )}
              placeholder="Special needs notes"
              value={form.special_needs_notes}
              onChange={(e) => updateField('special_needs_notes', e.target.value)}
            />
            <Textarea
              className={cn(
                'min-h-[120px] rounded-3xl md:col-span-2',
                getInputAiClass(fieldConfidence('development_notes'))
              )}
              placeholder="Development notes"
              value={form.development_notes}
              onChange={(e) => updateField('development_notes', e.target.value)}
            />
          </CardContent>
        </Card>
      ) : null}

      {activeStep.id === 'guardians' ? (
        <Card className="rounded-3xl border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-900">Parent & Guardians</CardTitle>
            <CardDescription className="text-slate-600">
              Add all guardians and emergency contacts for pickup and safety.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Guardians</p>
                <Button type="button" variant="outline" className="h-9 rounded-2xl" onClick={addGuardianContact}>
                  Add Guardian
                </Button>
              </div>
              <div className="space-y-3">
                {guardianContacts.map((entry, index) => (
                  <div key={`guardian-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
                    <Input
                      className="h-11 rounded-2xl"
                      placeholder={index === 0 ? 'Primary Guardian Name *' : 'Guardian Name'}
                      value={entry.full_name}
                      onChange={(event) => updateGuardianContact(index, { full_name: event.target.value })}
                    />
                    <Input
                      className="h-11 rounded-2xl"
                      placeholder={index === 0 ? 'WhatsApp Phone *' : 'Guardian Phone'}
                      value={entry.phone}
                      onChange={(event) => updateGuardianContact(index, { phone: event.target.value })}
                    />
                    <Input
                      className="h-11 rounded-2xl"
                      placeholder="Relationship (Parent, Aunt, Uncle...)"
                      value={entry.relationship}
                      onChange={(event) => updateGuardianContact(index, { relationship: event.target.value })}
                    />
                    <Input
                      className="h-11 rounded-2xl"
                      placeholder="Guardian Email"
                      value={entry.email}
                      onChange={(event) => updateGuardianContact(index, { email: event.target.value })}
                    />
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-700">Pickup allowed</label>
                      <input
                        type="checkbox"
                        checked={entry.can_pickup}
                        onChange={(event) => updateGuardianContact(index, { can_pickup: event.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50"
                        onClick={() => removeGuardianContact(index)}
                        disabled={guardianContacts.length <= 1}
                      >
                        Remove Guardian
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Emergency Contacts</p>
                <Button type="button" variant="outline" className="h-9 rounded-2xl" onClick={addEmergencyContact}>
                  Add Emergency Contact
                </Button>
              </div>
              <div className="space-y-3">
                {emergencyContacts.map((entry, index) => (
                  <div key={`emergency-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
                    <Input
                      className="h-11 rounded-2xl"
                      placeholder="Emergency Contact Name"
                      value={entry.full_name}
                      onChange={(event) => updateEmergencyContact(index, { full_name: event.target.value })}
                    />
                    <Input
                      className="h-11 rounded-2xl"
                      placeholder="Emergency Contact Phone"
                      value={entry.phone}
                      onChange={(event) => updateEmergencyContact(index, { phone: event.target.value })}
                    />
                    <Input
                      className="h-11 rounded-2xl"
                      placeholder="Relationship"
                      value={entry.relationship}
                      onChange={(event) => updateEmergencyContact(index, { relationship: event.target.value })}
                    />
                    <Input
                      className="h-11 rounded-2xl"
                      placeholder="Notes"
                      value={entry.notes}
                      onChange={(event) => updateEmergencyContact(index, { notes: event.target.value })}
                    />
                    <div className="md:col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50"
                        onClick={() => removeEmergencyContact(index)}
                        disabled={emergencyContacts.length <= 1}
                      >
                        Remove Emergency Contact
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeStep.id === 'documents' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
                <Bot className="h-5 w-5 text-teal-600" />
                Document Upload + AI
              </CardTitle>
              <CardDescription className="text-slate-600">
                Upload birth certificate, medical card, and immunization photos. AI extracts details, pre-fills fields, and keeps confidence scores visible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-dashed border-teal-200 bg-teal-50/50 p-4">
                <label className="text-xs font-black uppercase tracking-wider text-teal-700">Birth Certificate</label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  className="mt-2 h-12 rounded-3xl"
                  onChange={(e) => setBirthCertificateFile(e.target.files?.[0] ?? null)}
                />
                {birthCertificateFile ? <p className="mt-2 text-xs font-semibold text-slate-600">Selected: {birthCertificateFile.name}</p> : null}
                <Button
                  type="button"
                  className="mt-3 h-12 w-full rounded-3xl bg-teal-600 text-white hover:bg-teal-700"
                  onClick={() => runGeminiExtraction('birth_certificate')}
                  disabled={isExtracting || !birthCertificateFile}
                >
                  {isExtracting ? 'Extracting...' : 'Extract from Photo'}
                </Button>
                {documentUrls.birth_certificate ? (
                  <p className="mt-2 text-[11px] font-semibold text-teal-700">Uploaded to storage</p>
                ) : null}
              </div>

              <div className="rounded-3xl border border-dashed border-cyan-200 bg-cyan-50/50 p-4">
                <label className="text-xs font-black uppercase tracking-wider text-cyan-700">Medical Card</label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  className="mt-2 h-12 rounded-3xl"
                  onChange={(e) => setMedicalCardFile(e.target.files?.[0] ?? null)}
                />
                {medicalCardFile ? <p className="mt-2 text-xs font-semibold text-slate-600">Selected: {medicalCardFile.name}</p> : null}
                <Button
                  type="button"
                  className="mt-3 h-12 w-full rounded-3xl bg-cyan-600 text-white hover:bg-cyan-700"
                  onClick={() => runGeminiExtraction('medical_card')}
                  disabled={isExtracting || !medicalCardFile}
                >
                  {isExtracting ? 'Extracting...' : 'Extract from Photo'}
                </Button>
                {documentUrls.medical_card ? (
                  <p className="mt-2 text-[11px] font-semibold text-cyan-700">Uploaded to storage</p>
                ) : null}
              </div>

              <div className="rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4">
                <label className="text-xs font-black uppercase tracking-wider text-indigo-700">Immunization Record</label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  className="mt-2 h-12 rounded-3xl"
                  onChange={(e) => setImmunizationRecordFile(e.target.files?.[0] ?? null)}
                />
                {immunizationRecordFile ? (
                  <p className="mt-2 text-xs font-semibold text-slate-600">Selected: {immunizationRecordFile.name}</p>
                ) : null}
                <Button
                  type="button"
                  className="mt-3 h-12 w-full rounded-3xl bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={() => runGeminiExtraction('immunization_record')}
                  disabled={isExtracting || !immunizationRecordFile}
                >
                  {isExtracting ? 'Extracting...' : 'Extract from Photo'}
                </Button>
                {documentUrls.immunization_record ? (
                  <p className="mt-2 text-[11px] font-semibold text-indigo-700">Uploaded to storage</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                AI Pre-fill Review
              </CardTitle>
              <CardDescription className="text-slate-600">
                Review AI suggestions, apply them, then save a temporary profile and send the parent WhatsApp link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                {aiSuggestion ? (
                  <div className="space-y-2 text-xs text-slate-700">
                    <p className="font-black uppercase tracking-wider text-slate-500">Detected fields</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(aiSuggestion)
                        .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
                        .map(([key, value]) => (
                          <div key={key} className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{key.replaceAll('_', ' ')}</p>
                              <AiSuggestedBadge confidence={fieldConfidence(key as keyof ChildConfidenceMap)} />
                            </div>
                            <p className="mt-1 font-semibold text-slate-700">
                              {Array.isArray(value) ? value.join(', ') : String(value)}
                            </p>
                          </div>
                        ))}
                    </div>
                    <Button type="button" className="mt-2 h-12 w-full rounded-3xl" onClick={applyAiPrefill}>
                      Apply AI Pre-fill To Form
                    </Button>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Fields marked with AI badges stay fully editable for manual override.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No AI suggestions yet. Upload documents and click Extract from Photo to pre-fill fields.
                  </p>
                )}
              </div>

              <Textarea
                className="min-h-[120px] rounded-3xl"
                placeholder="Review notes (what was auto-filled, what still needs parent confirmation)"
                value={form.ai_review_notes}
                onChange={(e) => updateField('ai_review_notes', e.target.value)}
              />

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Ready to finalize?</p>
                <p className="mt-1 text-sm font-medium text-emerald-800">
                  This saves a temporary child profile and opens WhatsApp with a parent completion link.
                </p>
                <Button
                  type="button"
                  className="mt-3 h-12 w-full rounded-3xl bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={handleSaveAndShare}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving Temp Profile...' : 'Save Temp Profile + Send WhatsApp Link'}
                </Button>
              </div>

              {savedResult ? (
                <div className="rounded-3xl border border-teal-200 bg-teal-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-teal-800">
                    <CheckCircle2 className="h-4 w-4" />
                    Temporary profile saved
                  </p>
                  <p className="mt-1 text-xs font-medium text-teal-700">Profile ID: {savedResult.tempProfileId}</p>
                  {savedResult.whatsappHref ? (
                    <Button variant="outline" asChild className="mt-3 h-11 w-full rounded-3xl border-teal-300 bg-white text-teal-700">
                      <a href={savedResult.whatsappHref} target="_blank" rel="noreferrer">
                        Open WhatsApp Link Again
                      </a>
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card className="rounded-3xl border-slate-200 bg-white">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Active step: {activeStep.label}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="h-12 rounded-3xl px-6" onClick={goToPreviousStep} disabled={stepIndex === 0}>
              Back
            </Button>
            {stepIndex < STEPS.length - 1 ? (
              <Button type="button" className="h-12 rounded-3xl bg-teal-600 px-8 text-white hover:bg-teal-700" onClick={goToNextStep}>
                Next
              </Button>
            ) : (
              <Button type="button" className="h-12 rounded-3xl bg-teal-600 px-8 text-white hover:bg-teal-700" onClick={handleSaveAndShare} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Finalize Enrollment'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" asChild className="h-11 rounded-3xl">
          <Link href="/ecd/dashboard">Back to Dashboard</Link>
        </Button>
        <Button variant="outline" asChild className="h-11 rounded-3xl">
          <Link href="/ecd/applications">Open Applications</Link>
        </Button>
      </div>
    </div>
  )
}
