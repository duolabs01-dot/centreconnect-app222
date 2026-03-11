"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSmtpMail = sendSmtpMail;
require("server-only");
const node_crypto_1 = require("node:crypto");
const node_net_1 = __importDefault(require("node:net"));
const node_tls_1 = __importDefault(require("node:tls"));
class SmtpClient {
    constructor(socket) {
        this.buffer = '';
        this.lines = [];
        this.waiters = [];
        this.socket = socket;
        this.socket.setEncoding('utf8');
        this.socket.on('data', (chunk) => {
            this.buffer += chunk;
            let idx = this.buffer.indexOf('\n');
            while (idx !== -1) {
                const raw = this.buffer.slice(0, idx).replace(/\r$/, '');
                this.buffer = this.buffer.slice(idx + 1);
                if (raw.length > 0) {
                    const waiter = this.waiters.shift();
                    if (waiter)
                        waiter(raw);
                    else
                        this.lines.push(raw);
                }
                idx = this.buffer.indexOf('\n');
            }
        });
    }
    async nextLine(timeoutMs = 15000) {
        if (this.lines.length > 0) {
            return this.lines.shift();
        }
        return await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.waiters = this.waiters.filter((item) => item !== onLine);
                reject(new Error('SMTP response timeout'));
            }, timeoutMs);
            const onLine = (line) => {
                clearTimeout(timeout);
                resolve(line);
            };
            this.waiters.push(onLine);
        });
    }
    async expect(expectedCodes) {
        const expectedList = Array.isArray(expectedCodes) ? expectedCodes : [expectedCodes];
        const first = await this.nextLine();
        const status = Number(first.slice(0, 3));
        const lines = [first];
        const prefix = first.slice(0, 3);
        let isMultiline = first[3] === '-';
        while (isMultiline) {
            const next = await this.nextLine();
            lines.push(next);
            isMultiline = next.startsWith(`${prefix}-`);
        }
        if (!expectedList.includes(status)) {
            throw new Error(`SMTP ${status}: ${lines.join(' | ')}`);
        }
    }
    writeLine(line) {
        this.socket.write(`${line}\r\n`);
    }
    writeRaw(data) {
        this.socket.write(data);
    }
    end() {
        this.socket.end();
    }
}
function getSmtpConfig() {
    var _a, _b, _c, _d, _e;
    const host = (_a = process.env.SMTP_HOST) === null || _a === void 0 ? void 0 : _a.trim();
    const user = (_b = process.env.SMTP_USER) === null || _b === void 0 ? void 0 : _b.trim();
    const pass = process.env.SMTP_PASS;
    const from = (_c = process.env.SMTP_FROM) === null || _c === void 0 ? void 0 : _c.trim();
    const portRaw = (_d = process.env.SMTP_PORT) === null || _d === void 0 ? void 0 : _d.trim();
    const secureRaw = (_e = process.env.SMTP_SECURE) === null || _e === void 0 ? void 0 : _e.trim().toLowerCase();
    if (!host || !user || !pass || !from)
        return null;
    const port = Number(portRaw || 465);
    if (!Number.isFinite(port) || port <= 0)
        return null;
    const secure = secureRaw ? secureRaw === 'true' : port === 465;
    const parsedFrom = parseFromAddress(from);
    if (!parsedFrom)
        return null;
    return {
        host,
        port,
        secure,
        user,
        pass,
        fromHeader: parsedFrom.headerValue,
        fromEnvelope: parsedFrom.envelopeValue,
    };
}
function sanitizeHeaderValue(value) {
    return value.replace(/[\r\n]+/g, ' ').trim();
}
function normalizeRecipients(values) {
    return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}
