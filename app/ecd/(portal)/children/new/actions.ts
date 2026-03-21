'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  extractStructuredDocumentWithGemini,
  isSupportedAiDocumentType,
  uploadPhotoForAiExtraction,
  type AiExtractionPayload,
  type AiFieldKey,
} from '@/lib/ai/document-extraction-service'
import {
  createOrResendParentLinkRequest,
  type ParentLinkRequestSummary,
} from '@/lib/ecd/parent-link-requests'
import { getEcdPortalSession, requireEcdPortalSession } from '@/lib/ecd/portal-session'

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
const quickAddChildrenCreateSchema = z.object({
  children: z
    .array(
      z.object({
        first_name: z.string().min(1).max(80),
        last_name: z.string().min(1).max(120),
        enrollment_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        class_id: z.string().uuid().optional().or(z.literal('')).nullable(),
        parent_name: z.string().max(140).optional().or(z.literal('')).nullable(),
        parent_phone: z.string().max(40).optional().or(z.literal('')).nullable(),
        parent_email: z.string().email().optional().or(z.literal('')).nullable(),
      })
    )
    .min(1)
    .max(20),
})

const sendParentLinkForExistingChildSchema = z.object({
  child_id: z.string().uuid(),
  parent_name: z.string().max(140).optional().or(z.literal('')).nullable(),
  parent_phone: z.string().min(7).max(40).optional().or(z.literal('')).nullable(),
  parent_email: z.string().email(),
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
export type QuickAddChildResult = {
  id: string
  firstName: string
  lastName: string
  enrollmentStartDate: string
  parentName?: string | null
  parentPhone?: string | null
  parentEmail?: string | null
  whatsappHref?: string | null
  parentOnboardingUrl?: string | null
}

export type QuickAddChildrenResult = {
  success: boolean
  message: string
  created?: QuickAddChildResult[]
}

export type SendParentLinkForExistingChildResult = {
  success: boolean
  message: string
  childId?: string
  whatsappHref?: string
  parentOnboardingUrl?: string
  request?: ParentLinkRequestSummary
  existingParentDetected?: boolean
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
function buildParentInviteLinks(args: {
  childId: string
  centreName: string
  childName: string
  parentName?: string | null
  parentPhone: string
}) {
  const normalizedPhone = normalizePhoneForWhatsapp(args.parentPhone)
  const parentOnboardingUrl = `${getAppUrl()}/register?next=${encodeURIComponent('/parent/children/new')}&manualChildId=${args.childId}`
  if (!normalizedPhone) {
    return {
      normalizedPhone: null,
      parentOnboardingUrl,
      whatsappHref: null,
    }
  }

  const greetingName = args.parentName?.trim() || 'Parent'
  const whatsappMessage = [
    `Hi ${greetingName},`,
    `${args.centreName} started a child profile for ${args.childName}.`,
    'Please complete the details and documents here:',
    parentOnboardingUrl,
    'Thank you! We are ready to help if you get stuck.',
  ].join('\n')

  return {
    normalizedPhone,
    parentOnboardingUrl,
    whatsappHref: `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(whatsappMessage)}`,
  }
}

function normalizeGuardianContacts(raw: unknown) {
  if (!Array.isArray(raw)) return []

  const contacts = raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const record = entry as Record<string, unknown>
      return {
        full_name: typeof record.full_name === 'string' ? record.full_name.trim() || null : null,
        relationship: typeof record.relationship === 'string' ? record.relationship.trim() || null : null,
        phone: typeof record.phone === 'string' ? record.phone.trim() || null : null,
        email: typeof record.email === 'string' ? record.email.trim() || null : null,
        can_pickup: typeof record.can_pickup === 'boolean' ? record.can_pickup : true,
        role: typeof record.role === 'string' ? record.role.trim() || null : null,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  return contacts.filter((entry) => Boolean(entry.full_name || entry.phone || entry.email))
}

function normalizeEmergencyContacts(raw: unknown) {
  if (!Array.isArray(raw)) return []

  const contacts = raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const record = entry as Record<string, unknown>
      return {
        full_name: typeof record.full_name === 'string' ? record.full_name.trim() || null : null,
        relationship: typeof record.relationship === 'string' ? record.relationship.trim() || null : null,
        phone: typeof record.phone === 'string' ? record.phone.trim() || null : null,
        notes: typeof record.notes === 'string' ? record.notes.trim() || null : null,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  return contacts.filter((entry) => Boolean(entry.full_name || entry.phone || entry.notes))
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

function extractNumberedNameCandidates(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d{1,3}[\).:\-\s]+/, '').trim())
    .filter((line) => line.length >= 2)
    .filter((line) => /[A-Za-z]/.test(line))
}

function normalizeCandidateName(value: string) {
  return value
    .replace(/^\s*\d{1,3}[\).:\-\s]+/, '')
    .replace(/[|•·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseRegisterNames(extraction: AiExtractionPayload) {
  const fullNameValue = extraction.fields.full_name?.value
  const fromArray = Array.isArray(fullNameValue) ? fullNameValue : []
  const fromString = typeof fullNameValue === 'string' ? splitPossibleNames(fullNameValue) : []
  const firstName = getFieldString(extraction, 'first_name')
  const lastName = getFieldString(extraction, 'last_name')
  const mergedSingle = [firstName, lastName].filter(Boolean).join(' ').trim()

  const banned = new Set(['present', 'absent', 'late', 'sick', 'attendance', 'register', 'date', 'class', 'total'])

  const notesText = getFieldString(extraction, 'notes') ?? ''
  const numberedCandidates = extractNumberedNameCandidates(
    [typeof fullNameValue === 'string' ? fullNameValue : '', notesText].join('\\n')
  )

  const cleanedCandidates = [...fromArray, ...fromString, mergedSingle, ...numberedCandidates]
    .map((name) => normalizeCandidateName(name))
    .filter((name) => name.length >= 2)

  const strict = cleanedCandidates.filter((name) => {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length < 1 || parts.length > 5) return false
    return parts.every((part) => {
      const normalized = part.replace(/[^A-Za-z'\-]/g, '')
      if (!normalized) return false
      if (banned.has(normalized.toLowerCase())) return false
      return /^[A-Za-z][A-Za-z'\-]+$/.test(normalized)
    })
  })

  const relaxed = cleanedCandidates.filter((name) => {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length < 1 || parts.length > 6) return false
    const alphaCount = parts.filter((part) => /[A-Za-z]/.test(part)).length
    if (alphaCount === 0) return false
    return !parts.some((part) => banned.has(part.toLowerCase()))
  })

  const all = strict.length > 0 ? strict : relaxed

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
  try {
    const session = await getEcdPortalSession()
    if (!session?.ecdId) {
      return { success: false, message: 'ECD session not found.' }
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return { success: false, message: 'Upload a register photo first.' }
    }

    const fallbackStartDate = normalizeDateString(String(formData.get('default_start_date') ?? '').trim())

    const extractionResult = await extractStructuredDocumentWithGemini({
      file,
      documentType: 'register',
    })

    const extractionPayload = extractionResult?.success ? extractionResult.extraction : null

    if (!extractionPayload) {
      return {
        success: false,
        message: extractionResult.message || 'Gemini could not extract readable names from this photo.',
      }
    }

    const names = parseRegisterNames(extractionPayload)
    if (names.length === 0) {
      return {
        success: false,
        message: 'Could not detect child names from this photo. Try a clearer image or use CSV import.',
      }
    }

    const suggestedStartDate =
      normalizeDateString(getFieldString(extractionPayload, 'record_date')) ??
      fallbackStartDate ??
      new Date().toISOString().slice(0, 10)
    const confidence =
      getFieldConfidence(extractionPayload, 'full_name') ??
      getFieldConfidence(extractionPayload, 'first_name') ??
      65

    const drafts: ExistingChildBulkDraft[] = names.map((name) => ({
      full_name: name,
      enrollment_start_date: suggestedStartDate,
      confidence,
    }))

    return {
      success: true,
      message: `Extracted ${drafts.length} child name${drafts.length === 1 ? '' : 's'}. Review and save.`,
      drafts,
      summary: extractionPayload.summary || extractionResult.message,
    }
  } catch (error) {
    console.error('[children] extractExistingChildrenFromPhotoAction failed', { error })
    return {
      success: false,
      message: 'Extraction failed unexpectedly. Try again with a clearer image, or use CSV import for urgent capture.',
    }
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

  const createdIds = (inserted ?? []).map((row: any) => String(row.id))

  // Auto-sync birthdays for created children
  if (createdIds.length > 0) {
    for (const childId of createdIds) {
      const child = payload.find((c: any) => String(c.id) === childId)
      if (child?.date_of_birth) {
        try {
          await session.supabase.rpc('ensure_child_birthday_events', {
            p_ecd_id: session.ecdId,
            p_child_id: childId,
            p_first_name: child.first_name || '',
            p_last_name: child.last_name || '',
            p_date_of_birth: child.date_of_birth,
          })
        } catch (e) {
          console.error('[children] Birthday sync failed for child:', childId, e)
        }
      }
    }
  }

  return {
    success: true,
    message: `Created ${createdIds.length} child profile${createdIds.length === 1 ? '' : 's'} from the bulk list.`,
    createdCount: createdIds.length,
    createdIds,
  }
}

export async function quickCreateChildrenAction(
  input: unknown
): Promise<QuickAddChildrenResult> {
  const session = await requireEcdPortalSession({ cached: false })
  if (!session.ecdId) {
    return { success: false, message: 'ECD session not found.' }
  }

  const parsed = quickAddChildrenCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: 'Please review the child names before saving.' }
  }

  const normalizedChildren = parsed.data.children
    .map((child) => ({
      first_name: child.first_name.trim(),
      last_name: child.last_name.trim(),
      enrollment_start_date: child.enrollment_start_date,
      class_id: child.class_id?.trim() || null,
      parent_name: child.parent_name?.trim() || null,
      parent_phone: child.parent_phone?.trim() || null,
      parent_email: child.parent_email?.trim() || null,
    }))
    .filter((child) => child.first_name && child.last_name)

  if (normalizedChildren.length === 0) {
    return { success: false, message: 'Add at least one child name before saving.' }
  }

  const { data: centre } = await session.supabase
    .from('ecd_centres')
    .select('name')
    .eq('id', session.ecdId)
    .maybeSingle()

  const onboardingSentAt = new Date().toISOString()
  const payload = normalizedChildren.map((child) => {
    const guardianContacts = child.parent_phone || child.parent_email || child.parent_name
      ? [
          {
            full_name: child.parent_name || null,
            relationship: 'parent',
            phone: child.parent_phone || null,
            email: child.parent_email || null,
            can_pickup: true,
            role: 'primary_guardian',
          },
        ]
      : []

    const emergencyContacts = child.parent_phone
      ? [
          {
            full_name: child.parent_name || null,
            relationship: 'primary_guardian',
            phone: child.parent_phone,
            notes: 'Added during quick child setup',
          },
        ]
      : []

    return {
      ecd_id: session.ecdId,
      parent_id: null,
      class_id: child.class_id,
      first_name: child.first_name,
      last_name: child.last_name,
      enrollment_start_date: child.enrollment_start_date,
      enrollment_source: 'ecd_manual',
      enrollment_status: 'pending_parent',
      guardian_contacts: guardianContacts,
      emergency_contacts: emergencyContacts,
      emergency_contact_name: child.parent_name || null,
      emergency_contact_phone: child.parent_phone || null,
      onboarding_link_sent_at: child.parent_phone ? onboardingSentAt : null,
    }
  })

  const { data: inserted, error } = await session.supabase
    .from('children')
    .insert(payload)
    .select('id,first_name,last_name,enrollment_start_date')

  if (error || !inserted) {
    return { success: false, message: error?.message || 'Failed to create child profiles.' }
  }

  const centreName = centre?.name?.trim() || 'your ECD centre'
  const auditLogs: Array<Record<string, unknown>> = []
  const created = inserted.map((row, index) => {
    const child = normalizedChildren[index]
    const childName = `${row.first_name} ${row.last_name}`.trim()
    const links = child.parent_phone
      ? buildParentInviteLinks({
          childId: String(row.id),
          centreName,
          childName,
          parentName: child.parent_name,
          parentPhone: child.parent_phone,
        })
      : { normalizedPhone: null, parentOnboardingUrl: null, whatsappHref: null }

    if (links.whatsappHref) {
      auditLogs.push({
        user_id: session.user.id,
        ecd_id: session.ecdId,
        action: 'quick_child_profile_whatsapp_link_generated',
        resource_type: 'children',
        resource_id: String(row.id),
        changes: {
          parent_phone: child.parent_phone,
          whatsapp_href: links.whatsappHref,
          parent_onboarding_url: links.parentOnboardingUrl,
        },
      })
    }

    return {
      id: String(row.id),
      firstName: row.first_name,
      lastName: row.last_name,
      enrollmentStartDate: row.enrollment_start_date,
      parentName: child.parent_name,
      parentPhone: child.parent_phone,
      parentEmail: child.parent_email,
      whatsappHref: links.whatsappHref,
      parentOnboardingUrl: links.parentOnboardingUrl,
    }
  })

  if (auditLogs.length > 0) {
    await session.supabase.from('audit_logs').insert(auditLogs)
  }

  revalidatePath('/ecd/children')
  revalidatePath('/ecd/children/new')
  revalidatePath('/ecd/dashboard')

  const readyLinks = created.filter((child) => Boolean(child.whatsappHref)).length
  return {
    success: true,
    message:
      readyLinks > 0
        ? `Created ${created.length} children. ${readyLinks} parent WhatsApp link${readyLinks === 1 ? '' : 's'} ${readyLinks === 1 ? 'is' : 'are'} ready.`
        : `Created ${created.length} children. You can add parent links later.`,
    created,
  }
}

export async function sendParentLinkForExistingChildAction(
  input: unknown
): Promise<SendParentLinkForExistingChildResult> {
  const session = await requireEcdPortalSession({ cached: false })
  if (!session.ecdId) {
    return { success: false, message: 'ECD session not found.' }
  }

  const parsed = sendParentLinkForExistingChildSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: 'Add the parent email before sending the family link.' }
  }

  const result = await createOrResendParentLinkRequest({
    childId: parsed.data.child_id,
    ecdId: session.ecdId,
    requestedByUserId: session.user.id,
    parentEmail: parsed.data.parent_email,
    parentPhone: parsed.data.parent_phone ?? null,
    parentName: parsed.data.parent_name ?? null,
  })

  if (!result.ok) {
    return { success: false, message: result.message }
  }

  revalidatePath('/ecd/children')
  revalidatePath('/ecd/children/new')

  return {
    success: true,
    message: result.message,
    childId: result.request?.childId,
    whatsappHref: result.whatsappHref ?? undefined,
    parentOnboardingUrl: result.accessLink ?? undefined,
    request: result.request,
    existingParentDetected: result.existingParentDetected,
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

  revalidatePath('/ecd/children')
  revalidatePath('/ecd/children/new')
  revalidatePath('/ecd/dashboard')

  return {
    success: true,
    message: 'Child profile saved. Open WhatsApp to send the parent completion link.',
    tempProfileId,
    whatsappHref,
    parentOnboardingUrl,
  }
}

