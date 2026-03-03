'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  extractStructuredDocumentWithGemini,
  uploadPhotoForAiExtraction,
} from '@/lib/ai/document-extraction-service'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const extractSchema = z.object({
  attendance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
})

const importSchema = z.object({
  import_id: z.string().uuid(),
  child_id: z.string().uuid().optional().or(z.literal('')),
  selected_name: z.string().max(240).optional(),
  attendance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  create_child_if_missing: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
})

type ImportRow = {
  id: string
  source_file_url: string
  source_file_name: string | null
  extracted_names: string[]
  extracted_date: string | null
  status: 'extracted' | 'reviewed' | 'imported' | 'failed'
  selected_name: string | null
  imported_child_id: string | null
  imported_attendance_id: string | null
  notes: string | null
  created_at: string
}

export type RegisterExtractionActionResult = {
  success: boolean
  message: string
  items?: ImportRow[]
  item?: ImportRow
}

export type RegisterImportActionResult = {
  success: boolean
  message: string
  item?: ImportRow
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return null
  const cleaned = value.trim()
  if (!cleaned) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned

  const ddmmyyyy = cleaned.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy
    return `${yyyy}-${mm}-${dd}`
  }

  return null
}

function fieldAsString(extraction: {
  fields: Record<string, { value: string | string[]; confidence: number }>
}, key: string) {
  const value = extraction.fields[key]?.value
  if (typeof value !== 'string') return null
  const cleaned = value.trim()
  return cleaned || null
}

function fieldAsStringList(extraction: {
  fields: Record<string, { value: string | string[]; confidence: number }>
}, key: string) {
  const value = extraction.fields[key]?.value
  if (!Array.isArray(value)) return null
  const list = value.map((entry) => entry.trim()).filter(Boolean)
  return list.length > 0 ? list : null
}

