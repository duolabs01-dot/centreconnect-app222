type PasswordSetupEmailInput = {
  centreName: string
  contactName: string
  lockedEmail: string
  setupLink: string
  loginLink: string
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
  primary: '#065A82',
  accent: '#0EA5A4',
  border: '#E2E8F0',
}

async function renderShell(title: string, subtitle: string, contentHtml: string) {
  const { renderToStaticMarkup } = await import('react-dom/server')
  return `<!doctype html>${renderToStaticMarkup(
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: BRAND.bg, fontFamily: 'Arial, sans-serif', color: BRAND.body }}>
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
                            'linear-gradient(125deg, rgba(6,90,130,1) 0%, rgba(14,165,164,0.95) 100%)',
                          color: '#FFFFFF',
                        }}
                      >
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
                        <h1 style={{ margin: '10px 0 6px', fontSize: '24px', lineHeight: 1.2, fontWeight: 800 }}>
                          {title}
                        </h1>
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, opacity: 0.94 }}>{subtitle}</p>
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
                  You are receiving this from CentreConnect onboarding operations.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  )}`
}

function button(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:${BRAND.primary};color:#fff;font-weight:700;text-decoration:none;font-size:14px;">${label}</a>`
}

function mockScreenshotCard(title: string, subtitle: string, accent: string, detailRows: string[]) {
  const rows = detailRows
    .map(
      (row) =>
        `<tr><td style="padding:0 0 8px;"><div style="height:10px;border-radius:999px;background:${row};"></div></td></tr>`
    )
    .join('')

  return `
    <td style="width:33.33%;vertical-align:top;padding:0 4px 8px;">
      <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#FFFFFF;overflow:hidden;">
        <tr>
          <td style="padding:10px 10px 8px;background:linear-gradient(120deg, ${accent} 0%, #0EA5A4 100%);color:#FFFFFF;">
            <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">${title}</p>
            <p style="margin:4px 0 0;font-size:11px;opacity:0.95;">${subtitle}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 10px 2px;background:#F8FAFC;">
            <table role="presentation" width="100%" style="border-collapse:collapse;">
              ${rows}
            </table>
            <div style="height:24px;border-radius:8px;background:#E2E8F0;margin:0 0 8px;"></div>
            <div style="height:24px;border-radius:8px;background:#CFFAFE;margin:0 0 8px;"></div>
          </td>
        </tr>
      </table>
    </td>
  `
}

export function renderEcdPasswordSetupEmail(input: PasswordSetupEmailInput) {
  const body = `
    <p style="margin:0 0 10px;font-size:14px;line-height:1.65;">Hi ${input.contactName},</p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.65;">
      Your CentreConnect workspace for <strong>${input.centreName}</strong> is ready.
      Use your one-time secure setup link below to create your password and access the ECD portal.
    </p>
    <div style="margin:0 0 16px;">${button('Set Password & Open Account', input.setupLink)}</div>
    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#F8FAFC;margin:0 0 14px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:${BRAND.muted};">Locked Email</p>
          <p style="margin:0;font-size:14px;font-weight:700;color:${BRAND.heading};">${input.lockedEmail}</p>
          <p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:${BRAND.muted};">This setup link is tied to this email and can only be used once.</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#EFF6FF;margin:0 0 14px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:#1D4ED8;">Pilot Activation</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.body};">
            If you are claiming a pilot listing, reply with <strong>"Claim"</strong> to confirm ownership.
            We share pilot perks and any price-lock details only after your Claim reply is confirmed.
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 10px;font-size:14px;line-height:1.65;">
      After setting your password, sign in from the ECD login:
      <a href="${input.loginLink}" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">${input.loginLink}</a>
    </p>
    <p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.6;">
      If the button does not open, copy and paste this secure link into your browser:<br/>
      <span style="word-break:break-all;">${input.setupLink}</span>
    </p>
  `

  return renderShell(
    'Your Centre Account Is Ready',
    'Set your password once, then start managing your ECD operations on CentreConnect.',
    body
  )
}

