import 'server-only'

function normalizePhone(raw: string | null | undefined) {
  const digits = String(raw ?? '').replace(/[^\d]/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) return `27${digits.slice(1)}`
  if (digits.startsWith('27')) return digits
  if (String(raw).trim().startsWith('+')) return String(raw).trim().replace(/[^\d]/g, '')
  return digits
}

export function normalizeWhatsappPhone(raw: string | null | undefined) {
  const normalized = normalizePhone(raw)
  return normalized ? `+${normalized}` : null
}

export function createWhatsappClickToChatLink(rawPhone: string | null | undefined, message: string) {
  const digits = normalizePhone(rawPhone)
  const text = message.trim()
  if (!digits || !text) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