function normalizeSmtpBody(value) {
    return value.replace(/\r?\n/g, '\r\n');
}
function dotStuff(value) {
    return value
        .split('\r\n')
        .map((line) => (line.startsWith('.') ? `.${line}` : line))
        .join('\r\n');
}
function parseFromAddress(from) {
    const value = from.trim();
    if (!value)
        return null;
    const angleMatch = value.match(/<\s*([^<>\s]+@[^<>\s]+)\s*>/);
    if (angleMatch === null || angleMatch === void 0 ? void 0 : angleMatch[1]) {
        return {
            headerValue: sanitizeHeaderValue(value),
            envelopeValue: angleMatch[1].trim(),
        };
    }
    const plain = value.replace(/^["']|["']$/g, '').trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(plain)) {
        return {
            headerValue: sanitizeHeaderValue(plain),
            envelopeValue: plain,
        };
    }
    return null;
}
function buildMessage(input, fromHeader) {
    var _a;
    const to = normalizeRecipients(input.to);
    const cc = normalizeRecipients((_a = input.cc) !== null && _a !== void 0 ? _a : []);
    const allRecipients = normalizeRecipients([...to, ...cc]);
    const subject = sanitizeHeaderValue(input.subject);
    const baseHeaders = [
        `From: ${fromHeader}`,
        `To: ${to.join(', ')}`,
        ...(cc.length > 0 ? [`Cc: ${cc.join(', ')}`] : []),
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Date: ${new Date().toUTCString()}`,
    ];
    const html = typeof input.html === 'string' ? input.html.trim() : '';
    let headers;
    let body;
    if (html) {
        const boundary = `cc-alt-${(0, node_crypto_1.randomBytes)(12).toString('hex')}`;
        headers = [...baseHeaders, `Content-Type: multipart/alternative; boundary="${boundary}"`].join('\r\n');
        const textBody = normalizeSmtpBody(input.text);
        const htmlBody = normalizeSmtpBody(html);
        body = [
            `--${boundary}`,
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
            '',
            textBody,
            `--${boundary}`,
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
            '',
            htmlBody,
            `--${boundary}--`,
            '',
        ].join('\r\n');
    }
    else {
        headers = [
            ...baseHeaders,
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ].join('\r\n');
        body = normalizeSmtpBody(input.text);
    }
    return {
        allRecipients,
        raw: `${headers}\r\n\r\n${dotStuff(body)}\r\n.\r\n`,
    };
}
async function connectClient(config) {
    return await new Promise((resolve, reject) => {
        const onError = (error) => reject(error);
        const options = {
            host: config.host,
            port: config.port,
            servername: config.host,
        };
        const socket = config.secure ? node_tls_1.default.connect(options, onConnected) : node_net_1.default.connect(options, onConnected);
        socket.once('error', onError);
        function onConnected() {
            socket.off('error', onError);
            socket.setTimeout(20000, () => socket.destroy(new Error('SMTP socket timeout')));
            resolve(new SmtpClient(socket));
        }
    });
}
async function sendSmtpMail(input) {
    const config = getSmtpConfig();
    if (!config) {
        return {
            ok: false,
            error: 'Missing or invalid SMTP configuration (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM). SMTP_FROM must include a valid email.',
        };
    }
    const message = buildMessage(input, config.fromHeader);
    if (message.allRecipients.length === 0) {
        return { ok: false, error: 'No recipients provided.' };
    }
    let client = null;
    try {
        client = await connectClient(config);
        await client.expect(220);
        client.writeLine(`EHLO ${config.host}`);
        await client.expect(250);
        client.writeLine('AUTH LOGIN');
        await client.expect(334);
        client.writeLine(Buffer.from(config.user).toString('base64'));
        await client.expect(334);
        client.writeLine(Buffer.from(config.pass).toString('base64'));
        await client.expect(235);
        client.writeLine(`MAIL FROM:<${config.fromEnvelope}>`);
        await client.expect(250);
        for (const recipient of message.allRecipients) {
            client.writeLine(`RCPT TO:<${recipient}>`);
            await client.expect([250, 251]);
        }
        client.writeLine('DATA');
        await client.expect(354);
        client.writeRaw(message.raw);
        await client.expect(250);
        client.writeLine('QUIT');
        await client.expect(221);
        client.end();
        return { ok: true };
    }
    catch (error) {
        if (client)
            client.end();
        return { ok: false, error: (error === null || error === void 0 ? void 0 : error.message) || 'Unknown SMTP error' };
    }
}
