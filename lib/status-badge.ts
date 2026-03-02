export type StatusBadgeStatus = 'paid' | 'pending' | 'overdue' | 'draft'

const POSITIVE_STATUSES = new Set([
  'approved',
  'accepted',
  'active',
  'completed',
  'complete',
  'enrolled',
  'paid',
  'resolved',
  'success',
])

const NEGATIVE_STATUSES = new Set([
  'cancelled',
  'canceled',
  'declined',
  'expired',
  'failed',
  'overdue',
  'rejected',
])

const DRAFT_STATUSES = new Set([
  'draft',
  'new',
  'created',
])

function normalizeStatus(status: string | null | undefined): string {
  return String(status ?? '').trim().toLowerCase()
}

export function toStatusBadgeStatus(status: string | null | undefined): StatusBadgeStatus {
  const normalized = normalizeStatus(status)

  if (!normalized) return 'draft'
  if (normalized === 'paid' || POSITIVE_STATUSES.has(normalized)) return 'paid'
  if (normalized === 'overdue' || NEGATIVE_STATUSES.has(normalized)) return 'overdue'
  if (normalized === 'draft' || DRAFT_STATUSES.has(normalized)) return 'draft'
  return 'pending'
}

export function formatStatusBadgeLabel(status: string | null | undefined): string {
  const normalized = normalizeStatus(status)
  if (!normalized) return 'Draft'

  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
