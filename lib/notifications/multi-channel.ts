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

type EmailQueueInsert = {
  recipient: string
  subject: string
  body: string
  status?: 'pending' | 'sent' | 'failed'
}

type ParentMultiChannelInsert = ParentNotificationInsert & {
  parent_phone?: string | null
}

type EcdMultiChannelInsert = EcdNotificationInsert & {
  email_recipient?: string | null
  email_subject?: string | null
  email_body?: string | null
}

type MultiChannelResult = {
  ok: boolean
  inAppSent: boolean
  emailQueued: boolean
  whatsappHref: string | null
  error: string | null
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

export async function queueEmailNotification(
  db: { from: (table: 'email_queue') => any },
  payload: EmailQueueInsert
) {
  const recipient = payload.recipient.trim()
  const subject = payload.subject.trim()
  const body = payload.body.trim()
  if (!recipient || !subject || !body) {
    return { ok: false, error: 'Missing recipient, subject, or body.' }
  }

  const { error } = await db.from('email_queue').insert({
    recipient,
    subject,
    body,
    status: payload.status ?? 'pending',
  })
  return { ok: !error, error: error?.message ?? null }
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

export async function sendParentInAppAndWhatsappNotification(
  db: { from: (table: 'parent_notifications') => any },
  payload: ParentMultiChannelInsert
): Promise<MultiChannelResult> {
  const inAppResult = await sendParentInAppNotification(db, {
    parent_id: payload.parent_id,
    ecd_id: payload.ecd_id,
    application_id: payload.application_id,
    template_key: payload.template_key,
    title: payload.title,
    message: payload.message,
    is_read: payload.is_read ?? false,
  })

  return {
    ok: inAppResult.ok,
    inAppSent: inAppResult.ok,
    emailQueued: false,
    whatsappHref: toWhatsappHref(payload.parent_phone, payload.message),
    error: inAppResult.error,
  }
}

export async function sendEcdInAppAndEmailNotification(
  db: {
    from: (table: 'ecd_notifications' | 'email_queue') => any
  },
  payload: EcdMultiChannelInsert
): Promise<MultiChannelResult> {
  const inAppResult = await sendEcdInAppNotification(db as any, {
    ecd_id: payload.ecd_id,
    application_id: payload.application_id,
    title: payload.title,
    message: payload.message,
    metadata: payload.metadata,
    is_read: payload.is_read ?? false,
  })

  let emailQueued = false
  if (payload.email_recipient && payload.email_subject && payload.email_body) {
    const emailResult = await queueEmailNotification(db as any, {
      recipient: payload.email_recipient,
      subject: payload.email_subject,
      body: payload.email_body,
      status: 'pending',
    })
    emailQueued = emailResult.ok
    if (!emailResult.ok) {
      return {
        ok: false,
        inAppSent: inAppResult.ok,
        emailQueued: false,
        whatsappHref: null,
        error: emailResult.error,
      }
    }
  }

  return {
    ok: inAppResult.ok,
    inAppSent: inAppResult.ok,
    emailQueued,
    whatsappHref: null,
    error: inAppResult.error,
  }
}
