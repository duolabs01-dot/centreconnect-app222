import { buildAttendanceBoardHref, normalizeAttendanceImportDate } from '@/lib/attendance/imports'

export const ATTENDANCE_CSV_MAX_FILE_BYTES = 2_000_000
export const ATTENDANCE_CSV_MAX_FILE_MB = 2
export const ATTENDANCE_CSV_MAX_ROWS = 500
export const ATTENDANCE_CSV_SUPPORTED_EXTENSIONS = ['.csv'] as const
export const ATTENDANCE_CSV_TEMPLATE_HEADERS = ['child_name', 'date', 'status', 'class_name', 'notes'] as const

export const ATTENDANCE_CSV_GUIDANCE = [
  'Include one header row. Recommended columns: child_name, date, status, class_name, notes.',
  'Use one row per child per day.',
  'Status can be present, absent, sick, or late. Blank status defaults to present.',
  'If your file has no date column, choose one attendance date before previewing.',
] as const

export const ATTENDANCE_CSV_LIMITATIONS = [
  'This importer only matches children already in CentreConnect.',
  'Name matching is exact after spacing cleanup, so fix spelling before importing.',
  'Duplicate child names need a class_name column or manual register review.',
] as const

export const ATTENDANCE_CSV_STATUS_OPTIONS = ['present', 'absent', 'sick', 'late'] as const

export type AttendanceRecordStatus = (typeof ATTENDANCE_CSV_STATUS_OPTIONS)[number]

export type AttendanceCsvFileIssueCode = 'unsupported_file_type' | 'file_too_large' | 'empty_file'

export type AttendanceCsvFileValidationResult =
  | { ok: true }
  | {
      ok: false
      code: AttendanceCsvFileIssueCode
      message: string
      guidance: string
    }

type AttendanceCsvCanonicalColumn = 'child_name' | 'first_name' | 'last_name' | 'date' | 'status' | 'class_name' | 'notes'

export type ParsedAttendanceCsvRow = {
  lineNumber: number
  childName: string
  attendanceDate: string | null
  status: AttendanceRecordStatus
  className: string | null
  notes: string | null
  issues: string[]
}

export type ParsedAttendanceCsvResult =
  | {
      ok: true
      headers: string[]
      rows: ParsedAttendanceCsvRow[]
      warnings: string[]
    }
  | {
      ok: false
      message: string
      guidance: string
    }

const CSV_MIME_TYPES = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'])

const COLUMN_ALIASES: Record<AttendanceCsvCanonicalColumn, string[]> = {
  child_name: ['child_name', 'child', 'childname', 'name', 'full_name', 'learner_name', 'student_name'],
  first_name: ['first_name', 'firstname', 'first', 'given_name'],
  last_name: ['last_name', 'lastname', 'surname', 'family_name', 'last'],
  date: ['date', 'attendance_date', 'record_date', 'day'],
  status: ['status', 'attendance_status'],
  class_name: ['class', 'class_name', 'classroom', 'room'],
  notes: ['notes', 'note', 'comment', 'comments'],
}

const STATUS_ALIASES = new Map<string, AttendanceRecordStatus>([
  ['present', 'present'],
  ['p', 'present'],
  ['yes', 'present'],
  ['true', 'present'],
  ['1', 'present'],
  ['late', 'late'],
  ['l', 'late'],
  ['absent', 'absent'],
  ['a', 'absent'],
  ['no', 'absent'],
  ['false', 'absent'],
  ['0', 'absent'],
  ['sick', 'sick'],
  ['s', 'sick'],
])

function normalizeFileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.[^.]+$/)
  return match?.[0] ?? ''
}

