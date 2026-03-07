'use server'

import { randomUUID } from 'crypto'
import { z } from 'zod'
import {
  extractStructuredDocumentWithGemini,
  isSupportedAiDocumentType,
  uploadPhotoForAiExtraction,
  type AiExtractionPayload,
  type AiFieldKey,
} from '@/lib/ai/document-extraction-service'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const childDocumentTypeSchema = z.enum(['birth_certificate', 'medical_card', 'immunization_record'])
type ChildDocumentType = z.infer<typeof childDocumentTypeSchema>

const aiPrefillSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  date_of_birth: z.string().optional(),
  blood_type: z.string().optional(),
  doctor_name: z.string().optional(),
  medical_aid_number: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  medical_conditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  dietary_restrictions: z.string().optional(),
  special_needs_notes: z.string().optional(),
  development_notes: z.string().optional(),
  last_checkup_date: z.string().optional(),
})

type ChildPrefill = z.infer<typeof aiPrefillSchema>
type ChildConfidenceMap = Partial<Record<keyof ChildPrefill, number>>
type BirthdaySyncClient = {
  rpc: (
    fn: string,
    params?: Record<string, unknown>
  ) => PromiseLike<{ error: { message?: string } | null }>
}

const guardianContactInputSchema = z.object({
  full_name: z.string().optional().nullable(),
  relationship: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  can_pickup: z.boolean().optional().default(true),
})

const emergencyContactInputSchema = z.object({
  full_name: z.string().optional().nullable(),
  relationship: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const tempChildProfileSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  enrollment_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_of_birth: z.string().optional().nullable(),
  class_id: z.string().uuid().optional().nullable(),
  gender: z.string().optional().nullable(),
  blood_type: z.string().optional().nullable(),
  doctor_name: z.string().optional().nullable(),
  medical_aid_number: z.string().optional().nullable(),
  immunization_status: z.string().optional().nullable(),
  immunization_due_date: z.string().optional().nullable(),
  immunization_notes: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  dietary_restrictions: z.string().optional().nullable(),
  special_needs_notes: z.string().optional().nullable(),
  development_notes: z.string().optional().nullable(),
  last_checkup_date: z.string().optional().nullable(),
  allergies: z.array(z.string()).default([]),
  medical_conditions: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  parent_name: z.string().optional().nullable(),
  parent_phone: z.string().optional().nullable(),
  parent_email: z.string().email().optional().or(z.literal('')).nullable(),
  secondary_guardian_name: z.string().optional().nullable(),
  secondary_guardian_phone: z.string().optional().nullable(),
  secondary_guardian_email: z.string().email().optional().or(z.literal('')).nullable(),
  guardian_contacts: z.array(guardianContactInputSchema).optional().default([]),
  emergency_contacts: z.array(emergencyContactInputSchema).optional().default([]),
  birth_certificate_file_name: z.string().optional().nullable(),
  birth_certificate_file_url: z.string().url().optional().or(z.literal('')).nullable(),
  medical_card_file_name: z.string().optional().nullable(),
  medical_card_file_url: z.string().url().optional().or(z.literal('')).nullable(),
  immunization_record_file_name: z.string().optional().nullable(),
  immunization_record_file_url: z.string().url().optional().or(z.literal('')).nullable(),
  ai_review_notes: z.string().optional().nullable(),
  ai_prefill_snapshot: z.record(z.any()).optional().nullable(),
  ai_confidence_snapshot: z.record(z.any()).optional().nullable(),
})

export type GeminiExtractionResult = {
  success: boolean
  message: string
  prefill?: ChildPrefill
  confidence?: ChildConfidenceMap
  documentType?: ChildDocumentType
  storagePath?: string
  storagePublicUrl?: string
  summary?: string
}

export type SaveTempChildProfileResult = {
  success: boolean
  message: string
  tempProfileId?: string
  whatsappHref?: string
  parentOnboardingUrl?: string
}

const bulkExistingChildrenCreateSchema = z.object({
  children: z
    .array(
      z.object({
        full_name: z.string().min(2).max(140),
        enrollment_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')).nullable(),
      })
    )
    .min(1)
    .max(200),
})

export type ExistingChildBulkDraft = {
  full_name: string
  enrollment_start_date: string
  date_of_birth?: string
  confidence?: number
}

export type ExtractExistingChildrenFromPhotoResult = {
  success: boolean
  message: string
  drafts?: ExistingChildBulkDraft[]
  storagePublicUrl?: string
  summary?: string
}

