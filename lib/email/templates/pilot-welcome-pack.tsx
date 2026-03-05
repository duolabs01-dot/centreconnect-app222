type PasswordSetupEmailInput = {
  centreName: string
  contactName: string
  lockedEmail: string
  setupLink: string
  loginLink: string
}

type PilotWelcomeChecklistItem = {
  label: string
  href: string
  done?: boolean
  whereItShows?: string
}

type PilotWelcomePackEmailInput = {
  centreName: string
  contactName: string
  dashboardLink: string
  websiteBuilderLink: string
  attendanceLink: string
  pickupLink: string
  qrPosterLink: string
  supportWhatsApp?: string
  supportEmail?: string
  supportLink?: string
  welcomeGuideLink?: string
  packageLabel?: string
  centreLogoUrl?: string | null
  quickSteps?: PilotWelcomeChecklistItem[]
}

type ParentToEcdAdminMigrationEmailInput = {
  centreName: string
  contactName: string
  dashboardLink: string
  websiteBuilderLink: string
  applicationsLink: string
}

const BRAND = {
  bg: '#F4F7FB',
  card: '#FFFFFF',
  heading: '#0F172A',
  body: '#334155',
  muted: '#64748B',
  primary: '#0F766E',
  accent: '#14B8A6',
  border: '#E2E8F0',
}

function BrandLogoMark({ size = 30 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        border: '1px solid #ccfbf1',
      }}
    >
      <svg width={Math.max(14, size - 12)} height={Math.max(14, size - 12)} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="cc-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0F766E" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#cc-logo-gradient)" />
        <path
          d="M40 18a16 16 0 1 0 0 28"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function isSafeHttpImage(url: string | null | undefined) {
  if (!url) return false
  const value = url.trim()
  if (!value) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function toFirstName(value: string | null | undefined, fallback = 'Friend') {
  const text = (value ?? '').trim()
  if (!text) return fallback
  return text.split(' ')[0] || fallback
}

function renderChecklist(items: PilotWelcomeChecklistItem[]) {
  return items
    .map((item) => {
      const done = Boolean(item.done)
      const marker = done ? '&#9989;' : '&#11036;'
      const itemLabel = done ? `<s>${item.label}</s>` : item.label
      const where = item.whereItShows
        ? `<p style="margin:4px 0 0;font-size:11px;color:${BRAND.muted};">Shows in: ${item.whereItShows}</p>`
        : ''

      return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid ${BRAND.border};">
          <a href="${item.href}" style="color:${BRAND.body};text-decoration:none;font-size:13px;line-height:1.6;">
            ${marker} ${itemLabel}
          </a>
          ${where}
        </td>
      </tr>`
    })
    .join('')
}

async function renderShell(title: string, subtitle: string, contentHtml: string) {
  const { renderToStaticMarkup } = await import('react-dom/server')

  return `<!doctype html>${renderToStaticMarkup(
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: BRAND.bg, fontFamily: 'Inter, Arial, sans-serif', color: BRAND.body }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ padding: '24px 12px' }}>
          <tbody>
            <tr>
              <td align="center">
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    maxWidth: '680px',
                    backgroundColor: BRAND.card,
                    border: `1px solid ${BRAND.border}`,
                    borderRadius: '18px',
                    overflow: 'hidden',
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          padding: '22px 24px',
                          background:
                            'linear-gradient(125deg, rgba(15,118,110,1) 0%, rgba(20,184,166,0.96) 100%)',
                          color: '#FFFFFF',
                        }}
                      >
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: '10px' }}>
                          <tbody>
                            <tr>
                              <td style={{ width: '42px' }}>
                                <BrandLogoMark size={34} />
                              </td>
                              <td>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: '11px',
                                    letterSpacing: '0.12em',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  CentreConnect
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <h1 style={{ margin: '4px 0 6px', fontSize: '24px', lineHeight: 1.2, fontWeight: 800 }}>
                          {title}
                        </h1>
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, opacity: 0.95 }}>{subtitle}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '24px' }}>
                        <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ margin: '14px 0 0', color: BRAND.muted, fontSize: '12px' }}>
                  This is a transactional onboarding email from CentreConnect.
                </p>
                <p style={{ margin: '6px 0 0', color: BRAND.muted, fontSize: '12px', lineHeight: 1.5 }}>
                  This email may contain private information for the named recipient.
                  If you received it by mistake, please delete it and let us know at{' '}
                  <a href="mailto:admin@centerconnect.co.za" style={{ color: BRAND.muted }}>
                    admin@centerconnect.co.za
                  </a>
                  .
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  )}`
}

function button(label: string, href: string, tone: 'primary' | 'secondary' = 'primary') {
  const style =
    tone === 'primary'
      ? `background:${BRAND.primary};color:#fff;border:1px solid ${BRAND.primary};`
      : `background:#fff;color:${BRAND.primary};border:1px solid ${BRAND.border};`

  return `<a href="${href}" style="display:inline-block;padding:12px 18px;border-radius:12px;${style}font-weight:700;text-decoration:none;font-size:14px;">${label}</a>`
}

