'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  extractStructuredDocumentWithGemini,
  uploadPhotoForAiExtraction,
  type AiDocumentType,
  type AiExtractionPayload,
  type AiFieldKey,
} from '@/lib/ai/document-extraction-service'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const markDocumentSchema = z.object({
  id: z.string().uuid(),
  current_status: z.enum(['missing', 'uploaded', 'verified', 'expired']),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
  file_url: z.string().url().optional().or(z.literal('')),
  ai_issuing_authority: z.string().max(240).optional(),
  ai_document_number: z.string().max(240).optional(),
  ai_record_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
})

const addStaffCheckSchema = z.object({
  staff_name: z.string().min(2).max(120),
  staff_role: z.string().max(120).optional(),
  medical_clearance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  criminal_clearance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  first_aid_cert_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  first_aid_cert_expires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  form_29_submitted: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
})

const extractionSchema = z.object({
  id: z.string().uuid(),
  document_type: z.string().min(2).max(120),
})

type ComplianceConfidenceMap = Partial<
  Record<'expires_at' | 'issuing_authority' | 'document_number' | 'record_date' | 'notes', number>
>

export type ComplianceExtractionResult = {
  success: boolean
  message: string
  fileUrl?: string
  storagePath?: string
  summary?: string
  prefill?: {
    expires_at?: string
    issuing_authority?: string
    document_number?: string
    record_date?: string
    notes?: string
  }
  confidence?: ComplianceConfidenceMap
}

