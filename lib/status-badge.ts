export type StatusBadgeStatus = 'draft' | 'waiting' | 'active' | 'complete' | 'issue'

const COMPLETE_STATUSES = new Set([
  'approved',
  'accepted',
  'completed',
  'complete',
  'paid',
  'resolved',
  'success',
  'verified',
])

const ACTIVE_STATUSES = new Set([
  'active',
  'enrolled',
  'live',
  'open',
  'ready',
])

const ISSUE_STATUSES = new Set([
  'action_needed',
  'blocked',
  'cancelled',
  'canceled',
  'declined',
  'error',
  'expired',
  'failed',
  'invalid',
  'issue',
  'needs_action',
  'overdue',
  'rejected',
])

const DRAFT_STATUSES = new Set([
  'draft',
  'new',
  'created',
])

const WAITING_STATUSES = new Set([
  'awaiting_action',
  'in_review',
  'pending',
  'processing',
  'queued',
  'requested',
  'scheduled',
  'sent',
  'submitted',
  'under_review',
  'waiting',
])

function normalizeStatus(status: string | null | undefined): string {
  return String(status ?? '').trim().toLowerCase()
}

export function toStatusBadgeStatus(status: string | null | undefined): StatusBadgeStatus {
  const normalized = normalizeStatus(status)

  if (!normalized) return 'draft'
  if (COMPLETE_STATUSES.has(normalized)) return 'complete'
  if (ACTIVE_STATUSES.has(normalized)) return 'active'
  if (ISSUE_STATUSES.has(normalized)) return 'issue'
  if (DRAFT_STATUSES.has(normalized)) return 'draft'
  if (WAITING_STATUSES.has(normalized)) return 'waiting'
  return 'waiting'
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
