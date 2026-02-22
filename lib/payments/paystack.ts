import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'

type PaystackInitializeResponse = {
  status: boolean
  message: string
  data?: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

type InitializeInvoicePaymentInput = {
  invoiceId: string
  invoiceNumber: string
  amountZar: number
  customerEmail: string
  metadata?: Record<string, unknown>
}

function getPaystackSecretKey() {
  const value = process.env.PAYSTACK_SECRET_KEY?.trim()
  if (!value) {
    throw new Error('Missing PAYSTACK_SECRET_KEY')
  }
  return value
}

function getWebhookSecret() {
  return process.env.PAYSTACK_WEBHOOK_SECRET?.trim() || getPaystackSecretKey()
}

function buildCallbackUrl(invoiceId: string) {
  const explicit = process.env.PAYSTACK_CALLBACK_URL?.trim()
  if (explicit) return explicit
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3010'
  return `${appUrl}/ecd/billing?invoice=${invoiceId}`
}

function generateReference(invoiceId: string) {
  const compact = invoiceId.replace(/-/g, '').slice(0, 12)
  return `cc_inv_${compact}_${Date.now()}`
}

function toKobo(amountZar: number) {
  return Math.max(0, Math.round(amountZar * 100))
}

export async function initializePaystackInvoicePayment(input: InitializeInvoicePaymentInput) {
  const secretKey = getPaystackSecretKey()
  const reference = generateReference(input.invoiceId)
  const payload = {
    email: input.customerEmail,
    amount: toKobo(input.amountZar),
    currency: 'ZAR',
    reference,
    callback_url: buildCallbackUrl(input.invoiceId),
    metadata: {
      invoice_id: input.invoiceId,
      invoice_number: input.invoiceNumber,
      ...input.metadata,
    },
  }

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const json = (await response.json().catch(() => null)) as PaystackInitializeResponse | null
  if (!response.ok || !json?.status || !json.data?.authorization_url) {
    const message = json?.message || `Paystack initialize failed with status ${response.status}`
    throw new Error(message)
  }

  return {
    provider: 'paystack' as const,
    reference: json.data.reference || reference,
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
    currency: 'ZAR' as const,
  }
}

export function verifyPaystackSignature(rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader) return false
  const secret = getWebhookSecret()
  const computed = createHmac('sha512', secret).update(rawBody).digest('hex')
  const expected = Buffer.from(computed, 'hex')
  const received = Buffer.from(signatureHeader, 'hex')
  if (expected.length !== received.length) return false
  return timingSafeEqual(expected, received)
}