function normalizeDate(raw: string | undefined) {
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

function mapComplianceDocTypeToAiType(documentType: string): AiDocumentType {
  const value = documentType.trim().toLowerCase()
  if (value.includes('fire_clearance')) return 'fire_clearance'
  if (value.includes('health_clearance')) return 'health_clearance'
  if (value.includes('staff_qualification')) return 'staff_qualification'
  if (value.includes('immunization')) return 'immunization_record'
  if (value.includes('medical_card')) return 'medical_card'
  if (value.includes('birth_certificate')) return 'birth_certificate'
  return 'register'
}

function getFieldString(extraction: AiExtractionPayload, key: AiFieldKey) {
  const value = extraction.fields[key]?.value
  if (typeof value !== 'string') return undefined
  const cleaned = value.trim()
  return cleaned || undefined
}

function getFieldConfidence(extraction: AiExtractionPayload, key: AiFieldKey) {
  return extraction.fields[key]?.confidence
}

function mapToCompliancePrefill(extraction: AiExtractionPayload) {
  const issuingAuthority = getFieldString(extraction, 'issuing_authority')
  const documentNumber = getFieldString(extraction, 'document_number')
  const recordDate = normalizeDate(getFieldString(extraction, 'record_date'))
  const expiryDate = normalizeDate(getFieldString(extraction, 'expiry_date'))
  const summary = extraction.summary?.trim()

  const notesParts = [summary]
  if (issuingAuthority) notesParts.push(`Issuing authority: ${issuingAuthority}`)
  if (documentNumber) notesParts.push(`Document number: ${documentNumber}`)
  const notes = notesParts.filter(Boolean).join(' | ').slice(0, 1800)

  const confidence: ComplianceConfidenceMap = {
    expires_at: getFieldConfidence(extraction, 'expiry_date'),
    issuing_authority: getFieldConfidence(extraction, 'issuing_authority'),
    document_number: getFieldConfidence(extraction, 'document_number'),
    record_date: getFieldConfidence(extraction, 'record_date'),
    notes: summary ? getFieldConfidence(extraction, 'notes') ?? 70 : undefined,
  }

  return {
    prefill: {
      expires_at: expiryDate,
      issuing_authority: issuingAuthority,
      document_number: documentNumber,
      record_date: recordDate,
      notes: notes || undefined,
    },
    confidence,
  }
}

export async function markDocumentUploadedAction(formData: FormData) {
  const session = await requireEcdPortalSession({ cached: false })
  if (session.role !== 'ecd_admin' && session.role !== 'ecd_supervisor') return

  const parsed = markDocumentSchema.safeParse({
    id: String(formData.get('id') ?? '').trim(),
    current_status: String(formData.get('current_status') ?? 'missing').trim(),
    expires_at: String(formData.get('expires_at') ?? '').trim(),
    notes: String(formData.get('notes') ?? '').trim(),
    file_url: String(formData.get('file_url') ?? '').trim(),
    ai_issuing_authority: String(formData.get('ai_issuing_authority') ?? '').trim(),
    ai_document_number: String(formData.get('ai_document_number') ?? '').trim(),
    ai_record_date: String(formData.get('ai_record_date') ?? '').trim(),
  })
  if (!parsed.success) return

  const nextStatus = parsed.data.current_status === 'verified' ? 'verified' : 'uploaded'
  const extraBits = [
    parsed.data.ai_issuing_authority ? `Issuing authority: ${parsed.data.ai_issuing_authority}` : '',
    parsed.data.ai_document_number ? `Document number: ${parsed.data.ai_document_number}` : '',
    parsed.data.ai_record_date ? `Record date: ${parsed.data.ai_record_date}` : '',
  ].filter(Boolean)
  const mergedNotes = [parsed.data.notes || '', ...extraBits].filter(Boolean).join(' | ').slice(0, 2000)

  await session.supabase
    .from('compliance_documents')
    .update({
      status: nextStatus,
      expires_at: parsed.data.expires_at || null,
      notes: mergedNotes || null,
      file_url: parsed.data.file_url || null,
      uploaded_by: session.user.id,
    })
    .eq('id', parsed.data.id)
    .eq('ecd_id', session.ecdId)

  revalidatePath('/ecd/compliance')
}

export async function extractComplianceDocumentFromPhotoAction(
  formData: FormData
): Promise<ComplianceExtractionResult> {
  const session = await requireEcdPortalSession({ cached: false })
  if (session.role !== 'ecd_admin' && session.role !== 'ecd_supervisor') {
    return { success: false, message: 'Only admins and supervisors can extract compliance documents.' }
  }

  const parsed = extractionSchema.safeParse({
    id: String(formData.get('id') ?? '').trim(),
    document_type: String(formData.get('document_type') ?? '').trim(),
  })

  if (!parsed.success) {
    return { success: false, message: 'Invalid compliance document payload.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { success: false, message: 'No photo uploaded for extraction.' }
  }

  const { data: doc } = await session.supabase
    .from('compliance_documents')
    .select('id')
    .eq('id', parsed.data.id)
    .eq('ecd_id', session.ecdId)
    .maybeSingle()

  if (!doc?.id) {
    return { success: false, message: 'Compliance document not found for this centre.' }
  }

  const aiType = mapComplianceDocTypeToAiType(parsed.data.document_type)
  const uploadResult = await uploadPhotoForAiExtraction({
    supabase: session.supabase,
    ecdId: session.ecdId,
    documentType: aiType,
    file,
    folder: 'compliance',
  })

  if (!uploadResult.success) {
    return { success: false, message: uploadResult.message }
  }

  const extractionResult = await extractStructuredDocumentWithGemini({
    file,
    documentType: aiType,
  })

  if (!extractionResult.success || !extractionResult.extraction) {
    return {
      success: false,
      message: extractionResult.message,
      fileUrl: uploadResult.publicUrl,
      storagePath: uploadResult.path,
    }
  }

  const mapped = mapToCompliancePrefill(extractionResult.extraction)
  return {
    success: true,
    message: 'Photo uploaded and AI extraction complete. Review and override any field before saving.',
    fileUrl: uploadResult.publicUrl,
    storagePath: uploadResult.path,
    summary: extractionResult.extraction.summary,
    prefill: mapped.prefill,
    confidence: mapped.confidence,
  }
}

export async function addStaffCheckAction(formData: FormData) {
  const session = await requireEcdPortalSession({ cached: false })
  if (session.role !== 'ecd_admin' && session.role !== 'ecd_supervisor') return

  const parsed = addStaffCheckSchema.safeParse({
    staff_name: String(formData.get('staff_name') ?? '').trim(),
    staff_role: String(formData.get('staff_role') ?? '').trim(),
    medical_clearance_date: String(formData.get('medical_clearance_date') ?? '').trim(),
    criminal_clearance_date: String(formData.get('criminal_clearance_date') ?? '').trim(),
    first_aid_cert_date: String(formData.get('first_aid_cert_date') ?? '').trim(),
    first_aid_cert_expires: String(formData.get('first_aid_cert_expires') ?? '').trim(),
    form_29_submitted: String(formData.get('form_29_submitted') ?? '') === 'on',
    notes: String(formData.get('notes') ?? '').trim(),
  })

  if (!parsed.success) return

  await session.supabase.from('compliance_staff_checks').insert({
    ecd_id: session.ecdId,
    staff_name: parsed.data.staff_name,
    staff_role: parsed.data.staff_role || null,
    medical_clearance_date: parsed.data.medical_clearance_date || null,
    criminal_clearance_date: parsed.data.criminal_clearance_date || null,
    first_aid_cert_date: parsed.data.first_aid_cert_date || null,
    first_aid_cert_expires: parsed.data.first_aid_cert_expires || null,
    form_29_submitted: parsed.data.form_29_submitted,
    notes: parsed.data.notes || null,
  })

  revalidatePath('/ecd/compliance')
}
