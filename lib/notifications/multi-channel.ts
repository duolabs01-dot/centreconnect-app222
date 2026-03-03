type ParentNotificationInsert = {
  parent_id: string
  ecd_id: string
  application_id?: string | null
  template_key?: string | null
  title: string
  message: string
  is_read?: boolean
}

type EcdNotificationInsert = {
  ecd_id: string
  application_id?: string | null
  title: string
  message: string
  metadata?: Record<string, unknown>
  is_read?: boolean
}

function normalizePhone(rawPhone: string | null | undefined) {
  const digits = String(rawPhone ?? '').replace(/[^\d]/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) return `27${digits.slice(1)}`
  if (digits.startsWith('27')) return digits
  return digits
}

export function toWhatsappHref(rawPhone: string | null | undefined, message: string) {
  const text = String(message ?? '').trim()
  if (!text) return null
  const number = normalizePhone(rawPhone)
  if (!number) return `https://wa.me/?text=${encodeURIComponent(text)}`
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

export async function sendParentInAppNotification(
  db: { from: (table: 'parent_notifications') => any },
  payload: ParentNotificationInsert
) {
  const { error } = await db.from('parent_notifications').insert({
    ...payload,
    is_read: payload.is_read ?? false,
  })
  return { ok: !error, error: error?.message ?? null }
}

export async function sendEcdInAppNotification(
  db: { from: (table: 'ecd_notifications') => any },
  payload: EcdNotificationInsert
) {
  const { error } = await db.from('ecd_notifications').insert({
    ...payload,
    metadata: payload.metadata ?? {},
    is_read: payload.is_read ?? false,
  })
  return { ok: !error, error: error?.message ?? null }
}
