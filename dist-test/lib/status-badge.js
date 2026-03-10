"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toStatusBadgeStatus = toStatusBadgeStatus;
exports.formatStatusBadgeLabel = formatStatusBadgeLabel;
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
]);
const NEGATIVE_STATUSES = new Set([
    'cancelled',
    'canceled',
    'declined',
    'expired',
    'failed',
    'overdue',
    'rejected',
]);
const DRAFT_STATUSES = new Set([
    'draft',
    'new',
    'created',
]);
function normalizeStatus(status) {
    return String(status !== null && status !== void 0 ? status : '').trim().toLowerCase();
}
function toStatusBadgeStatus(status) {
    const normalized = normalizeStatus(status);
    if (!normalized)
        return 'draft';
    if (normalized === 'paid' || POSITIVE_STATUSES.has(normalized))
        return 'paid';
    if (normalized === 'overdue' || NEGATIVE_STATUSES.has(normalized))
        return 'overdue';
    if (normalized === 'draft' || DRAFT_STATUSES.has(normalized))
        return 'draft';
    return 'pending';
}
function formatStatusBadgeLabel(status) {
    const normalized = normalizeStatus(status);
    if (!normalized)
        return 'Draft';
    return normalized
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
