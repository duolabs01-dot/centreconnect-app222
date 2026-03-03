export type RejectionReasonCode =
  | 'age_not_supported'
  | 'no_space_available'
  | 'outside_service_area'
  | 'missing_critical_documents'
  | 'fees_not_accepted'
  | 'other'

export const REJECTION_REASON_OPTIONS: Array<{
  code: RejectionReasonCode
  label: string
  parentMessage: string
}> = [
  {
    code: 'age_not_supported',
    label: 'Age group not supported',
    parentMessage: 'This crèche cannot currently place this age group.',
  },
  {
    code: 'no_space_available',
    label: 'No space available',
    parentMessage: 'There is currently no open space for the requested intake period.',
  },
  {
    code: 'outside_service_area',
    label: 'Outside service area',
    parentMessage: 'This crèche currently serves a different catchment area.',
  },
  {
    code: 'missing_critical_documents',
    label: 'Critical documents missing',
    parentMessage: 'Required documents were still missing for final admissions review.',
  },
  {
    code: 'fees_not_accepted',
    label: 'Fees not accepted',
    parentMessage: 'The fee terms were not accepted for this placement.',
  },
  {
    code: 'other',
    label: 'Other',
    parentMessage: 'A centre-specific admissions reason was provided.',
  },
]

const optionByCode = new Map(REJECTION_REASON_OPTIONS.map((item) => [item.code, item]))

export function getRejectionReasonLabel(code: string | null | undefined) {
  if (!code) return 'Not provided'
  return optionByCode.get(code as RejectionReasonCode)?.label ?? code.replaceAll('_', ' ')
}

export function getRejectionReasonMessage(code: string | null | undefined) {
  if (!code) return 'No reason was supplied by the centre.'
  return optionByCode.get(code as RejectionReasonCode)?.parentMessage ?? 'No reason was supplied by the centre.'
}

export function buildParentFacingRejectionReason({
  code,
  note,
}: {
  code: string | null | undefined
  note?: string | null
}) {
  const base = getRejectionReasonMessage(code)
  const extra = note?.trim()
  if (!extra) return base
  return `${base} Note: ${extra}`
}