function splitPossibleNames(input: string) {
  return input
    .split(/\r?\n|,|;|\|/g)
    .map((entry) => entry.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function parseExtractedNames(extraction: {
  fields: Record<string, { value: string | string[]; confidence: number }>
}) {
  const namesFromArray = fieldAsStringList(extraction, 'full_name') ?? []
  const namesFromString = fieldAsString(extraction, 'full_name')
    ? splitPossibleNames(fieldAsString(extraction, 'full_name') as string)
    : []
  const firstName = fieldAsString(extraction, 'first_name')
  const lastName = fieldAsString(extraction, 'last_name')
  const mergedSingle = [firstName, lastName].filter(Boolean).join(' ').trim()

  const all = [...namesFromArray, ...namesFromString, mergedSingle]
    .map((entry) => entry.replace(/\s+/g, ' ').trim())
    .filter((entry) => entry.length >= 2)

  const unique: string[] = []
  const seen = new Set<string>()
  for (const name of all) {
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(name)
  }

  return unique.slice(0, 40)
}

function serializeImportRow(row: Record<string, unknown>): ImportRow {
  return {
    id: String(row.id ?? ''),
    source_file_url: String(row.source_file_url ?? ''),
    source_file_name: row.source_file_name ? String(row.source_file_name) : null,
    extracted_names: Array.isArray(row.extracted_names)
      ? row.extracted_names.map((entry) => String(entry))
      : [],
    extracted_date: row.extracted_date ? String(row.extracted_date) : null,
    status: (row.status as ImportRow['status']) ?? 'extracted',
    selected_name: row.selected_name ? String(row.selected_name) : null,
    imported_child_id: row.imported_child_id ? String(row.imported_child_id) : null,
    imported_attendance_id: row.imported_attendance_id ? String(row.imported_attendance_id) : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
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

export async function extractRegisterPhotoAction(formData: FormData): Promise<RegisterExtractionActionResult> {
  const session = await requireEcdPortalSession({ cached: false })
  if (!session.ecdId) return { success: false, message: 'ECD session not found.' }

  const parsed = extractSchema.safeParse({
    attendance_date: String(formData.get('attendance_date') ?? '').trim(),
    notes: String(formData.get('notes') ?? '').trim(),
  })

  if (!parsed.success) {
    return { success: false, message: 'Invalid extraction request.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { success: false, message: 'Select a photo before extracting.' }
  }

  const upload = await uploadPhotoForAiExtraction({
    supabase: session.supabase,
    ecdId: session.ecdId,
    documentType: 'register',
    file,
    folder: 'attendance-registers',
  })

  if (!upload.success || !upload.path || !upload.publicUrl) {
    return { success: false, message: upload.message || 'Failed to upload register photo.' }
  }

  const extraction = await extractStructuredDocumentWithGemini({
    file,
    documentType: 'register',
  })

  if (!extraction.success || !extraction.extraction) {
    const { data: failedRow } = await session.supabase
      .from('attendance_register_imports')
      .insert({
        ecd_id: session.ecdId,
        uploaded_by: session.user.id,
        source_file_path: upload.path,
        source_file_url: upload.publicUrl,
        source_file_name: file.name,
        extraction: {},
        extracted_names: [],
        extracted_date: normalizeDate(parsed.data.attendance_date) ?? null,
        status: 'failed',
        notes: extraction.message,
      })
      .select(
        'id,source_file_url,source_file_name,extracted_names,extracted_date,status,selected_name,imported_child_id,imported_attendance_id,notes,created_at'
      )
      .maybeSingle()

    revalidatePath('/ecd/ai-upload')
    return {
      success: false,
      message: extraction.message,
      item: failedRow ? serializeImportRow(failedRow as Record<string, unknown>) : undefined,
    }
  }

  const names = parseExtractedNames(extraction.extraction)
  const extractedDate =
    normalizeDate(fieldAsString(extraction.extraction, 'record_date')) ??
    normalizeDate(parsed.data.attendance_date) ??
    null

  const rowsPayload =
    names.length > 0
      ? names.map((name) => ({
          ecd_id: session.ecdId,
          uploaded_by: session.user.id,
          source_file_path: upload.path,
          source_file_url: upload.publicUrl,
          source_file_name: file.name,
          extraction: {
            summary: extraction.extraction?.summary ?? null,
            fields: extraction.extraction?.fields ?? {},
          },
          extracted_names: [name],
          extracted_date: extractedDate,
          selected_name: name,
          status: 'extracted' as const,
          notes: parsed.data.notes?.trim() || extraction.extraction?.summary || null,
        }))
      : [
          {
            ecd_id: session.ecdId,
            uploaded_by: session.user.id,
            source_file_path: upload.path,
            source_file_url: upload.publicUrl,
            source_file_name: file.name,
            extraction: {
              summary: extraction.extraction?.summary ?? null,
              fields: extraction.extraction?.fields ?? {},
            },
            extracted_names: [],
            extracted_date: extractedDate,
            status: 'extracted' as const,
            notes: parsed.data.notes?.trim() || extraction.extraction?.summary || null,
          },
        ]

  const { data: createdRows, error } = await session.supabase
    .from('attendance_register_imports')
    .insert(rowsPayload)
    .select(
      'id,source_file_url,source_file_name,extracted_names,extracted_date,status,selected_name,imported_child_id,imported_attendance_id,notes,created_at'
    )
    .order('created_at', { ascending: false })

  if (error || !createdRows || createdRows.length === 0) {
    return { success: false, message: error?.message || 'Failed to save extracted register data.' }
  }

  const serializedItems = (createdRows as Record<string, unknown>[]).map((row) => serializeImportRow(row))

  revalidatePath('/ecd/ai-upload')
  return {
    success: true,
    message:
      names.length > 0
        ? `Register extracted. ${serializedItems.length} name${serializedItems.length === 1 ? '' : 's'} ready for import.`
        : 'Register extracted. No names detected; please review manually.',
    items: serializedItems,
    item: serializedItems[0],
  }
}

export async function importRegisterEntryAction(formData: FormData): Promise<RegisterImportActionResult> {
  const session = await requireEcdPortalSession({ cached: false })

  const parsed = importSchema.safeParse({
    import_id: String(formData.get('import_id') ?? '').trim(),
    child_id: String(formData.get('child_id') ?? '').trim(),
    selected_name: String(formData.get('selected_name') ?? '').trim(),
    attendance_date: String(formData.get('attendance_date') ?? '').trim(),
    create_child_if_missing: String(formData.get('create_child_if_missing') ?? '') === 'on',
    notes: String(formData.get('notes') ?? '').trim(),
  })

  if (!parsed.success) {
    return { success: false, message: 'Invalid import request.' }
  }

  const { data: importRow, error: importError } = await session.supabase
    .from('attendance_register_imports')
    .select('id,ecd_id,extracted_names,extracted_date,status,notes')
    .eq('id', parsed.data.import_id)
    .eq('ecd_id', session.ecdId)
    .single()

  if (importError || !importRow) {
    return { success: false, message: 'Register import record not found.' }
  }

  let childId = parsed.data.child_id || ''
  const selectedName =
    (parsed.data.selected_name ?? '').trim() ||
    (Array.isArray(importRow.extracted_names) ? String(importRow.extracted_names[0] ?? '').trim() : '')

  if (!childId && parsed.data.create_child_if_missing) {
    if (!selectedName) {
      return { success: false, message: 'No child name available to create a profile.' }
    }

    const split = splitNameForChild(selectedName)
    const { data: createdChild, error: createChildError } = await session.supabase
      .from('children')
      .insert({
        ecd_id: session.ecdId,
        parent_id: null,
        first_name: split.firstName,
        last_name: split.lastName,
        enrollment_source: 'ecd_manual',
        enrollment_status: 'pending_parent',
        guardian_contacts: [],
        emergency_contacts: [],
      })
      .select('id')
      .single()

    if (createChildError || !createdChild?.id) {
      return { success: false, message: createChildError?.message || 'Failed to create child profile from register.' }
    }

    childId = createdChild.id
  }

  if (!childId) {
    return { success: false, message: 'Select an existing child or enable "create child profile".' }
  }

  const { data: childMatch, error: childMatchError } = await session.supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('ecd_id', session.ecdId)
    .maybeSingle()

  if (childMatchError || !childMatch?.id) {
    return { success: false, message: 'Selected child is not linked to this centre.' }
  }

  const attendanceDate =
    normalizeDate(parsed.data.attendance_date) ??
    (importRow.extracted_date ? String(importRow.extracted_date) : null) ??
    new Date().toISOString().slice(0, 10)

  const { data: existingAttendance } = await session.supabase
    .from('attendance')
    .select('id,picked_up,picked_up_at')
    .eq('ecd_id', session.ecdId)
    .eq('child_id', childId)
    .eq('date', attendanceDate)
    .maybeSingle()

  let attendanceId: string | null = null
  const checkedInAt = new Date().toISOString()

  if (existingAttendance?.id) {
    const { data: updatedAttendance, error: updateAttendanceError } = await session.supabase
      .from('attendance')
      .update({
        checked_in: true,
        checked_in_at: checkedInAt,
        checked_in_by: session.user.id,
        notes: parsed.data.notes?.trim() || importRow.notes || null,
      })
      .eq('id', existingAttendance.id)
      .select('id')
      .single()

    if (updateAttendanceError || !updatedAttendance?.id) {
      return { success: false, message: updateAttendanceError?.message || 'Failed to update attendance.' }
    }

    attendanceId = updatedAttendance.id
  } else {
    const { data: createdAttendance, error: createAttendanceError } = await session.supabase
      .from('attendance')
      .insert({
        ecd_id: session.ecdId,
        child_id: childId,
        date: attendanceDate,
        checked_in: true,
        checked_in_at: checkedInAt,
        checked_in_by: session.user.id,
        picked_up: false,
        notes: parsed.data.notes?.trim() || importRow.notes || null,
      })
      .select('id')
      .single()

    if (createAttendanceError || !createdAttendance?.id) {
      return { success: false, message: createAttendanceError?.message || 'Failed to create attendance.' }
    }

    attendanceId = createdAttendance.id
  }

  const { data: updatedImport, error: updateImportError } = await session.supabase
    .from('attendance_register_imports')
    .update({
      status: 'imported',
      selected_name: selectedName || null,
      imported_child_id: childId,
      imported_attendance_id: attendanceId,
      notes: parsed.data.notes?.trim() || importRow.notes || null,
    })
    .eq('id', importRow.id)
    .eq('ecd_id', session.ecdId)
    .select(
      'id,source_file_url,source_file_name,extracted_names,extracted_date,status,selected_name,imported_child_id,imported_attendance_id,notes,created_at'
    )
    .single()

  if (updateImportError || !updatedImport) {
    return { success: false, message: updateImportError?.message || 'Attendance imported, but register item was not updated.' }
  }

  revalidatePath('/ecd/ai-upload')
  revalidatePath('/ecd/attendance')
  return {
    success: true,
    message: 'Attendance imported successfully.',
    item: serializeImportRow(updatedImport as Record<string, unknown>),
  }
}