export type BulkCreateExistingChildrenResult = {
  success: boolean
  message: string
  createdCount?: number
  createdIds?: string[]
}

function getAppUrl() {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://centerconnect.co.za'
  return value.trim().replace(/\/+$/, '')
}

function normalizeDateString(raw: string | undefined) {
  if (!raw) return undefined
  const value = raw.trim()
  if (!value) return undefined

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const ddmmyyyy = value.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy
    return `${yyyy}-${mm}-${dd}`
  }

  return undefined
}

function normalizePhoneForWhatsapp(rawPhone: string) {
  const digits = rawPhone.replace(/[^\d+]/g, '')
  const withoutPlus = digits.replace(/\+/g, '')
  if (!withoutPlus) return null

  if (withoutPlus.startsWith('0')) return `27${withoutPlus.slice(1)}`
  if (withoutPlus.startsWith('27')) return withoutPlus
  return withoutPlus
}

async function syncBirthdayEventsForChild(args: {
  supabase: BirthdaySyncClient
  ecdId: string
  childId: string
  firstName: string
  lastName: string
  dateOfBirth?: string | null
}) {
  if (!args.dateOfBirth) return
  const { error } = await args.supabase.rpc('ensure_child_birthday_events', {
    p_ecd_id: args.ecdId,
    p_child_id: args.childId,
    p_first_name: args.firstName,
    p_last_name: args.lastName,
    p_date_of_birth: args.dateOfBirth,
  })

  if (
    error &&
    !String(error.message ?? '').toLowerCase().includes('ensure_child_birthday_events')
  ) {
    throw new Error(error.message || 'Failed to sync birthday events')
  }
}

function getFieldString(extraction: AiExtractionPayload, key: AiFieldKey) {
  const value = extraction.fields[key]?.value
  if (typeof value !== 'string') return undefined
  const cleaned = value.trim()
  return cleaned || undefined
}

function getFieldList(extraction: AiExtractionPayload, key: AiFieldKey) {
  const value = extraction.fields[key]?.value
  if (!Array.isArray(value)) return undefined
  const list = value.map((item) => item.trim()).filter(Boolean)
  return list.length > 0 ? list : undefined
}

function getFieldConfidence(extraction: AiExtractionPayload, key: AiFieldKey) {
  return extraction.fields[key]?.confidence
}

