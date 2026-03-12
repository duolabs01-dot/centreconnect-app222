'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  extractWithTesseract,
  uploadPhotoForAiExtraction,
} from '@/lib/ai/document-extraction-service'
import {
  ATTENDANCE_CSV_GUIDANCE,
  ATTENDANCE_CSV_LIMITATIONS,
  ATTENDANCE_CSV_MAX_ROWS,
  type AttendanceRecordStatus,
  normalizeNameForMatch,
  parseAttendanceCsvText,
  validateAttendanceCsvFile,
} from '@/lib/attendance/csv'
import {
  ATTENDANCE_IMPORT_FALLBACK_STEPS,
  buildAttendanceBoardHref,
  normalizeAttendanceImportDate,
  validateAttendanceImportFile,
} from '@/lib/attendance/imports'
import { requireEcdPortalSession, type EcdPortalSession } from '@/lib/ecd/portal-session'

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

const csvPreviewSchema = z.object({
  attendance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
})

const csvPreviewRowSchema = z.object({
  lineNumber: z.number().int().positive(),
  childName: z.string().min(1).max(240),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')),
  status: z.enum(['present', 'absent', 'sick', 'late']),
  className: z.string().max(160).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  matchedChildId: z.string().uuid().nullable(),
  matchedChildName: z.string().max(240).nullable(),
  issues: z.array(z.string().max(240)).max(10),
})

