const ENROLLED_CHILD_STATUSES = new Set(['active', 'enrolled'])
const PARENT_PENDING_APPLICATION_STATUSES = new Set([
  'submitted',
  'in_review',
  'partial',
  'draft',
  'awaiting_documents',
  'offer_made',
  'offer_sent',
  'offer_pending',
  'approved',
  'accepted',
])

export type ParentHomeState = 'discover' | 'pending' | 'enrolled'

export type ParentEntryState = {
  hasChildren: boolean
  hasPendingApplications: boolean
  hasEnrolledChild: boolean
}

function normalizeStatus(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase()
}

export function hasEnrolledChildStatus(status: string | null | undefined) {
  return ENROLLED_CHILD_STATUSES.has(normalizeStatus(status))
}

export function isEnrolledApplicationStatus(status: string | null | undefined) {
  return normalizeStatus(status) === 'enrolled'
}

export function hasPendingParentApplicationStatus(status: string | null | undefined) {
  return PARENT_PENDING_APPLICATION_STATUSES.has(normalizeStatus(status))
}

export function deriveParentHomeState(input: {
  hasPendingApplications: boolean
  hasEnrolledChild: boolean
}) {
  if (input.hasEnrolledChild) return 'enrolled' satisfies ParentHomeState
  if (input.hasPendingApplications) return 'pending' satisfies ParentHomeState
  return 'discover' satisfies ParentHomeState
}

export function deriveParentEntryPath(input: ParentEntryState) {
  if (input.hasEnrolledChild) return '/parent/dashboard'
  if (input.hasPendingApplications) return '/parent/applications'
  if (input.hasChildren) return '/parent/discover'
  return '/parent/children/new'
}