export function renderEcdPasswordSetupEmail(input: PasswordSetupEmailInput) {
  const firstName = toFirstName(input.contactName)
  const body = `
    <p style="margin:0 0 10px;font-size:14px;line-height:1.65;">Hey ${firstName},</p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.65;">
      Your CentreConnect workspace for <strong>${input.centreName}</strong> is ready.
      Use this secure link to set your password and open your ECD account.
    </p>
    <div style="margin:0 0 16px;">${button('Set password and open account', input.setupLink)}</div>
    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#F8FAFC;margin:0 0 14px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:${BRAND.muted};">Locked Email</p>
          <p style="margin:0;font-size:14px;font-weight:700;color:${BRAND.heading};">${input.lockedEmail}</p>
          <p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:${BRAND.muted};">This setup link is tied to this email and is time-limited.</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 10px;font-size:14px;line-height:1.65;">
      After setup, sign in at:
      <a href="${input.loginLink}" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">${input.loginLink}</a>
    </p>
    <p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.6;">
      If the button does not open, copy this secure link into your browser:<br/>
      <span style="word-break:break-all;">${input.setupLink}</span>
    </p>
  `

  return renderShell(
    'Your Centre Account Is Ready',
    'One secure step, then you can start onboarding your centre.',
    body
  )
}

