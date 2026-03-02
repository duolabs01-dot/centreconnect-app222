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

const tempChildProfileSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  date_of_birth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  blood_type: z.string().optional().nullable(),
  doctor_name: z.string().optional().nullable(),
  medical_aid_number: z.string().optional().nullable(),
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
  parent_phone: z.string().min(7),
  parent_email: z.string().email().optional().or(z.literal('')).nullable(),
  secondary_guardian_name: z.string().optional().nullable(),
  secondary_guardian_phone: z.string().optional().nullable(),
  secondary_guardian_email: z.string().email().optional().or(z.literal('')).nullable(),
  birth_certificate_file_name: z.string().optional().nullable(),
  birth_certificate_file_url: z.string().url().optional().or(z.literal('')).nullable(),
  medical_card_file_name: z.string().optional().nullable(),
  medical_card_file_url: z.string().url().optional().or(z.literal('')).nullable(),
  immunization_record_file_name: z.string().optional().nullable(),
  immunization_record_file_url: z.string().url().optional().or(z.literal('')).nullable(),
  ai_review_notes: z.string().optional().nullable(),
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

function getAppUrl() {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://centreconnect.co.za'
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

export async function saveTempChildProfileAndInviteParentAction(
  input: unknown
): Promise<SaveTempChildProfileResult> {
  const session = await requireEcdPortalSession({ cached: false })
  const parsed = tempChildProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: 'Please complete all required fields before saving.' }
  }

  const payload = parsed.data
  const tempProfileId = randomUUID()

  const { data: centre } = await session.supabase
    .from('ecd_centres')
    .select('name')
    .eq('id', session.ecdId)
    .maybeSingle()

  const { error: saveError } = await session.supabase.from('audit_logs').insert({
    user_id: session.user.id,
    ecd_id: session.ecdId,
    action: 'temp_child_profile_saved',
    resource_type: 'temp_child_profile',
    resource_id: tempProfileId,
    changes: {
      status: 'pending_parent_completion',
      temp_profile_id: tempProfileId,
      ecd_id: session.ecdId,
      created_by: session.user.id,
      created_at: new Date().toISOString(),
      ...payload,
    },
  })

  if (saveError) {
    return {
      success: false,
      message: saveError.message || 'Failed to save temporary profile.',
    }
  }

  const parentPhone = normalizePhoneForWhatsapp(payload.parent_phone)
  if (!parentPhone) {
    return {
      success: false,
      message: 'Temporary profile saved, but parent phone number is invalid for WhatsApp.',
      tempProfileId,
    }
  }

  const parentOnboardingUrl = `${getAppUrl()}/register?tempChildProfile=${tempProfileId}`
  const centreName = centre?.name?.trim() || 'your ECD centre'
  const childName = `${payload.first_name} ${payload.last_name}`.trim()
  const greetingName = payload.parent_name?.trim() || 'Parent'

  const whatsappMessage = [
    `Hi ${greetingName},`,
    `${centreName} has started a manual enrollment profile for ${childName}.`,
    `Please review and complete the child profile here: ${parentOnboardingUrl}`,
    'Reply to this message if you need help.',
  ].join('\n')

  const whatsappHref = `https://wa.me/${parentPhone}?text=${encodeURIComponent(whatsappMessage)}`

  await session.supabase.from('audit_logs').insert({
    user_id: session.user.id,
    ecd_id: session.ecdId,
    action: 'temp_child_profile_whatsapp_link_generated',
    resource_type: 'temp_child_profile',
    resource_id: tempProfileId,
    changes: {
      parent_phone: payload.parent_phone,
      whatsapp_href: whatsappHref,
      parent_onboarding_url: parentOnboardingUrl,
    },
  })

  return {
    success: true,
    message: 'Temporary profile saved. Open WhatsApp to send the parent completion link.',
    tempProfileId,
    whatsappHref,
    parentOnboardingUrl,
  }
}