function normalizeHeaderName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function normalizeCell(value: string | undefined) {
  return (value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeChildName(firstName: string, lastName: string) {
  return [firstName, lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

function parseCsvRows(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  const input = text.replace(/^\uFEFF/, '')

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      row.push(cell)
      cell = ''
      continue
    }

    if (char === '\r') {
      continue
    }

    if (char === '\n') {
      row.push(cell)
      if (row.some((entry) => entry.trim() !== '')) {
        rows.push(row)
      }
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  if (inQuotes) {
    return {
      ok: false as const,
      message: 'The CSV file has an open quote that never closes.',
    }
  }

  row.push(cell)
  if (row.some((entry) => entry.trim() !== '')) {
    rows.push(row)
  }

  return {
    ok: true as const,
    rows,
  }
}

function findHeaderIndex(headers: string[], column: AttendanceCsvCanonicalColumn) {
  const aliases = COLUMN_ALIASES[column]
  return headers.findIndex((header) => aliases.includes(header))
}

function normalizeStatus(rawValue: string) {
  const cleaned = normalizeCell(rawValue).toLowerCase()
  if (!cleaned) return 'present'
  return STATUS_ALIASES.get(cleaned) ?? null
}

export function normalizeNameForMatch(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function buildCsvStatusLabel(status: AttendanceRecordStatus) {
  if (status === 'late') return 'Late'
  if (status === 'absent') return 'Absent'
  if (status === 'sick') return 'Sick'
  return 'Present'
}

export function buildAttendanceCsvFallbackHref(rows: Array<{ attendanceDate: string }>) {
  const firstDate = rows.find((row: any) => row.attendanceDate)?.attendanceDate ?? null
  return buildAttendanceBoardHref(firstDate)
}

export function validateAttendanceCsvFile(file: File): AttendanceCsvFileValidationResult {
  const extension = normalizeFileExtension(file.name)
  const type = file.type.trim().toLowerCase()

  if (file.size === 0) {
    return {
      ok: false,
      code: 'empty_file',
      message: 'This CSV file is empty.',
      guidance: 'Export the sheet again after adding at least one attendance row.',
    }
  }

  if (file.size > ATTENDANCE_CSV_MAX_FILE_BYTES) {
    return {
      ok: false,
      code: 'file_too_large',
      message: `This CSV file is larger than ${ATTENDANCE_CSV_MAX_FILE_MB}MB.`,
      guidance: 'Split very large exports into smaller month or class files before importing.',
    }
  }

  if (extension === '.csv' || CSV_MIME_TYPES.has(type)) {
    return { ok: true }
  }

  return {
    ok: false,
    code: 'unsupported_file_type',
    message: 'Only CSV attendance files are supported here.',
    guidance: 'Export the sheet as CSV, or use the manual attendance register instead.',
  }
}

export function parseAttendanceCsvText(input: {
  text: string
  fallbackAttendanceDate?: string | null
  fallbackNotes?: string | null
}): ParsedAttendanceCsvResult {
  const parsed = parseCsvRows(input.text)
  if (!parsed.ok) {
    return {
      ok: false,
      message: parsed.message,
      guidance: 'Open the CSV in Excel or Google Sheets, then export it again as plain CSV.',
    }
  }

  if (parsed.rows.length < 2) {
    return {
      ok: false,
      message: 'Add at least one header row and one attendance row to the CSV file.',
      guidance: 'The first row should contain column names like child_name, date, and status.',
    }
  }

  if (parsed.rows.length - 1 > ATTENDANCE_CSV_MAX_ROWS) {
    return {
      ok: false,
      message: `This CSV has more than ${ATTENDANCE_CSV_MAX_ROWS} attendance rows.`,
      guidance: 'Split the import into smaller files by class or month before previewing it.',
    }
  }

  const headers = parsed.rows[0].map((value) => normalizeHeaderName(value))
  const rows = parsed.rows.slice(1)

  const childNameIndex = findHeaderIndex(headers, 'child_name')
  const firstNameIndex = findHeaderIndex(headers, 'first_name')
  const lastNameIndex = findHeaderIndex(headers, 'last_name')
  const dateIndex = findHeaderIndex(headers, 'date')
  const statusIndex = findHeaderIndex(headers, 'status')
  const classNameIndex = findHeaderIndex(headers, 'class_name')
  const notesIndex = findHeaderIndex(headers, 'notes')

  if (childNameIndex === -1 && firstNameIndex === -1) {
    return {
      ok: false,
      message: 'The CSV needs a child_name column, or first_name plus last_name columns.',
      guidance: `Try these headers: ${ATTENDANCE_CSV_TEMPLATE_HEADERS.join(', ')}.`,
    }
  }

  const fallbackAttendanceDate = normalizeAttendanceImportDate(input.fallbackAttendanceDate ?? null)
  const warnings: string[] = []
  const outputRows: ParsedAttendanceCsvRow[] = rows.map((cells, rowIndex) => {
    const lineNumber = rowIndex + 2
    const childName = normalizeCell(cells[childNameIndex])
    const firstName = normalizeCell(cells[firstNameIndex])
    const lastName = normalizeCell(cells[lastNameIndex])
    const normalizedChildName = childName || normalizeChildName(firstName, lastName)
    const rawDate = normalizeCell(cells[dateIndex])
    const rawStatus = normalizeCell(cells[statusIndex])
    const normalizedDate = normalizeAttendanceImportDate(rawDate) ?? fallbackAttendanceDate
    const normalizedStatus = normalizeStatus(rawStatus)
    const notes = normalizeCell(cells[notesIndex]) || normalizeCell(input.fallbackNotes ?? '') || null
    const className = normalizeCell(cells[classNameIndex]) || null
    const issues: string[] = []

    if (!normalizedChildName) {
      issues.push('Add a child name for this row.')
    }

    if (!normalizedDate) {
      issues.push('Add a valid attendance date in YYYY-MM-DD or DD/MM/YYYY format, or choose a date above.')
    }

    if (!normalizedStatus) {
      issues.push('Use one of these status values: present, absent, sick, or late.')
    }

    return {
      lineNumber,
      childName: normalizedChildName,
      attendanceDate: normalizedDate,
      status: normalizedStatus ?? 'present',
      className,
      notes,
      issues,
    }
  })

  if (dateIndex === -1 && fallbackAttendanceDate) {
    warnings.push(`Using ${fallbackAttendanceDate} for every row because the CSV does not have a date column.`)
  }

  if (statusIndex === -1) {
    warnings.push('Blank status values default to present.')
  }

  return {
    ok: true,
    headers,
    rows: outputRows,
    warnings,
  }
}
