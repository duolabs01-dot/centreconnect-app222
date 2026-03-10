import 'server-only'
import nodemailer from 'nodemailer'

type SendSmtpMailInput = {
  to: string[]
  cc?: string[]
  subject: string
  text: string
  html?: string
}

type SendSmtpMailResult = {
  ok: boolean
  error?: string
  messageId?: string | null
}

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  fromHeader: string
}

function sanitizeHeaderValue(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function normalizeRecipients(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)))
}

function parseFromAddress(from: string): { headerValue: string } | null {
  const value = from.trim()
  if (!value) return null

  const angleMatch = value.match(/<\s*([^<>\s]+@[^<>\s]+)\s*>/)
  if (angleMatch?.[1]) {
    return {
      headerValue: sanitizeHeaderValue(value),
    }
  }

  const plain = value.replace(/^["']|["']$/g, '').trim()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(plain)) {
    return {
      headerValue: sanitizeHeaderValue(plain),
    }
  }

  return null
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM?.trim()
  const portRaw = process.env.SMTP_PORT?.trim()
  const secureRaw = process.env.SMTP_SECURE?.trim().toLowerCase()

  if (!host || !user || !pass || !from) return null

  const port = Number(portRaw || 465)
  if (!Number.isFinite(port) || port <= 0) return null

  const secure = secureRaw ? secureRaw === 'true' : port === 465
  const parsedFrom = parseFromAddress(from)
  if (!parsedFrom) return null

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromHeader: parsedFrom.headerValue,
  }
}

export async function sendSmtpMail(input: SendSmtpMailInput): Promise<SendSmtpMailResult> {
  const config = getSmtpConfig()
  if (!config) {
    return {
      ok: false,
      error:
        'Missing or invalid SMTP configuration (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM). SMTP_FROM must include a valid email.',
    }
  }

  const to = normalizeRecipients(input.to)
  const cc = normalizeRecipients(input.cc ?? [])

  if (to.length === 0 && cc.length === 0) {
    return { ok: false, error: 'No recipients provided.' }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      requireTLS: !config.secure,
      tls: {
        servername: config.host,
      },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 20000,
    })

    const info = await transporter.sendMail({
      from: config.fromHeader,
      to,
      cc: cc.length > 0 ? cc : undefined,
      subject: sanitizeHeaderValue(input.subject),
      text: input.text,
      html: input.html?.trim() || undefined,
    })

    return {
      ok: true,
      messageId: info.messageId ?? null,
    }
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || 'Unknown SMTP error',
    }
  }
}