function splitPossibleNames(input: string) {
  return input
    .split(/\r?\n|,|;|\|/g)
    .map((entry) => entry.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function parseRegisterNames(extraction: AiExtractionPayload) {
  const fullNameValue = extraction.fields.full_name?.value
  const fromArray = Array.isArray(fullNameValue) ? fullNameValue : []
  const fromString = typeof fullNameValue === 'string' ? splitPossibleNames(fullNameValue) : []
  const firstName = getFieldString(extraction, 'first_name')
  const lastName = getFieldString(extraction, 'last_name')
  const mergedSingle = [firstName, lastName].filter(Boolean).join(' ').trim()

  const all = [...fromArray, ...fromString, mergedSingle]
    .map((name) => name.replace(/\s+/g, ' ').trim())
    .filter((name) => name.length >= 2)

  const unique: string[] = []
  const seen = new Set<string>()
  for (const name of all) {
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(name)
  }

  return unique.slice(0, 200)
}

function splitNameForChild(fullName: string) {
  const cleaned = fullName.replace(/\s+/g, ' ').trim()
  if (!cleaned) return { firstName: 'Unknown', lastName: 'Child' }

  const parts = cleaned.split(' ')
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Child' }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

function mapToChildPrefill(extraction: AiExtractionPayload) {
  const prefill: ChildPrefill = {
    first_name: getFieldString(extraction, 'first_name'),
    last_name: getFieldString(extraction, 'last_name'),
    date_of_birth: normalizeDateString(getFieldString(extraction, 'date_of_birth')),
    blood_type: getFieldString(extraction, 'blood_type'),
    doctor_name: getFieldString(extraction, 'doctor_name'),
    medical_aid_number: getFieldString(extraction, 'medical_aid_number'),
    emergency_contact_name: getFieldString(extraction, 'emergency_contact_name'),
    emergency_contact_phone: getFieldString(extraction, 'emergency_contact_phone'),
    allergies: getFieldList(extraction, 'allergies'),
    medical_conditions: getFieldList(extraction, 'medical_conditions'),
    medications: getFieldList(extraction, 'medications'),
    dietary_restrictions: getFieldString(extraction, 'notes'),
    special_needs_notes: getFieldString(extraction, 'notes'),
    development_notes: getFieldString(extraction, 'notes'),
    last_checkup_date: normalizeDateString(getFieldString(extraction, 'record_date')),
  }

  const confidence: ChildConfidenceMap = {
    first_name: getFieldConfidence(extraction, 'first_name'),
    last_name: getFieldConfidence(extraction, 'last_name'),
    date_of_birth: getFieldConfidence(extraction, 'date_of_birth'),
    blood_type: getFieldConfidence(extraction, 'blood_type'),
    doctor_name: getFieldConfidence(extraction, 'doctor_name'),
    medical_aid_number: getFieldConfidence(extraction, 'medical_aid_number'),
    emergency_contact_name: getFieldConfidence(extraction, 'emergency_contact_name'),
    emergency_contact_phone: getFieldConfidence(extraction, 'emergency_contact_phone'),
    allergies: getFieldConfidence(extraction, 'allergies'),
    medical_conditions: getFieldConfidence(extraction, 'medical_conditions'),
    medications: getFieldConfidence(extraction, 'medications'),
    dietary_restrictions: getFieldConfidence(extraction, 'notes'),
    special_needs_notes: getFieldConfidence(extraction, 'notes'),
    development_notes: getFieldConfidence(extraction, 'notes'),
    last_checkup_date: getFieldConfidence(extraction, 'record_date'),
  }

  const validPrefill = aiPrefillSchema.safeParse(prefill)
  if (!validPrefill.success) {
    return {
      prefill: undefined,
      confidence,
    }
  }

  return {
    prefill: validPrefill.data,
    confidence,
  }
}

export async function extractChildDocumentWithGeminiAction(formData: FormData): Promise<GeminiExtractionResult> {
  const session = await requireEcdPortalSession({ cached: false })
  if (!session.ecdId) {
    return { success: false, message: 'ECD session not found.' }
  }

  const documentTypeRaw = String(formData.get('documentType') ?? '').trim()
  if (!isSupportedAiDocumentType(documentTypeRaw)) {
    return { success: false, message: 'Unsupported document type.' }
  }

  const parsedType = childDocumentTypeSchema.safeParse(documentTypeRaw)
  if (!parsedType.success) {
    return { success: false, message: 'Invalid child document type.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { success: false, message: 'No document file was uploaded.', documentType: parsedType.data }
  }

  const uploadResult = await uploadPhotoForAiExtraction({
    supabase: session.supabase,
    ecdId: session.ecdId,
    documentType: parsedType.data,
    file,
    folder: 'children',
  })

  if (!uploadResult.success) {
    return {
      success: false,
      message: uploadResult.message,
      documentType: parsedType.data,
    }
  }

  const extractionResult = await extractStructuredDocumentWithGemini({
    file,
    documentType: parsedType.data,
  })

  if (!extractionResult.success || !extractionResult.extraction) {
    return {
      success: false,
      message: extractionResult.message,
      documentType: parsedType.data,
      storagePath: uploadResult.path,
      storagePublicUrl: uploadResult.publicUrl,
    }
  }

  const mapped = mapToChildPrefill(extractionResult.extraction)
  if (!mapped.prefill) {
    return {
      success: false,
      message: 'AI extraction succeeded but fields could not be normalized for child forms.',
      documentType: parsedType.data,
      storagePath: uploadResult.path,
      storagePublicUrl: uploadResult.publicUrl,
    }
  }

  return {
    success: true,
    message: 'Photo uploaded and AI extraction complete. Review suggested values.',
    documentType: parsedType.data,
    prefill: mapped.prefill,
    confidence: mapped.confidence,
    storagePath: uploadResult.path,
    storagePublicUrl: uploadResult.publicUrl,
    summary: extractionResult.extraction.summary,
  }
}

export async function extractExistingChildrenFromPhotoAction(
  formData: FormData
): Promise<ExtractExistingChildrenFromPhotoResult> {
  const session = await requireEcdPortalSession({ cached: false })
  if (!session.ecdId) {
    return { success: false, message: 'ECD session not found.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { success: false, message: 'Upload a register photo first.' }
  }

  const fallbackStartDate = normalizeDateString(String(formData.get('default_start_date') ?? '').trim())

  const uploadResult = await uploadPhotoForAiExtraction({
    supabase: session.supabase,
    ecdId: session.ecdId,
    documentType: 'register',
    file,
    folder: 'children-registers',
  })

  if (!uploadResult.success) {
    return {
      success: false,
      message: uploadResult.message,
    }
  }

  const extractionResult = await extractStructuredDocumentWithGemini({
    file,
    documentType: 'register',
  })

  if (!extractionResult.success || !extractionResult.extraction) {
    return {
      success: false,
      message: extractionResult.message,
      storagePublicUrl: uploadResult.publicUrl,
    }
  }

  const names = parseRegisterNames(extractionResult.extraction)
  if (names.length === 0) {
    return {
      success: false,
      message: 'AI could not detect child names from this photo. Try a clearer image.',
      storagePublicUrl: uploadResult.publicUrl,
    }
  }

  const suggestedStartDate =
    normalizeDateString(getFieldString(extractionResult.extraction, 'record_date')) ??
    fallbackStartDate ??
    new Date().toISOString().slice(0, 10)
  const confidence =
    getFieldConfidence(extractionResult.extraction, 'full_name') ??
    getFieldConfidence(extractionResult.extraction, 'first_name') ??
    65

  const drafts: ExistingChildBulkDraft[] = names.map((name) => ({
    full_name: name,
    enrollment_start_date: suggestedStartDate,
    confidence,
  }))

  return {
    success: true,
    message: `AI extracted ${drafts.length} child name${drafts.length === 1 ? '' : 's'}. Review and save.`,
    drafts,
    storagePublicUrl: uploadResult.publicUrl,
    summary: extractionResult.extraction.summary,
  }
}

export async function bulkCreateExistingChildrenAction(
  input: unknown
): Promise<BulkCreateExistingChildrenResult> {
  const session = await requireEcdPortalSession({ cached: false })
  if (!session.ecdId) {
    return { success: false, message: 'ECD session not found.' }
  }

  const parsed = bulkExistingChildrenCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: 'Please review names and start dates before saving.' }
  }

  const normalizedChildren: Array<{
    full_name: string
    enrollment_start_date: string
    date_of_birth: string | null
  }> = []

  for (const child of parsed.data.children) {
    const cleanedName = child.full_name.replace(/\s+/g, ' ').trim()
    if (!cleanedName) continue

    normalizedChildren.push({
      full_name: cleanedName,
      enrollment_start_date: child.enrollment_start_date,
      date_of_birth: normalizeDateString((child.date_of_birth ?? '').trim()) ?? null,
    })
  }

  if (normalizedChildren.length === 0) {
    return { success: false, message: 'No valid child entries to create.' }
  }

  const payload = normalizedChildren.map((child) => {
    const split = splitNameForChild(child.full_name)
    return {
      ecd_id: session.ecdId,
      parent_id: null,
      first_name: split.firstName,
      last_name: split.lastName,
      date_of_birth: child.date_of_birth || null,
      enrollment_start_date: child.enrollment_start_date,
      enrollment_source: 'ecd_manual',
      enrollment_status: 'pending_parent',
      guardian_contacts: [],
      emergency_contacts: [],
    }
  })

  const { data: inserted, error } = await session.supabase.from('children').insert(payload).select('id')
  if (error) {
    return { success: false, message: error.message || 'Failed to create child profiles.' }
  }

  const createdIds = (inserted ?? []).map((row) => String(row.id))
  return {
    success: true,
    message: `Created ${createdIds.length} child profile${createdIds.length === 1 ? '' : 's'} from the bulk list.`,
    createdCount: createdIds.length,
    createdIds,
  }
}

export async function saveTempChildProfileAndInviteParentAction(
  input: unknown
): Promise<SaveTempChildProfileResult> {
  const session = await requireEcdPortalSession({ cached: false })
  const parsed = tempChildProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: 'Please complete all required fields before saving.' }
  }

  const payload = parsed.data
  const normalizedGuardianContacts = payload.guardian_contacts
    .map((entry) => ({
      full_name: entry.full_name?.trim() || null,
      relationship: entry.relationship?.trim() || null,
      phone: entry.phone?.trim() || null,
      email: entry.email?.trim() || null,
      can_pickup: entry.can_pickup ?? true,
    }))
    .filter((entry) => entry.full_name || entry.phone || entry.email)

  if (normalizedGuardianContacts.length === 0) {
    const legacyParent = {
      full_name: payload.parent_name?.trim() || null,
      relationship: 'parent',
      phone: payload.parent_phone?.trim() || null,
      email: payload.parent_email?.trim() || null,
      can_pickup: true,
    }
    if (legacyParent.full_name || legacyParent.phone || legacyParent.email) {
      normalizedGuardianContacts.push(legacyParent)
    }

    const legacySecondary = {
      full_name: payload.secondary_guardian_name?.trim() || null,
      relationship: 'guardian',
      phone: payload.secondary_guardian_phone?.trim() || null,
      email: payload.secondary_guardian_email?.trim() || null,
      can_pickup: true,
    }
    if (legacySecondary.full_name || legacySecondary.phone || legacySecondary.email) {
      normalizedGuardianContacts.push(legacySecondary)
    }
  }

  const normalizedEmergencyContacts = payload.emergency_contacts
    .map((entry) => ({
      full_name: entry.full_name?.trim() || null,
      relationship: entry.relationship?.trim() || null,
      phone: entry.phone?.trim() || null,
      notes: entry.notes?.trim() || null,
    }))
    .filter((entry) => entry.full_name || entry.phone)

  if (normalizedEmergencyContacts.length === 0) {
    const medicalEmergency = {
      full_name: payload.emergency_contact_name?.trim() || null,
      relationship: 'medical',
      phone: payload.emergency_contact_phone?.trim() || null,
      notes: null,
    }
    if (medicalEmergency.full_name || medicalEmergency.phone) {
      normalizedEmergencyContacts.push(medicalEmergency)
    }
  }

  const firstGuardianWithPhone = normalizedGuardianContacts.find((entry) => Boolean(entry.phone))
  const normalizedParentName = payload.parent_name?.trim() || firstGuardianWithPhone?.full_name || null
  const normalizedParentPhone = payload.parent_phone?.trim() || firstGuardianWithPhone?.phone || ''
  const normalizedParentEmail = payload.parent_email?.trim() || firstGuardianWithPhone?.email || null

  if (!normalizedParentPhone) {
    return {
      success: false,
      message: 'Add at least one guardian phone number to send the parent WhatsApp link.',
    }
  }

  if (
    !normalizedEmergencyContacts.some((entry) => Boolean(entry.phone)) &&
    normalizedParentPhone
  ) {
    normalizedEmergencyContacts.push({
      full_name: normalizedParentName,
      relationship: 'primary_guardian',
      phone: normalizedParentPhone,
      notes: 'Auto-added from primary guardian',
    })
  }

  const guardianContacts = normalizedGuardianContacts.map((entry, index) => ({
    ...entry,
    role: index === 0 ? 'primary_guardian' : 'guardian',
  }))
  const emergencyContacts = normalizedEmergencyContacts

  const intakeDocuments = {
    birth_certificate: payload.birth_certificate_file_url
      ? {
          file_name: payload.birth_certificate_file_name ?? null,
          file_url: payload.birth_certificate_file_url,
        }
      : null,
    medical_card: payload.medical_card_file_url
      ? {
          file_name: payload.medical_card_file_name ?? null,
          file_url: payload.medical_card_file_url,
        }
      : null,
    immunization_record: payload.immunization_record_file_url
      ? {
          file_name: payload.immunization_record_file_name ?? null,
          file_url: payload.immunization_record_file_url,
        }
      : null,
  }

  const { data: centre } = await session.supabase
    .from('ecd_centres')
    .select('name')
    .eq('id', session.ecdId)
    .maybeSingle()

  const { data: insertedChild, error: insertChildError } = await session.supabase
    .from('children')
    .insert({
      ecd_id: session.ecdId,
      parent_id: null,
      class_id: payload.class_id || null,
      first_name: payload.first_name.trim(),
      last_name: payload.last_name.trim(),
      enrollment_start_date: payload.enrollment_start_date,
      date_of_birth: payload.date_of_birth || null,
      gender: payload.gender || null,
      allergies: payload.allergies.length > 0 ? payload.allergies : null,
      medical_conditions: payload.medical_conditions.length > 0 ? payload.medical_conditions : null,
      medications: payload.medications.length > 0 ? payload.medications : null,
      blood_type: payload.blood_type?.trim() || null,
      doctor_name: payload.doctor_name?.trim() || null,
      medical_aid_number: payload.medical_aid_number?.trim() || null,
      immunization_status: payload.immunization_status?.trim() || null,
      immunization_due_date: payload.immunization_due_date || null,
      immunization_notes: payload.immunization_notes?.trim() || null,
      immunization_record: intakeDocuments.immunization_record
        ? {
          ...intakeDocuments.immunization_record,
          status: payload.immunization_status?.trim() || null,
          due_date: payload.immunization_due_date || null,
          notes: payload.immunization_notes?.trim() || null,
          uploaded_via: 'ecd_manual_enrollment',
        }
        : null,
      emergency_contact_name: payload.emergency_contact_name?.trim() || null,
      emergency_contact_phone: payload.emergency_contact_phone?.trim() || null,
      dietary_restrictions: payload.dietary_restrictions?.trim() || null,
      special_needs_notes: payload.special_needs_notes?.trim() || null,
      special_needs: payload.special_needs_notes?.trim() || null,
      last_checkup_date: payload.last_checkup_date || null,
      development_notes: payload.development_notes?.trim() || null,
      birth_certificate_url: payload.birth_certificate_file_url || null,
      immunization_record_url: payload.immunization_record_file_url || null,
      guardian_contacts: guardianContacts,
      emergency_contacts: emergencyContacts,
      intake_documents: intakeDocuments,
      ai_prefill_snapshot: payload.ai_prefill_snapshot ?? null,
      ai_confidence_snapshot: payload.ai_confidence_snapshot ?? null,
      enrollment_source: 'ecd_manual',
      enrollment_status: 'pending_parent',
      onboarding_link_sent_at: new Date().toISOString(),
      enrollment_notes: payload.ai_review_notes?.trim() || null,
    })
    .select('id')
    .single()

  let tempProfileId = insertedChild?.id ?? null

  if (insertChildError || !tempProfileId) {
    const fallbackId = randomUUID()
    const { error: fallbackSaveError } = await session.supabase.from('audit_logs').insert({
      user_id: session.user.id,
      ecd_id: session.ecdId,
      action: 'temp_child_profile_saved_fallback',
      resource_type: 'temp_child_profile',
      resource_id: fallbackId,
      changes: {
        status: 'pending_parent_completion',
        temp_profile_id: fallbackId,
        ecd_id: session.ecdId,
        created_by: session.user.id,
        created_at: new Date().toISOString(),
        insert_error: insertChildError?.message ?? null,
        payload,
      },
    })

    if (fallbackSaveError) {
      return {
        success: false,
        message: fallbackSaveError.message || 'Failed to save temporary profile.',
      }
    }

    tempProfileId = fallbackId
  }

  if (!insertChildError && insertedChild?.id) {
    try {
      await syncBirthdayEventsForChild({
        supabase: session.supabase,
        ecdId: session.ecdId,
        childId: insertedChild.id,
        firstName: payload.first_name.trim(),
        lastName: payload.last_name.trim(),
        dateOfBirth: payload.date_of_birth || null,
      })
    } catch {
      // Birthday sync should never block enrollment completion.
    }
  }

  const parentPhone = normalizePhoneForWhatsapp(normalizedParentPhone)
  if (!parentPhone) {
    return {
      success: false,
      message: 'Temporary profile saved, but parent phone number is invalid for WhatsApp.',
      tempProfileId,
    }
  }

  const parentOnboardingUrl = `${getAppUrl()}/register?next=${encodeURIComponent('/parent/children/new')}&manualChildId=${tempProfileId}`
  const centreName = centre?.name?.trim() || 'your ECD centre'
  const childName = `${payload.first_name} ${payload.last_name}`.trim()
  const greetingName = normalizedParentName || 'Parent'

  const whatsappMessage = [
    `Hi ${greetingName},`,
    `${centreName} started a child profile for ${childName}.`,
    'Please complete the details and documents here:',
    parentOnboardingUrl,
    'Thank you! We are ready to help if you get stuck.',
  ].join('\n')

  const whatsappHref = `https://wa.me/${parentPhone}?text=${encodeURIComponent(whatsappMessage)}`

  await session.supabase.from('audit_logs').insert({
    user_id: session.user.id,
    ecd_id: session.ecdId,
    action: 'manual_child_profile_whatsapp_link_generated',
    resource_type: 'children',
    resource_id: tempProfileId,
    changes: {
      parent_phone: normalizedParentPhone,
      whatsapp_href: whatsappHref,
      parent_onboarding_url: parentOnboardingUrl,
      fallback_mode: Boolean(insertChildError),
    },
  })

  return {
    success: true,
    message: 'Child profile saved. Open WhatsApp to send the parent completion link.',
    tempProfileId,
    whatsappHref,
    parentOnboardingUrl,
  }
}
