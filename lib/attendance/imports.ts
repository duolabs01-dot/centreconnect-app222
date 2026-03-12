export const ATTENDANCE_IMPORT_MAX_FILE_BYTES = 10_000_000
export const ATTENDANCE_IMPORT_MAX_FILE_MB = 10

export const ATTENDANCE_IMPORT_SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'] as const

export const ATTENDANCE_IMPORT_METHODS = [
  {
    id: 'register-photo',
    label: 'Register photo import',
    availability: 'beta',
    description: 'Best for one clear photo of one paper register page at a time.',
  },
  {
    id: 'csv',
    label: 'CSV attendance import',
    availability: 'live',
    description: 'Best for typed attendance sheets where each row already represents one child attendance entry.',
  },
] as const

export const ATTENDANCE_IMPORT_GUIDANCE = [
  'Use one clear photo for one register page at a time.',
  'Crop tightly to the page and avoid fingers, shadows, blur, and glare.',
  'Printed names or neat handwriting work better than folded or faint pages.',
] as const

export const ATTENDANCE_IMPORT_LIMITATIONS = [
  'PDF files are not supported in this beta.',
  'Multi-page documents are not supported in this beta.',
  'Always review names and dates before saving attendance.',
] as const

export const ATTENDANCE_IMPORT_FALLBACK_STEPS = [
  'If the page is urgent, open the attendance register and mark the class manually.',
  'If the names are already typed, switch to CSV attendance import instead of retrying the photo.',
  'If the photo is hard to read, retake it in good light and upload that page again.',
] as const

export type AttendanceImportFileIssueCode = 'unsupported_pdf' | 'unsupported_file_type' | 'file_too_large'

export type AttendanceImportFileValidationResult =
  | { ok: true }
  | {
      ok: false
      code: AttendanceImportFileIssueCode
      message: string
      guidance: string
    }

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function normalizeFileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.[^.]+$/)
  return match?.[0] ?? ''
}

export function normalizeAttendanceImportDate(value: string | null | undefined) {
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

export function buildAttendanceBoardHref(date: string | null | undefined) {
  const normalizedDate = normalizeAttendanceImportDate(date)
  if (!normalizedDate) return '/ecd/attendance'

  const [year, month] = normalizedDate.split('-')
  const params = new URLSearchParams({
    month: String(Number(month)),
    year,
  })
  return `/ecd/attendance?${params.toString()}`
}

export function buildAttendanceBoardLabel(date: string | null | undefined) {
  const normalizedDate = normalizeAttendanceImportDate(date)
  if (!normalizedDate) return 'Open attendance register'

  const [year, month] = normalizedDate.split('-')
  const monthIndex = Number(month) - 1
  const monthLabel = MONTH_LABELS[monthIndex] ?? 'selected'
  return `Open ${monthLabel} ${year} attendance register`
}

export function validateAttendanceImportFile(file: File): AttendanceImportFileValidationResult {
  const type = file.type.trim().toLowerCase()
  const extension = normalizeFileExtension(file.name)

  if (file.size > ATTENDANCE_IMPORT_MAX_FILE_BYTES) {
    return {
      ok: false,
      code: 'file_too_large',
      message: `This file is larger than ${ATTENDANCE_IMPORT_MAX_FILE_MB}MB.`,
      guidance: 'Use a smaller image, or take a new photo of one page only.',
    }
  }

  if (type === 'application/pdf' || extension === '.pdf') {
    return {
      ok: false,
      code: 'unsupported_pdf',
      message: 'PDF attendance registers are not supported in this beta.',
      guidance: 'Take one clear photo of each page instead, or continue in the attendance register.',
    }
  }

  if (type.startsWith('image/')) {
    return { ok: true }
  }

  if (ATTENDANCE_IMPORT_SUPPORTED_EXTENSIONS.includes(extension as (typeof ATTENDANCE_IMPORT_SUPPORTED_EXTENSIONS)[number])) {
    return { ok: true }
  }

  return {
    ok: false,
    code: 'unsupported_file_type',
    message: 'This file type is not supported for register import.',
    guidance: 'Upload a clear page photo instead, or use the attendance register manually.',
  }
}