const csvImportSchema = z.object({
  source_file_name: z.string().min(1).max(240),
  rows: z.array(csvPreviewRowSchema).max(ATTENDANCE_CSV_MAX_ROWS),
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

const registerImportSelectFields =
  'id,source_file_url,source_file_name,extracted_names,extracted_date,status,selected_name,imported_child_id,imported_attendance_id,notes,created_at'

export type RegisterExtractionActionResult = {
  success: boolean
  message: string
  items?: ImportRow[]
  item?: ImportRow
  fallbackHref?: string
  guidance?: string[]
}

export type RegisterImportActionResult = {
  success: boolean
  message: string
  item?: ImportRow
  attendanceHref?: string
}

export type AttendanceCsvPreviewRow = z.infer<typeof csvPreviewRowSchema>

export type AttendanceCsvPreviewActionResult = {
  success: boolean
  message: string
  fileName?: string
  headers?: string[]
  rows?: AttendanceCsvPreviewRow[]
  warnings?: string[]
  readyCount?: number
  blockedCount?: number
  fallbackHref?: string
  guidance?: string[]
}

export type AttendanceCsvImportActionResult = {
  success: boolean
  message: string
  importedCount?: number
  blockedCount?: number
  attendanceHref?: string
  warnings?: string[]
}

type ChildMatchRow = {
  id: string
  first_name: string | null
  last_name: string | null
  class_id: string | null
}

type ClassMatchRow = {
  id: string
  name: string
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

function isLikelyPersonName(value: string) {
  const cleaned = value.replace(/[|•·]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return false

  const parts = cleaned.split(' ').filter(Boolean)
  if (parts.length < 1 || parts.length > 6) return false

  const banned = new Set([
    'present',
    'absent',
    'late',
    'sick',
    'register',
    'attendance',
    'total',
    'class',
    'date',
    'signature',
  ])

  const hasAlpha = parts.some((part) => /[A-Za-z]/.test(part))
  if (!hasAlpha) return false

  return parts.every((part) => {
    const normalized = part.replace(/[^A-Za-z'\-]/g, '')
    if (!normalized) return false
    const lower = normalized.toLowerCase()
    if (banned.has(lower)) return false
    return /^[A-Za-z][A-Za-z'\-]+$/.test(normalized)
  })
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
    .filter((entry) => isLikelyPersonName(entry))

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

function displayChildName(input: { first_name: string | null; last_name: string | null }) {
  const value = `${input.first_name ?? ''} ${input.last_name ?? ''}`.trim()
  return value || 'Unnamed child'
}

function dedupeGuidance(values: Array<string | null | undefined>) {
  const output: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const cleaned = value?.trim()
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(cleaned)
  }

  return output
}

function buildLegacyAttendanceNotes(input: {
  notes: string | null
  status: AttendanceRecordStatus
}) {
  const output: string[] = []
  const trimmedNotes = input.notes?.trim()
  if (trimmedNotes) {
    output.push(trimmedNotes)
  }

  if (input.status === 'late') {
    output.push('Imported from attendance register as late.')
  }

  if (input.status === 'absent' || input.status === 'sick') {
    output.push(`Imported from attendance register as ${input.status}.`)
  }

  return output.length > 0 ? output.join(' ') : null
}

function buildAttendanceRecordPayload(
  session: EcdPortalSession,
  input: {
    childId: string
    classId: string | null
    attendanceDate: string
    status: AttendanceRecordStatus
  }
) {
  return {
    centre_id: session.ecdId,
    child_id: input.childId,
    class_id: input.classId,
    date: input.attendanceDate,
    status: input.status,
    recorded_by: session.user.id,
    updated_at: new Date().toISOString(),
  }
}

type ChildMatchOption = {
  id: string
  name: string
  classId: string | null
  className: string | null
}

function findPreviewChildMatch(
  row: {
    childName: string
    className: string | null
    issues: string[]
  },
  childrenByName: Map<string, ChildMatchOption[]>
) {
  const issues = [...row.issues]
  const matches = childrenByName.get(normalizeNameForMatch(row.childName)) ?? []

  if (matches.length === 0) {
    issues.push('No exact CentreConnect child match was found for this name.')
    return {
      matchedChildId: null,
      matchedChildName: null,
      issues,
    }
  }

  if (matches.length === 1) {
    return {
      matchedChildId: matches[0].id,
      matchedChildName: matches[0].name,
      issues,
    }
  }

  const normalizedClassName = row.className ? normalizeNameForMatch(row.className) : ''
  if (normalizedClassName) {
    const classMatches = matches.filter((child) => normalizeNameForMatch(child.className ?? '') === normalizedClassName)

    if (classMatches.length === 1) {
      return {
        matchedChildId: classMatches[0].id,
        matchedChildName: classMatches[0].name,
        issues,
      }
    }
  }

  issues.push('More than one child has this exact name. Add class_name to the CSV or save this row manually.')
  return {
    matchedChildId: null,
    matchedChildName: null,
    issues,
  }
}

async function createFailedRegisterImportRow(
  session: EcdPortalSession,
  input: {
    sourceFilePath: string
    sourceFileUrl: string
    sourceFileName: string
    extractedDate: string | null
    notes: string
    extraction?: Record<string, unknown>
  }
) {
  const { data } = await session.supabase
    .from('attendance_register_imports')
    .insert({
      ecd_id: session.ecdId,
      uploaded_by: session.user.id,
      source_file_path: input.sourceFilePath,
      source_file_url: input.sourceFileUrl,
      source_file_name: input.sourceFileName,
      extraction: input.extraction ?? {},
      extracted_names: [],
      extracted_date: input.extractedDate,
      status: 'failed',
      notes: input.notes,
    })
    .select(registerImportSelectFields)
    .maybeSingle()

  return data ? serializeImportRow(data as Record<string, unknown>) : undefined
}

async function upsertLegacyAttendance(
  session: EcdPortalSession,
  input: {
    childId: string
    attendanceDate: string
    status: AttendanceRecordStatus
    notes: string | null
  }
) {
  const { data: existingAttendance, error: existingAttendanceError } = await session.supabase
    .from('attendance')
    .select('id')
    .eq('ecd_id', session.ecdId)
    .eq('child_id', input.childId)
    .eq('date', input.attendanceDate)
    .maybeSingle()

  if (existingAttendanceError) {
    return {
      success: false,
      message: existingAttendanceError.message || 'Failed to inspect the live attendance log.',
      attendanceId: null,
    }
  }

  const checkedInAt = new Date().toISOString()
  const shouldCheckIn = input.status === 'present' || input.status === 'late'
  const legacyNotes = buildLegacyAttendanceNotes({
    notes: input.notes,
    status: input.status,
  })

  if (existingAttendance?.id) {
    const updatePayload: {
      checked_in: boolean
      checked_in_at: string | null
      checked_in_by: string | null
      picked_up?: boolean
      picked_up_at?: string | null
      pickup_code_id?: null
      notes: string | null
    } = {
      checked_in: shouldCheckIn,
      checked_in_at: shouldCheckIn ? checkedInAt : null,
      checked_in_by: shouldCheckIn ? session.user.id : null,
      notes: legacyNotes,
    }

    if (!shouldCheckIn) {
      updatePayload.picked_up = false
      updatePayload.picked_up_at = null
      updatePayload.pickup_code_id = null
    }

    const { data: updatedAttendance, error: updateAttendanceError } = await session.supabase
      .from('attendance')
      .update(updatePayload)
      .eq('id', existingAttendance.id)
      .select('id')
      .single()

    if (updateAttendanceError || !updatedAttendance?.id) {
      return {
        success: false,
        message: updateAttendanceError?.message || 'Failed to update the live attendance log.',
        attendanceId: null,
      }
    }

    return {
      success: true,
      attendanceId: updatedAttendance.id,
    }
  }

  const { data: createdAttendance, error: createAttendanceError } = await session.supabase
    .from('attendance')
    .insert({
      ecd_id: session.ecdId,
      child_id: input.childId,
      date: input.attendanceDate,
      checked_in: shouldCheckIn,
      checked_in_at: shouldCheckIn ? checkedInAt : null,
      checked_in_by: shouldCheckIn ? session.user.id : null,
      picked_up: false,
      notes: legacyNotes,
    })
    .select('id')
    .single()

  if (createAttendanceError || !createdAttendance?.id) {
    return {
      success: false,
      message: createAttendanceError?.message || 'Failed to update the live attendance log.',
      attendanceId: null,
    }
  }

  return {
    success: true,
    attendanceId: createdAttendance.id,
  }
}

async function upsertAttendanceRecord(
  session: EcdPortalSession,
  input: {
    childId: string
    classId: string | null
    attendanceDate: string
    status: AttendanceRecordStatus
  }
) {
  const { error } = await session.supabase
    .from('attendance_records')
    .upsert(buildAttendanceRecordPayload(session, input), { onConflict: 'child_id,date' })

  if (error) {
    return {
      success: false,
      message: error.message || 'Failed to save to the attendance register.',
    }
  }

  return {
    success: true,
  }
}

export async function previewAttendanceCsvAction(formData: FormData): Promise<AttendanceCsvPreviewActionResult> {
  const session = await requireEcdPortalSession({ cached: false })

  const parsed = csvPreviewSchema.safeParse({
    attendance_date: String(formData.get('attendance_date') ?? '').trim(),
    notes: String(formData.get('notes') ?? '').trim(),
  })

  if (!parsed.success) {
    return { success: false, message: 'Invalid CSV preview request.' }
  }

  const fallbackDate = normalizeAttendanceImportDate(parsed.data.attendance_date)
  const fallbackHref = buildAttendanceBoardHref(fallbackDate)
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return {
      success: false,
      message: 'Select one CSV file before previewing it.',
      fallbackHref,
      guidance: dedupeGuidance([
        'Upload a CSV file with one attendance row per child.',
        ...ATTENDANCE_IMPORT_FALLBACK_STEPS,
      ]),
    }
  }

  const fileValidation = validateAttendanceCsvFile(file)
  if (!fileValidation.ok) {
    return {
      success: false,
      message: fileValidation.message,
      fallbackHref,
      guidance: dedupeGuidance([fileValidation.guidance, ...ATTENDANCE_IMPORT_FALLBACK_STEPS]),
    }
  }

  const csvText = await file.text()
  const preview = parseAttendanceCsvText({
    text: csvText,
    fallbackAttendanceDate: fallbackDate,
    fallbackNotes: parsed.data.notes?.trim() || null,
  })

  if (!preview.ok) {
    return {
      success: false,
      message: preview.message,
      fallbackHref,
      guidance: dedupeGuidance([
        preview.guidance,
        ...ATTENDANCE_CSV_GUIDANCE,
        ...ATTENDANCE_CSV_LIMITATIONS,
        ...ATTENDANCE_IMPORT_FALLBACK_STEPS,
      ]),
    }
  }

  const [
    { data: childrenData, error: childrenError },
    { data: classesData, error: classesError },
  ] = await Promise.all([
    session.supabase
      .from('children')
      .select('id,first_name,last_name,class_id')
      .eq('ecd_id', session.ecdId)
      .order('first_name', { ascending: true }),
    session.supabase
      .from('ecd_classes')
      .select('id,name')
      .eq('ecd_id', session.ecdId),
  ])

  if (childrenError || classesError) {
    return {
      success: false,
      message: childrenError?.message || classesError?.message || 'Failed to prepare the CSV preview.',
      fallbackHref,
      guidance: [...ATTENDANCE_IMPORT_FALLBACK_STEPS],
    }
  }

  const classNameById = new Map(
    ((classesData ?? []) as ClassMatchRow[]).map((row) => [row.id, row.name])
  )

  const childrenByName = new Map<string, ChildMatchOption[]>()
  for (const child of (childrenData ?? []) as ChildMatchRow[]) {
    const childName = displayChildName(child)
    const key = normalizeNameForMatch(childName)
    if (!key) continue
    const nextValue: ChildMatchOption = {
      id: child.id,
      name: childName,
      classId: child.class_id,
      className: child.class_id ? classNameById.get(child.class_id) ?? null : null,
    }
    childrenByName.set(key, [...(childrenByName.get(key) ?? []), nextValue])
  }

  const rows: AttendanceCsvPreviewRow[] = preview.rows.map((row) => {
    const match = findPreviewChildMatch(row, childrenByName)
    return {
      lineNumber: row.lineNumber,
      childName: row.childName,
      attendanceDate: row.attendanceDate ?? '',
      status: row.status,
      className: row.className,
      notes: row.notes,
      matchedChildId: match.matchedChildId,
      matchedChildName: match.matchedChildName,
      issues: match.issues,
    }
  })

  const readyCount = rows.filter((row) => row.matchedChildId && row.issues.length === 0).length
  const blockedCount = rows.length - readyCount

  return {
    success: true,
    message:
      blockedCount === 0
        ? `${readyCount} row${readyCount === 1 ? '' : 's'} are ready to import.`
        : `${readyCount} row${readyCount === 1 ? '' : 's'} are ready. ${blockedCount} need attention before you rely on them.`,
    fileName: file.name,
    headers: preview.headers,
    rows,
    warnings: preview.warnings,
    readyCount,
    blockedCount,
    fallbackHref: buildAttendanceBoardHref(rows.find((row) => row.attendanceDate)?.attendanceDate ?? fallbackDate),
    guidance: dedupeGuidance([
      ...ATTENDANCE_CSV_GUIDANCE,
      ...ATTENDANCE_CSV_LIMITATIONS,
      ...ATTENDANCE_IMPORT_FALLBACK_STEPS,
    ]),
  }
}

export async function importAttendanceCsvAction(formData: FormData): Promise<AttendanceCsvImportActionResult> {
  const session = await requireEcdPortalSession({ cached: false })
  let parsedRows: unknown = []

  try {
    parsedRows = JSON.parse(String(formData.get('rows') ?? '[]'))
  } catch {
    return { success: false, message: 'Invalid CSV import payload.' }
  }

  const parsed = csvImportSchema.safeParse({
    source_file_name: String(formData.get('source_file_name') ?? '').trim(),
    rows: parsedRows,
  })

  if (!parsed.success) {
    return { success: false, message: 'Invalid CSV import payload.' }
  }

  const readyRows = parsed.data.rows.filter((row) => row.matchedChildId && row.attendanceDate && row.issues.length === 0)
  const blockedCount = parsed.data.rows.length - readyRows.length
  const fallbackDate = readyRows[0]?.attendanceDate ?? new Date().toISOString().slice(0, 10)
  const attendanceHref = buildAttendanceBoardHref(fallbackDate)

  if (readyRows.length === 0) {
    return {
      success: false,
      message: 'No CSV rows are ready to import yet.',
      blockedCount,
      attendanceHref,
      warnings: [...ATTENDANCE_IMPORT_FALLBACK_STEPS],
    }
  }

  const childIds = Array.from(new Set(readyRows.map((row) => row.matchedChildId).filter(Boolean))) as string[]
  const { data: childMatches, error: childMatchError } = await session.supabase
    .from('children')
    .select('id,ecd_id,class_id,first_name,last_name')
    .eq('ecd_id', session.ecdId)
    .in('id', childIds)

  if (childMatchError) {
    return {
      success: false,
      message: childMatchError.message || 'Failed to validate the matched children before import.',
      blockedCount,
      attendanceHref,
    }
  }

  const childMap = new Map(
    ((childMatches ?? []) as Array<ChildMatchRow & { ecd_id: string }>).map((row) => [row.id, row])
  )

  if (childMap.size !== childIds.length) {
    return {
      success: false,
      message: 'One or more preview matches no longer belong to this centre. Preview the CSV again before importing.',
      blockedCount,
      attendanceHref,
    }
  }

  const upsertPayload = readyRows.map((row) => {
    const child = childMap.get(row.matchedChildId as string)
    return buildAttendanceRecordPayload(session, {
      childId: row.matchedChildId as string,
      classId: child?.class_id ? String(child.class_id) : null,
      attendanceDate: row.attendanceDate,
      status: row.status,
    })
  })

  const { error: attendanceRecordError } = await session.supabase
    .from('attendance_records')
    .upsert(upsertPayload, { onConflict: 'child_id,date' })

  if (attendanceRecordError) {
    return {
      success: false,
      message: attendanceRecordError.message || 'Failed to save the CSV rows to the attendance register.',
      blockedCount,
      attendanceHref,
    }
  }

  const legacyWarnings: string[] = []

  for (const row of readyRows) {
    const legacyAttendance = await upsertLegacyAttendance(session, {
      childId: row.matchedChildId as string,
      attendanceDate: row.attendanceDate,
      status: row.status,
      notes: row.notes ?? null,
    })

    if (!legacyAttendance.success) {
      legacyWarnings.push(`Line ${row.lineNumber}: ${legacyAttendance.message}`)
    }
  }

  revalidatePath('/ecd/ai-upload')
  revalidatePath('/ecd/attendance')

  return {
    success: true,
    message:
      legacyWarnings.length === 0
        ? `Imported ${readyRows.length} CSV row${readyRows.length === 1 ? '' : 's'} into the attendance register.`
        : `Imported ${readyRows.length} CSV row${readyRows.length === 1 ? '' : 's'} into the attendance register. Some older attendance mirrors need a quick check.`,
    importedCount: readyRows.length,
    blockedCount,
    attendanceHref,
    warnings: legacyWarnings.length > 0 ? legacyWarnings : undefined,
  }
}

export async function extractRegisterPhotoAction(formData: FormData): Promise<RegisterExtractionActionResult> {
  try {
    const session = await requireEcdPortalSession({ cached: false })
    if (!session.ecdId) return { success: false, message: 'ECD session not found.' }

    const parsed = extractSchema.safeParse({
      attendance_date: String(formData.get('attendance_date') ?? '').trim(),
      notes: String(formData.get('notes') ?? '').trim(),
    })

    if (!parsed.success) {
      return { success: false, message: 'Invalid extraction request.' }
    }

    const requestedDate = normalizeAttendanceImportDate(parsed.data.attendance_date)
    const fallbackHref = buildAttendanceBoardHref(requestedDate)

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return {
        success: false,
        message: 'Select one register page photo before extracting.',
        fallbackHref,
        guidance: [...ATTENDANCE_IMPORT_FALLBACK_STEPS],
      }
    }

    const fileValidation = validateAttendanceImportFile(file)
    if (!fileValidation.ok) {
      return {
        success: false,
        message: fileValidation.message,
        fallbackHref,
        guidance: dedupeGuidance([fileValidation.guidance, ...ATTENDANCE_IMPORT_FALLBACK_STEPS]),
      }
    }

    const upload = await uploadPhotoForAiExtraction({
      supabase: session.supabase,
      ecdId: session.ecdId,
      documentType: 'register',
      file,
      folder: 'attendance-registers',
    })

    if (!upload.success || !upload.path || !upload.publicUrl) {
      return {
        success: false,
        message: upload.message || 'Failed to upload register photo.',
        fallbackHref,
        guidance: [...ATTENDANCE_IMPORT_FALLBACK_STEPS],
      }
    }

    const ocrExtraction = await extractWithTesseract({
      file,
      documentType: 'register',
    })

    const extractedPayload = ocrExtraction.success ? ocrExtraction.extraction : null
    const names = extractedPayload ? parseExtractedNames(extractedPayload) : []

    const extractedDate =
      normalizeAttendanceImportDate(extractedPayload ? fieldAsString(extractedPayload, 'record_date') : undefined) ??
      requestedDate ??
      null

    if (!extractedPayload || names.length === 0) {
      const failureMessage = 'We could not find reliable child names on this page.'
      const failedRow = await createFailedRegisterImportRow(session, {
        sourceFilePath: upload.path,
        sourceFileUrl: upload.publicUrl,
        sourceFileName: file.name,
        extractedDate,
        notes: failureMessage,
        extraction: {
          summary: extractedPayload?.summary ?? null,
          fields: extractedPayload?.fields ?? {},
        },
      })

      revalidatePath('/ecd/ai-upload')
      return {
        success: false,
        message: failureMessage,
        item: failedRow,
        fallbackHref: buildAttendanceBoardHref(extractedDate),
        guidance: dedupeGuidance([
          'Retake the page in good light if you want to try again.',
          'Handwritten pages may need higher contrast and a tighter crop around names.',
          'If this register is urgent, switch to CSV or finish it in the attendance register instead.',
          ...ATTENDANCE_IMPORT_FALLBACK_STEPS,
        ]),
      }
    }

    const rowsPayload = names.map((name) => ({
      ecd_id: session.ecdId,
      uploaded_by: session.user.id,
      source_file_path: upload.path,
      source_file_url: upload.publicUrl,
      source_file_name: file.name,
      extraction: {
        summary: extractedPayload.summary ?? null,
        fields: extractedPayload.fields ?? {},
      },
      extracted_names: [name],
      extracted_date: extractedDate,
      selected_name: name,
      status: 'extracted' as const,
      notes: parsed.data.notes?.trim() || extractedPayload.summary || null,
    }))

    const { data: createdRows, error } = await session.supabase
      .from('attendance_register_imports')
      .insert(rowsPayload)
      .select(registerImportSelectFields)
      .order('created_at', { ascending: false })

    if (error || !createdRows || createdRows.length === 0) {
      return { success: false, message: error?.message || 'Failed to save extracted register data.' }
    }

    const serializedItems = (createdRows as Record<string, unknown>[]).map((row) => serializeImportRow(row))

    revalidatePath('/ecd/ai-upload')
    return {
      success: true,
      message: `Read 1 page. ${serializedItems.length} child name${serializedItems.length === 1 ? '' : 's'} need review before saving.`,
      items: serializedItems,
      item: serializedItems[0],
      fallbackHref: buildAttendanceBoardHref(extractedDate),
    }
  } catch {
    return {
      success: false,
      message: 'Extraction failed unexpectedly. Try again with a clearer image, or use CSV import for urgent attendance.',
      guidance: [...ATTENDANCE_IMPORT_FALLBACK_STEPS],
    }
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

  if (importRow.status === 'failed') {
    return {
      success: false,
      message: 'This page was not reliable enough to import. Use CSV or the attendance register instead.',
      attendanceHref: buildAttendanceBoardHref(importRow.extracted_date ? String(importRow.extracted_date) : null),
    }
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
    .select('id,class_id')
    .eq('id', childId)
    .eq('ecd_id', session.ecdId)
    .maybeSingle()

  if (childMatchError || !childMatch?.id) {
    return { success: false, message: 'Selected child is not linked to this centre.' }
  }

  const attendanceDate =
    normalizeAttendanceImportDate(parsed.data.attendance_date) ??
    (importRow.extracted_date ? String(importRow.extracted_date) : null) ??
    new Date().toISOString().slice(0, 10)
  const attendanceHref = buildAttendanceBoardHref(attendanceDate)
  const importNotes = parsed.data.notes?.trim() || importRow.notes || null

  const attendanceRecord = await upsertAttendanceRecord(session, {
    childId,
    classId: childMatch.class_id ? String(childMatch.class_id) : null,
    attendanceDate,
    status: 'present',
  })

  if (!attendanceRecord.success) {
    return {
      success: false,
      message: attendanceRecord.message || 'Failed to save to the attendance register.',
      attendanceHref,
    }
  }

  const legacyAttendance = await upsertLegacyAttendance(session, {
    childId,
    attendanceDate,
    status: 'present',
    notes: importNotes,
  })

  const { data: updatedImport, error: updateImportError } = await session.supabase
    .from('attendance_register_imports')
    .update({
      status: 'imported',
      selected_name: selectedName || null,
      imported_child_id: childId,
      imported_attendance_id: legacyAttendance.success ? legacyAttendance.attendanceId : null,
      notes: importNotes,
    })
    .eq('id', importRow.id)
    .eq('ecd_id', session.ecdId)
    .select(registerImportSelectFields)
    .single()

  if (updateImportError || !updatedImport) {
    return {
      success: false,
      message: updateImportError?.message || 'Attendance was saved, but the import card was not updated.',
      attendanceHref,
    }
  }

  revalidatePath('/ecd/ai-upload')
  revalidatePath('/ecd/attendance')
  return {
    success: true,
    message: legacyAttendance.success
      ? 'Attendance saved to the attendance register.'
      : 'Attendance saved to the attendance register. An older attendance log did not sync, so check the register view.',
    item: serializeImportRow(updatedImport as Record<string, unknown>),
    attendanceHref,
  }
}