export function renderPilotWelcomePackEmail(input: PilotWelcomePackEmailInput) {
  const supportWhatsApp = input.supportWhatsApp ?? '+27685356430'
  const supportEmail = input.supportEmail ?? 'admin@centerconnect.co.za'
  const supportLink = input.supportLink ?? `mailto:${supportEmail}`
  const supportWhatsappDigits = supportWhatsApp.replace(/[^0-9]/g, '')
  const supportWhatsappLaunchLink = `https://wa.me/${supportWhatsappDigits}?text=${encodeURIComponent(
    `Hi CentreConnect team, this is ${input.contactName} from ${input.centreName}. Please help us finish onboarding.`
  )}`
  const welcomeGuideUrl = input.welcomeGuideLink?.trim() || input.websiteBuilderLink
  const packageLabel = input.packageLabel ?? 'welcome pack'
  const firstName = toFirstName(input.contactName)

  const checklistItems =
    input.quickSteps && input.quickSteps.length > 0
      ? input.quickSteps
      : [
          { label: 'Upload your centre logo', href: input.websiteBuilderLink, done: false, whereItShows: 'Welcome pack + centre cards' },
          { label: 'Add your hero cover photo', href: input.websiteBuilderLink, done: false, whereItShows: 'Welcome pack header' },
          { label: 'Add your first five children', href: `${input.websiteBuilderLink.replace('/website', '/children/new')}`, done: false, whereItShows: 'Attendance + reports' },
          { label: 'Take attendance once', href: input.attendanceLink, done: false, whereItShows: 'Parent daily updates' },
          { label: 'Turn on safe pickup', href: input.pickupLink, done: false, whereItShows: 'Gate-time verification' },
        ]

  const centreLogoBlock = isSafeHttpImage(input.centreLogoUrl)
    ? `
      <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#FFFFFF;margin:0 0 14px;">
        <tr>
          <td style="padding:10px 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:56px;vertical-align:middle;">
                  <img src="${input.centreLogoUrl}" width="48" height="48" alt="${input.centreName} logo" style="display:block;border-radius:999px;border:1px solid ${BRAND.border};background:#fff;" />
                </td>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-size:12px;font-weight:700;color:${BRAND.heading};">${input.centreName} branding is live</p>
                  <p style="margin:2px 0 0;font-size:11px;color:${BRAND.muted};">This logo appears in your welcome pack and parent-facing centre cards.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`
    : ''

  const body = `
    <p style="margin:0 0 10px;font-size:14px;line-height:1.65;">Hey ${firstName},</p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.65;">
      Welcome to CentreConnect for <strong>${input.centreName}</strong>.
      We know WhatsApp admin can feel heavy, so this email keeps your next steps clear.
    </p>

    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#ECFEFF;margin:0 0 14px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.body};">
            Parents are already asking for the app. You are in the right place to launch with confidence.
          </p>
        </td>
      </tr>
    </table>

    ${centreLogoBlock}

    <div style="margin:0 0 16px;">
      ${button(`See your ${packageLabel}`, welcomeGuideUrl)}
    </div>

    <table role="presentation" width="100%" style="border-collapse:separate;border-spacing:0 8px;margin:0 0 14px;">
      <tr>
        <td style="padding:10px 12px;border:1px solid ${BRAND.border};border-radius:10px;background:#FFFFFF;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${BRAND.heading};">Daily attendance and reports</p>
          <p style="margin:0;font-size:12px;line-height:1.55;color:${BRAND.body};">Tap once per child. Monthly totals are ready automatically.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid ${BRAND.border};border-radius:10px;background:#FFFFFF;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${BRAND.heading};">Safe pickup time</p>
          <p style="margin:0;font-size:12px;line-height:1.55;color:${BRAND.body};">Use QR checks at the gate so staff stay calm and children stay safe.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid ${BRAND.border};border-radius:10px;background:#FFFFFF;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${BRAND.heading};">Parent applications</p>
          <p style="margin:0;font-size:12px;line-height:1.55;color:${BRAND.body};">Review everything in one place with no WhatsApp chasing.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid ${BRAND.border};border-radius:10px;background:#FFFFFF;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${BRAND.heading};">What parents are saying</p>
          <p style="margin:0;font-size:12px;line-height:1.55;color:${BRAND.body};">Families want this experience. You can deliver it from day one.</p>
        </td>
      </tr>
    </table>

    <div style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px;">
      ${button('Get started now', input.dashboardLink)}
      ${button('Print parent QR poster', input.qrPosterLink, 'secondary')}
    </div>

    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#F8FAFC;margin:0 0 16px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:${BRAND.accent};">Quick first steps</p>
          <table role="presentation" width="100%" style="border-collapse:collapse;">
            ${renderChecklist(checklistItems)}
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 14px;font-size:13px;line-height:1.65;color:${BRAND.body};">
      Thank you for trusting us with your business. Your growth and our growth move together, and we are here to support your team every step.
      <br />
      <span style="font-weight:700;color:${BRAND.heading};">- Mandlenkosi, Founder</span>
    </p>

    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#ECFEFF;margin:0 0 12px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:#0F766E;">Need help?</p>
          <div style="margin:0 0 10px;">
            ${button('Chat on WhatsApp', supportWhatsappLaunchLink)}
          </div>
          <p style="margin:0 0 6px;font-size:13px;line-height:1.65;color:${BRAND.body};">
            WhatsApp: <a href="https://wa.me/${supportWhatsappDigits}" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">${supportWhatsApp}</a><br/>
            Email: <a href="mailto:${supportEmail}" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">${supportEmail}</a>
          </p>
          <a href="${supportLink}" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">Open support</a>
        </td>
      </tr>
    </table>
  `

  return renderShell(
    'Your CentreConnect Welcome Pack Is Ready',
    'Simple steps, clear actions, and real support for your centre.',
    body
  )
}

export function renderParentToEcdAdminMigrationEmail(input: ParentToEcdAdminMigrationEmailInput) {
  const firstName = toFirstName(input.contactName)
  const body = `
    <p style="margin:0 0 10px;font-size:14px;line-height:1.65;">Hey ${firstName},</p>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.65;">
      Your CentreConnect account was upgraded from <strong>Parent</strong> to <strong>ECD Admin</strong> for
      <strong> ${input.centreName}</strong>.
    </p>
    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#FFF7ED;margin:0 0 14px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:#9A3412;">Access Update</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#7C2D12;">
            Parent-side access is now revoked for this email. Use your ECD Admin portal moving forward.
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.65;"><strong>ECD Admin privileges now active:</strong></p>
    <ul style="margin:0 0 14px 18px;padding:0;color:${BRAND.body};font-size:13px;line-height:1.7;">
      <li>Manage centre profile, branding, logo, and hero image.</li>
      <li>Review incoming applications and manage admissions.</li>
      <li>Publish announcements and parent communication.</li>
      <li>Access attendance, daily reports, pickup tools, and dashboard.</li>
    </ul>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px;">
      ${button('Open website setup', input.websiteBuilderLink)}
      ${button('Open dashboard', input.dashboardLink, 'secondary')}
      ${button('Open applications', input.applicationsLink, 'secondary')}
    </div>
  `

  return renderShell(
    'You Are Now an ECD Admin',
    'Your account role has changed. Use the ECD portal for all centre operations.',
    body
  )
}
