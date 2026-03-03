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
  supportLink: string
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
  const body = `
    <p style="margin:0 0 10px;font-size:14px;line-height:1.65;">Welcome ${input.contactName},</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.65;">
      You're now part of the <strong>CentreConnect Pilot</strong> with <strong>${input.centreName}</strong>.
      Your welcome pack below follows the exact product UI/UX flow your team will use daily.
    </p>
    <table role="presentation" width="100%" style="border-collapse:separate;border-spacing:0 10px;margin:0 0 14px;">
      <tr>
        <td style="border:1px solid ${BRAND.border};border-radius:12px;padding:12px 14px;background:#FFFFFF;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:${BRAND.accent};">Step 1</p>
          <p style="margin:0;font-size:14px;font-weight:700;color:${BRAND.heading};">Open Dashboard</p>
          <p style="margin:6px 0 0;font-size:13px;color:${BRAND.body};">Track readiness, applications, and quick actions from one command panel.</p>
        </td>
      </tr>
      <tr>
        <td style="border:1px solid ${BRAND.border};border-radius:12px;padding:12px 14px;background:#FFFFFF;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:${BRAND.accent};">Step 2</p>
          <p style="margin:0;font-size:14px;font-weight:700;color:${BRAND.heading};">Website Builder</p>
          <p style="margin:6px 0 0;font-size:13px;color:${BRAND.body};">Add logo, hero image, gallery, and publish your profile for parent discovery.</p>
        </td>
      </tr>
      <tr>
        <td style="border:1px solid ${BRAND.border};border-radius:12px;padding:12px 14px;background:#FFFFFF;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:${BRAND.accent};">Step 3</p>
          <p style="margin:0;font-size:14px;font-weight:700;color:${BRAND.heading};">Admissions & Parent Comms</p>
          <p style="margin:6px 0 0;font-size:13px;color:${BRAND.body};">Manage applications, reminders, and parent notifications from the ECD portal.</p>
        </td>
      </tr>
    </table>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px;">
      ${button('Open Dashboard', input.dashboardLink)}
      ${button('Open Website Builder', input.websiteBuilderLink)}
    </div>
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.body};line-height:1.65;">
      Need a quick handover with your team? Reply to this email or create a support request.
    </p>
    <p style="margin:0;font-size:13px;">
      <a href="${input.supportLink}" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">Open support desk</a>
    </p>
  `

  return renderShell(
    'Pilot Welcome Pack',
    'Launch-ready checklist, links, and onboarding guidance for your pilot workspace.',
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
