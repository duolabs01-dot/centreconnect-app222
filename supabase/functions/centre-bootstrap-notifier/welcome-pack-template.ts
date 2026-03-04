type WelcomePackTemplateInput = {
  centreName: string
  ownerName: string
  dashboardLink: string
  attendanceLink: string
  pickupLink: string
  websiteBuilderLink: string
  supportWhatsApp: string
  supportEmail: string
  whatsappLaunchLink: string | null
}

const BRAND = {
  bg: '#F3F7FB',
  card: '#FFFFFF',
  border: '#E2E8F0',
  heading: '#0F172A',
  body: '#334155',
  muted: '#64748B',
  primary: '#0F766E',
  accent: '#14B8A6',
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function cta(label: string, href: string) {
  return `
    <a
      href="${escapeHtml(href)}"
      style="
        display:inline-block;
        padding:12px 18px;
        border-radius:12px;
        background:${BRAND.primary};
        color:#ffffff;
        font-weight:800;
        font-size:13px;
        text-decoration:none;
        letter-spacing:0.02em;
      "
    >
      ${escapeHtml(label)}
    </a>
  `
}

function whatsappCta(label: string, href: string) {
  return `
    <a
      href="${escapeHtml(href)}"
      style="
        display:inline-block;
        width:100%;
        box-sizing:border-box;
        text-align:center;
        padding:15px 20px;
        border-radius:14px;
        background:#16A34A;
        color:#ffffff;
        font-weight:900;
        font-size:15px;
        text-decoration:none;
        letter-spacing:0.02em;
      "
    >
      ${escapeHtml(label)}
    </a>
  `
}

function screenshotCard(title: string, subtitle: string, tone: string, bars: string[]) {
  const barRows = bars
    .map((bar) => `<div style="height:10px;border-radius:999px;background:${bar};margin:0 0 8px;"></div>`)
    .join('')

  return `
    <td style="width:33.33%;vertical-align:top;padding:0 4px 8px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;background:#ffffff;">
        <tr>
          <td style="padding:10px 10px 8px;background:linear-gradient(120deg, ${tone} 0%, ${BRAND.accent} 100%);color:#ffffff;">
            <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(title)}</p>
            <p style="margin:4px 0 0;font-size:11px;opacity:0.96;">${escapeHtml(subtitle)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px;background:#F8FAFC;">
            ${barRows}
            <div style="height:26px;border-radius:8px;background:#DBEAFE;margin:0 0 8px;"></div>
            <div style="height:22px;border-radius:8px;background:#CCFBF1;"></div>
          </td>
        </tr>
      </table>
    </td>
  `
}

export function renderCentreBootstrapWelcomePack(input: WelcomePackTemplateInput) {
  const ownerName = input.ownerName.trim() || 'ECD Admin'
  const centreName = input.centreName.trim() || 'your centre'
  const whatsappDigits = input.supportWhatsApp.replace(/[^\d]/g, '')

  const subject = `Welcome to CentreConnect | ${centreName}`

  const html = `
<!doctype html>
<html lang="en">
  <body style="margin:0;background:${BRAND.bg};font-family:Arial,Helvetica,sans-serif;color:${BRAND.body};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:700px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:24px;background:linear-gradient(125deg,#0F766E 0%, #14B8A6 100%);color:#ffffff;">
                <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">CentreConnect</p>
                <h1 style="margin:10px 0 6px;font-size:26px;line-height:1.15;font-weight:900;">Welcome, ${escapeHtml(ownerName)}!</h1>
                <p style="margin:0;font-size:14px;line-height:1.55;opacity:0.98;">
                  ${escapeHtml(centreName)} is now live. Your centre workspace is ready to start receiving and managing applications.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 12px;font-size:14px;line-height:1.65;">
                  We designed your onboarding to feel like the app itself: clean, fast, and practical. Here is your first-look pack.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 14px;">
                  <tr>
                    ${screenshotCard('Dashboard', 'Daily pulse', '#065F46', ['#99F6E4', '#CFFAFE', '#BFDBFE'])}
                    ${screenshotCard('Attendance', 'Check-ins', '#0F766E', ['#A7F3D0', '#CCFBF1', '#E2E8F0'])}
                    ${screenshotCard('Pickup', 'Secure handover', '#115E59', ['#67E8F9', '#BAE6FD', '#E2E8F0'])}
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${BRAND.border};border-radius:12px;background:#F8FAFC;margin:0 0 14px;">
                  <tr>
                    <td style="padding:12px 14px;">
                      <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;font-weight:900;text-transform:uppercase;color:${BRAND.muted};">
                        Quick Start Guide
                      </p>
                      <ol style="margin:0 0 10px 18px;padding:0;font-size:13px;line-height:1.7;color:${BRAND.body};">
                        <li>Open your dashboard and confirm centre details.</li>
                        <li>Upload logo, hero image, and gallery in Website Builder.</li>
                        <li>Run your first attendance check-in.</li>
                        <li>Test one secure pickup verification flow.</li>
                      </ol>
                      <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        ${cta('Open Dashboard', input.dashboardLink)}
                        ${cta('Website Builder', input.websiteBuilderLink)}
                      </div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #99F6E4;border-radius:12px;background:#ECFEFF;margin:0 0 14px;">
                  <tr>
                    <td style="padding:12px 14px;">
                      <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;font-weight:900;text-transform:uppercase;color:${BRAND.primary};">
                        Support
                      </p>
                      <p style="margin:0;font-size:13px;line-height:1.65;color:${BRAND.body};">
                        WhatsApp:
                        <a href="https://wa.me/${escapeHtml(whatsappDigits)}" style="color:${BRAND.primary};font-weight:800;text-decoration:none;">${escapeHtml(input.supportWhatsApp)}</a><br/>
                        Email:
                        <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:${BRAND.primary};font-weight:800;text-decoration:none;">${escapeHtml(input.supportEmail)}</a><br/>
                        We respond within an hour.
                      </p>
                    </td>
                  </tr>
                </table>

                ${
                  input.whatsappLaunchLink
                    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 14px;">
                  <tr>
                    <td style="padding:0 0 10px;">
                      ${whatsappCta('Chat on WhatsApp to Launch Faster', input.whatsappLaunchLink)}
                    </td>
                  </tr>
                </table>`
                    : ''
                }

                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                  ${cta('Open Attendance', input.attendanceLink)}
                  ${cta('Open Pickup', input.pickupLink)}
                </div>
              </td>
            </tr>
          </table>

          <p style="margin:14px 0 0;font-size:12px;color:${BRAND.muted};">
            Sent by CentreConnect onboarding automation.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`

  return { subject, html }
}
