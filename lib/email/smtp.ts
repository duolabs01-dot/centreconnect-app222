import 'server-only'
import net from 'node:net'
import tls from 'node:tls'

type SendSmtpMailInput = {
  to: string[]
  cc?: string[]
  subject: string
  text: string
}

type SendSmtpMailResult = {
  ok: boolean
  error?: string
}

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  fromHeader: string
  fromEnvelope: string
}

class SmtpClient {
  private socket: net.Socket | tls.TLSSocket
  private buffer = ''
  private lines: string[] = []
  private waiters: Array<(line: string) => void> = []

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket
    this.socket.setEncoding('utf8')
    this.socket.on('data', (chunk: string) => {
      this.buffer += chunk
      let idx = this.buffer.indexOf('\n')
      while (idx !== -1) {
        const raw = this.buffer.slice(0, idx).replace(/\r$/, '')
        this.buffer = this.buffer.slice(idx + 1)
        if (raw.length > 0) {
          const waiter = this.waiters.shift()
          if (waiter) waiter(raw)
          else this.lines.push(raw)
        }
        idx = this.buffer.indexOf('\n')
      }
    })
  }

  private async nextLine(timeoutMs = 15000): Promise<string> {
    if (this.lines.length > 0) {
      return this.lines.shift() as string
    }

    return await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.waiters = this.waiters.filter((item) => item !== onLine)
        reject(new Error('SMTP response timeout'))
      }, timeoutMs)

      const onLine = (line: string) => {
        clearTimeout(timeout)
        resolve(line)
      }

      this.waiters.push(onLine)
    })
  }

  async expect(expectedCodes: number | number[]) {
    const expectedList = Array.isArray(expectedCodes) ? expectedCodes : [expectedCodes]
    const first = await this.nextLine()
    const status = Number(first.slice(0, 3))
    const lines = [first]
    const prefix = first.slice(0, 3)

    let isMultiline = first[3] === '-'
    while (isMultiline) {
      const next = await this.nextLine()
      lines.push(next)
      isMultiline = next.startsWith(`${prefix}-`)
    }

    if (!expectedList.includes(status)) {
      throw new Error(`SMTP ${status}: ${lines.join(' | ')}`)
    }
  }

  writeLine(line: string) {
    this.socket.write(`${line}\r\n`)
  }

  writeRaw(data: string) {
    this.socket.write(data)
  }

  end() {
    this.socket.end()
  }
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
    fromEnvelope: parsedFrom.envelopeValue,
  }
}

function sanitizeHeaderValue(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function normalizeRecipients(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)))
}

function parseFromAddress(from: string): { headerValue: string; envelopeValue: string } | null {
  const value = from.trim()
  if (!value) return null

  const angleMatch = value.match(/<\s*([^<>\s]+@[^<>\s]+)\s*>/)
  if (angleMatch?.[1]) {
    return {
      headerValue: sanitizeHeaderValue(value),
      envelopeValue: angleMatch[1].trim(),
    }
  }

  const plain = value.replace(/^["']|["']$/g, '').trim()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(plain)) {
    return {
      headerValue: sanitizeHeaderValue(plain),
      envelopeValue: plain,
    }
  }

  return null
}

function buildMessage(input: SendSmtpMailInput, fromHeader: string) {
  const to = normalizeRecipients(input.to)
  const cc = normalizeRecipients(input.cc ?? [])
  const allRecipients = normalizeRecipients([...to, ...cc])
  const subject = sanitizeHeaderValue(input.subject)
  const body = input.text
    .replace(/\r?\n/g, '\r\n')
    .split('\r\n')
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n')

  const headers = [
    `From: ${fromHeader}`,
    `To: ${to.join(', ')}`,
    ...(cc.length > 0 ? [`Cc: ${cc.join(', ')}`] : []),
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    `Date: ${new Date().toUTCString()}`,
  ].join('\r\n')

  return {
    allRecipients,
    raw: `${headers}\r\n\r\n${body}\r\n.\r\n`,
  }
}

async function connectClient(config: SmtpConfig): Promise<SmtpClient> {
  return await new Promise<SmtpClient>((resolve, reject) => {
    const onError = (error: Error) => reject(error)
    const options = {
      host: config.host,
      port: config.port,
      servername: config.host,
    }

    const socket = config.secure ? tls.connect(options, onConnected) : net.connect(options, onConnected)

    socket.once('error', onError)

    function onConnected() {
      socket.off('error', onError)
      socket.setTimeout(20000, () => socket.destroy(new Error('SMTP socket timeout')))
      resolve(new SmtpClient(socket))
    }
  })
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

  const message = buildMessage(input, config.fromHeader)
  if (message.allRecipients.length === 0) {
    return { ok: false, error: 'No recipients provided.' }
  }

  let client: SmtpClient | null = null
  try {
    client = await connectClient(config)
    await client.expect(220)

    client.writeLine(`EHLO ${config.host}`)
    await client.expect(250)

    client.writeLine('AUTH LOGIN')
    await client.expect(334)
    client.writeLine(Buffer.from(config.user).toString('base64'))
    await client.expect(334)
    client.writeLine(Buffer.from(config.pass).toString('base64'))
    await client.expect(235)

    client.writeLine(`MAIL FROM:<${config.fromEnvelope}>`)
    await client.expect(250)

    for (const recipient of message.allRecipients) {
      client.writeLine(`RCPT TO:<${recipient}>`)
      await client.expect([250, 251])
    }

    client.writeLine('DATA')
    await client.expect(354)
    client.writeRaw(message.raw)
    await client.expect(250)

    client.writeLine('QUIT')
    await client.expect(221)
    client.end()

    return { ok: true }
  } catch (error: any) {
    if (client) client.end()
    return { ok: false, error: error?.message || 'Unknown SMTP error' }
  }
}