export function renderPilotWelcomePackEmail(input: PilotWelcomePackEmailInput) {
  const supportWhatsApp = input.supportWhatsApp ?? '+27685356430'
  const supportEmail = input.supportEmail ?? 'admin@centerconnect.co.za'
  const supportLink = input.supportLink ?? `mailto:${supportEmail}`

  const body = `
    <p style="margin:0 0 10px;font-size:14px;line-height:1.65;">Hi ${input.contactName} 👋,</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.65;">
      Welcome to the <strong>CentreConnect Pilot</strong> for <strong>${input.centreName}</strong> 🎉.
      Your account is live and ready to run daily operations beautifully.
    </p>
    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#ECFEFF;margin:0 0 14px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:#0F766E;">Pilot Price Lock Confirmed</p>
          <p style="margin:0;font-size:13px;line-height:1.65;color:${BRAND.body};">
            As a pilot cr&egrave;che, we're locking your onboarding at R500 and giving you Growth Plan benefits for the first 3 months at Starter price.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" style="border-collapse:separate;border-spacing:0;margin:0 0 16px;">
      <tr>
        ${mockScreenshotCard('Dashboard', 'Live centre pulse', '#065A82', ['#CBD5E1', '#A7F3D0', '#BFDBFE'])}
        ${mockScreenshotCard('Attendance', 'Daily check-ins', '#0F766E', ['#99F6E4', '#CFFAFE', '#E2E8F0'])}
        ${mockScreenshotCard('Pickup', 'Secure verification', '#0B7285', ['#BAE6FD', '#E0F2FE', '#E2E8F0'])}
      </tr>
    </table>

    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#F8FAFC;margin:0 0 14px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:${BRAND.accent};">QR Poster Setup 📍</p>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${BRAND.body};">
            Print your pickup QR poster and place it at reception so verified pickups are fast and secure.
          </p>
          <ol style="margin:0 0 10px 18px;padding:0;font-size:13px;line-height:1.7;color:${BRAND.body};">
            <li>Open Pickup Centre in the ECD portal.</li>
            <li>Generate or refresh your QR code poster.</li>
            <li>Print and display it where guardians check out children.</li>
          </ol>
          ${button('Open Pickup & QR Poster', input.qrPosterLink)}
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" style="border-collapse:separate;border-spacing:0 8px;margin:0 0 12px;">
      <tr>
        <td style="border:1px solid ${BRAND.border};border-radius:12px;padding:12px 14px;background:#FFFFFF;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:${BRAND.accent};">Quick Start ⚡</p>
          <p style="margin:0;font-size:13px;color:${BRAND.body};line-height:1.65;">
            1. Upload logo + hero image in Website Builder.<br/>
            2. Review Dashboard and clear setup items.<br/>
            3. Take first attendance and verify first pickup.<br/>
            4. Keep your profile updated so parents can discover and apply.
          </p>
        </td>
      </tr>
    </table>

    <div style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px;">
      ${button('Open Dashboard 📊', input.dashboardLink)}
      ${button('Open Attendance ✅', input.attendanceLink)}
      ${button('Go Live in Website Builder 🚀', input.websiteBuilderLink)}
      ${button('Open Pickup 🔐', input.pickupLink)}
    </div>

    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#ECFEFF;margin:0 0 12px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0 0 5px;font-size:12px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:#0F766E;">Support 🤝</p>
          <p style="margin:0 0 6px;font-size:13px;line-height:1.65;color:${BRAND.body};">
            WhatsApp: <a href="https://wa.me/${supportWhatsApp.replace(/[^0-9]/g, '')}" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">${supportWhatsApp}</a><br/>
            Email: <a href="mailto:${supportEmail}" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">${supportEmail}</a><br/>
            We respond within an hour.
          </p>
          <a href="${supportLink}" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">Open support</a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:${BRAND.body};line-height:1.65;">
      You are launch-ready. Let’s get your centre in front of families now 🌟
    </p>
  `

  return renderShell(
    'Pilot Welcome Pack 🚀',
    'Your CentreConnect workspace is live. Start onboarding, attendance, and secure pickup today.',
    body
  )
}

export function renderParentToEcdAdminMigrationEmail(input: ParentToEcdAdminMigrationEmailInput) {
  const body = `
    <p style="margin:0 0 10px;font-size:14px;line-height:1.65;">Hi ${input.contactName},</p>
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
      <li>Manage your centre profile, branding, logo, hero image, and gallery.</li>
      <li>Review incoming applications, make offers, and manage admissions flow.</li>
      <li>Publish announcements and send parent communications.</li>
      <li>Access attendance, daily reports, pickup tools, and operations dashboard.</li>
    </ul>
    <p style="margin:0 0 14px;font-size:13px;line-height:1.65;color:${BRAND.body};">
      Parents can discover your listing and apply quickly. Keep your profile and website content up to date to start receiving more applications.
    </p>
    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#EFF6FF;margin:0 0 14px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0 0 5px;font-size:11px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:#1D4ED8;">Pilot Claim Flow</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.body};">
            Reply with <strong>"Claim"</strong> to confirm your centre listing.
            After that confirmation, we send pilot perks and any price-lock terms in your onboarding pack.
          </p>
        </td>
      </tr>
    </table>
    <div style="margin:0 0 12px;">${button('Start Now: Go Live & Receive Applications', input.websiteBuilderLink)}</div>
    <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.body};">
      Next shortcuts:
      <a href="${input.dashboardLink}" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">Open Dashboard</a>
      &nbsp;|&nbsp;
      <a href="${input.applicationsLink}" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">Open Applications</a>
    </p>
  `

  return renderShell(
    'You Are Now an ECD Admin',
    'Your account role has changed. Move to the ECD portal to launch and manage your centre.',
    body
  )
}
