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

type InitializePaymentMethodUpdateInput = {
  ecdId: string
  customerEmail: string
  initiatedByUserId?: string | null
  amountZar?: number
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

function buildPaymentMethodCallbackUrl() {
  const explicit = process.env.PAYSTACK_PAYMENT_METHOD_CALLBACK_URL?.trim()
  if (explicit) return explicit
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3010'
  return `${appUrl}/ecd/billing?payment_method_update=1`
}

function generateReference(prefix: string, seed: string) {
  const compact = seed.replace(/-/g, '').slice(0, 12).toLowerCase()
  return `${prefix}_${compact}_${Date.now()}`
}

function toKobo(amountZar: number) {
  return Math.max(0, Math.round(amountZar * 100))
}

function parseAmountOverride(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

async function initializePaystackTransaction(input: {
  customerEmail: string
  amountZar: number
  reference: string
  callbackUrl: string
  metadata: Record<string, unknown>
}) {
  const secretKey = getPaystackSecretKey()
  const payload = {
    email: input.customerEmail.trim(),
    amount: toKobo(input.amountZar),
    currency: 'ZAR',
    reference: input.reference,
    callback_url: input.callbackUrl,
    metadata: input.metadata,
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
    reference: json.data.reference || input.reference,
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
    currency: 'ZAR' as const,
  }
}

export async function initializePaystackInvoicePayment(input: InitializeInvoicePaymentInput) {
  const reference = generateReference('cc_inv', input.invoiceId)
  return initializePaystackTransaction({
    customerEmail: input.customerEmail,
    amountZar: input.amountZar,
    reference,
    callbackUrl: buildCallbackUrl(input.invoiceId),
    metadata: {
      invoice_id: input.invoiceId,
      invoice_number: input.invoiceNumber,
      ...input.metadata,
    },
  })
}

export async function initializePaystackPaymentMethodUpdate(input: InitializePaymentMethodUpdateInput) {
  const defaultAmount = parseAmountOverride(process.env.PAYSTACK_PAYMENT_METHOD_UPDATE_AMOUNT_ZAR, 5)
  const amount = Number.isFinite(Number(input.amountZar)) && Number(input.amountZar) > 0 ? Number(input.amountZar) : defaultAmount
  const reference = generateReference('cc_pm', input.ecdId)

  return initializePaystackTransaction({
    customerEmail: input.customerEmail,
    amountZar: amount,
    reference,
    callbackUrl: buildPaymentMethodCallbackUrl(),
    metadata: {
      payment_method_update: true,
      ecd_id: input.ecdId,
      initiated_by_user_id: input.initiatedByUserId ?? null,
      ...input.metadata,
    },
  })
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
