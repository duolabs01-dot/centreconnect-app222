import 'server-only'

export type WhatsappSendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string }

function normalizePhone(raw: string | null | undefined) {
  const digits = String(raw ?? '').replace(/[^\d]/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) return `+27${digits.slice(1)}`
  if (digits.startsWith('27')) return `+${digits}`
  if (String(raw).trim().startsWith('+')) return String(raw).trim()
  return `+${digits}`
}

function toWhatsappAddress(phone: string) {
  return phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`
}

export function normalizeWhatsappPhone(raw: string | null | undefined) {
  return normalizePhone(raw)
}

export async function sendWhatsappTemplateMessage(
  toRaw: string | null | undefined,
  body: string
): Promise<WhatsappSendResult> {
  const to = normalizePhone(toRaw)
  if (!to) return { ok: false, error: 'Owner WhatsApp number is missing or invalid.' }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? ''
  const twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? ''
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() ?? ''
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM?.trim() ?? ''

  if (!twilioSid || !twilioToken) {
    return { ok: false, error: 'Twilio credentials are not configured.' }
  }

  const params = new URLSearchParams({
    To: toWhatsappAddress(to),
    Body: body,
  })

  if (messagingServiceSid) {
    params.set('MessagingServiceSid', messagingServiceSid)
  } else if (whatsappFrom) {
    params.set('From', toWhatsappAddress(whatsappFrom))
  } else {
    return { ok: false, error: 'Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_WHATSAPP_FROM.' }
  }

  const authHeader = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  )

  const payload = (await response.json().catch(() => ({}))) as { sid?: string; message?: string }
  if (!response.ok) {
    return { ok: false, error: payload.message ?? `Twilio responded with ${response.status}` }
  }

  return { ok: true, id: payload.sid ?? null }
}
