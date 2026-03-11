import {
  getPublicPlanDefinition,
  getPublicPlanLabel,
  toPublicPlan,
  type PublicPlan,
} from '@/lib/billing/plans'

type PasswordSetupEmailInput = {
  centreName: string
  contactName: string
  lockedEmail: string
  setupLink: string
  loginLink: string
}

type PasswordSetupConfirmedEmailInput = {
  contactName: string
  loginLink: string
  roleLabel: string
  centreName?: string | null
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
  packagePlan?: string
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
  warm: '#FFF7ED',
  warmBorder: '#FDBA74',
}

const CENTRECONNECT_LOGO_URL = 'https://centerconnect.co.za/centreconnect-logo-email.png'
const FOUNDER_PHOTO_URL = 'https://centerconnect.co.za/founder-mandlenkosi.jpeg'

function BrandLogoMark({ size = 30 }: { size?: number }) {
  return (
    <img
      src={CENTRECONNECT_LOGO_URL}
      width={size}
      height={size}
      alt="CentreConnect"
      style={{
        display: 'block',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        border: '1px solid #ccfbf1',
        objectFit: 'contain',
      }}
    />
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

function renderFeatureScenarioCards(items: Array<{ title: string; body: string; accent: string }>) {
  return `
    <table role="presentation" width="100%" style="border-collapse:separate;border-spacing:0 8px;margin:0 0 14px;">
      ${items
        .map(
          (item) => `
            <tr>
              <td style="padding:12px 14px;border:1px solid ${BRAND.border};border-radius:14px;background:#FFFFFF;">
                <p style="margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:${item.accent};">${item.title}</p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.body};">${item.body}</p>
              </td>
            </tr>
          `
        )
        .join('')}
    </table>
  `
}

function renderCentreCardPreview(input: { centreName: string }) {
  return `
    <table role="presentation" width="100%" style="border-collapse:collapse;border:1px solid ${BRAND.border};border-radius:18px;overflow:hidden;background:#FFFDF9;margin:0 0 18px;">
      <tr>
        <td style="padding:0;">
          <div style="height:96px;background:linear-gradient(135deg,#F6FCFA 0%,#EAF6F2 48%,#FFF4E9 100%);"></div>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 16px 16px;">
          <p style="margin:0 0 4px;font-size:17px;font-weight:800;line-height:1.3;color:${BRAND.heading};">${input.centreName}</p>
          <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.muted};">CentreConnect parent card</p>
          <div style="margin:0 0 10px;">
            <span style="display:inline-block;margin:0 6px 6px 0;padding:6px 10px;border-radius:999px;border:1px solid #CCFBF1;background:#FFFFFF;font-size:11px;font-weight:700;color:#115E59;">Daily updates</span>
            <span style="display:inline-block;margin:0 6px 6px 0;padding:6px 10px;border-radius:999px;border:1px solid #CCFBF1;background:#FFFFFF;font-size:11px;font-weight:700;color:#115E59;">Safer pickup</span>
            <span style="display:inline-block;margin:0 6px 6px 0;padding:6px 10px;border-radius:999px;border:1px solid #CCFBF1;background:#FFFFFF;font-size:11px;font-weight:700;color:#115E59;">Less paperwork</span>
          </div>
          <div style="padding:10px 12px;border:1px solid #CCFBF1;border-radius:14px;background:linear-gradient(180deg,#F8FCFB 0%,#EEF8F5 100%);">
            <p style="margin:0 0 4px;font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.muted};">Why this feels better for parents</p>
            <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.body};">Parents see a calmer, more modern creche journey here: easier applications, visible daily activity updates, and clearer follow-up after they tap Apply.</p>
          </div>
        </td>
      </tr>
    </table>
  `
}

function describePlan(plan: PublicPlan) {
  const definition = getPublicPlanDefinition(plan)
  return {
    label: getPublicPlanLabel(plan),
    description: definition.description,
    includes: definition.includes.slice(0, 3),
    outcomes: definition.outcomes.slice(0, 2),
  }
}

function renderPlanComparisonTable(selectedPlan: PublicPlan) {
  const plans: Array<{ plan: PublicPlan; subtitle: string }> = [
    { plan: 'starter', subtitle: 'Alone' },
    { plan: 'growth', subtitle: 'With Starter' },
    { plan: 'pro', subtitle: 'With Starter + Growth' },
  ]

  return `
    <table role="presentation" width="100%" style="border-collapse:collapse;border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;margin:0 0 16px;background:#FFFFFF;">
      <tr style="background:#F8FAFC;">
        <td style="padding:12px 10px;border-bottom:1px solid ${BRAND.border};"></td>
        ${plans
          .map(({ plan, subtitle }) => {
            const isActive = plan === selectedPlan
            return `
              <td style="padding:12px 10px;border-bottom:1px solid ${BRAND.border};vertical-align:top;background:${isActive ? '#ECFEFF' : '#F8FAFC'};">
                <p style="margin:0 0 4px;font-size:14px;font-weight:800;color:${BRAND.heading};">${getPublicPlanLabel(plan)}</p>
                <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:${BRAND.muted};">${subtitle}</p>
              </td>`
          })
          .join('')}
      </tr>
      <tr>
        <td style="padding:12px 10px;border-bottom:1px solid ${BRAND.border};font-size:12px;font-weight:800;color:${BRAND.heading};vertical-align:top;">Best for</td>
        ${plans
          .map(({ plan }) => `<td style="padding:12px 10px;border-bottom:1px solid ${BRAND.border};font-size:13px;line-height:1.6;color:${BRAND.body};vertical-align:top;">${describePlan(plan).description}</td>`)
          .join('')}
      </tr>
      <tr>
        <td style="padding:12px 10px;border-bottom:1px solid ${BRAND.border};font-size:12px;font-weight:800;color:${BRAND.heading};vertical-align:top;">Main tools</td>
        ${plans
          .map(({ plan }) => `<td style="padding:12px 10px;border-bottom:1px solid ${BRAND.border};font-size:13px;line-height:1.6;color:${BRAND.body};vertical-align:top;">${describePlan(plan).includes.slice(0, 2).join('<br/>')}</td>`)
          .join('')}
      </tr>
      <tr>
        <td style="padding:12px 10px;font-size:12px;font-weight:800;color:${BRAND.heading};vertical-align:top;">Feels like</td>
        ${plans
          .map(({ plan }) => `<td style="padding:12px 10px;font-size:13px;line-height:1.6;color:${BRAND.body};vertical-align:top;">${describePlan(plan).outcomes[0] ?? ''}</td>`)
          .join('')}
      </tr>
    </table>
  `
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
                  This is a transactional CentreConnect email.
                </p>
                <p style={{ margin: '6px 0 0', color: BRAND.muted, fontSize: '12px', lineHeight: 1.5 }}>
                  Need help? Email{' '}
                  <a href="mailto:admin@centerconnect.co.za" style={{ color: BRAND.muted }}>
                    admin@centerconnect.co.za
                  </a>{' '}
                  or reply on WhatsApp.
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
    <p style="margin:0 0 10px;font-size:14px;line-height:1.65;">Hi ${firstName},</p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.65;">
      Your CentreConnect account for <strong>${input.centreName}</strong> is ready.
      Start with this one simple step and you will be inside your workspace.
    </p>
    <div style="margin:0 0 16px;">${button('Set password and open workspace', input.setupLink)}</div>
    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#F8FAFC;margin:0 0 14px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:${BRAND.muted};">Locked Email</p>
          <p style="margin:0;font-size:14px;font-weight:700;color:${BRAND.heading};">${input.lockedEmail}</p>
          <p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:${BRAND.muted};">This setup link is tied to this email and will expire for your safety.</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#ECFEFF;margin:0 0 14px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.body};">
            After this step, CentreConnect will open your welcome guide and show you what to do next.
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 10px;font-size:13px;line-height:1.65;color:${BRAND.muted};">
      Your sign-in page for later: <a href="${input.loginLink}" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">${input.loginLink}</a>
    </p>
    <p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.6;">
      If the button does not open, copy this secure link into your browser:<br/>
      <span style="word-break:break-all;">${input.setupLink}</span>
    </p>
  `

  return renderShell(
    'Your CentreConnect account is ready',
    'One simple step, then you are inside your workspace.',
    body
  )
}

export function renderPasswordSetupConfirmedEmail(input: PasswordSetupConfirmedEmailInput) {
  const firstName = toFirstName(input.contactName)
  const isEcdRole = input.roleLabel.toLowerCase().includes('ecd')
  const centreLine = input.centreName?.trim()
    ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:${BRAND.body};">Centre: <strong>${input.centreName.trim()}</strong></p>`
    : ''

  const nextSteps = isEcdRole
    ? renderFeatureScenarioCards([
        {
          title: 'Your welcome guide opens after sign in',
          body: 'You will see the next steps clearly: add your first child, take attendance once, and turn on safe pickup.',
          accent: BRAND.primary,
        },
        {
          title: 'Your centre work stays organised',
          body: 'CentreConnect brings child records, attendance, and parent communication into one calm workspace.',
          accent: '#0369A1',
        },
        {
          title: 'Support stays human',
          body: 'If anything feels confusing, reply to this email or WhatsApp us and we will help you step by step.',
          accent: '#B45309',
        },
      ])
    : renderFeatureScenarioCards([
        {
          title: 'Your account is secure again',
          body: 'You can sign in normally and continue where you left off in CentreConnect.',
          accent: BRAND.primary,
        },
        {
          title: 'If this was not you, act quickly',
          body: 'Reply to this email immediately so we can help you protect the account.',
          accent: '#DC2626',
        },
      ])

  const body = `
    <p style="margin:0 0 10px;font-size:14px;line-height:1.65;">Hi ${firstName},</p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.65;">
      Your CentreConnect password was changed successfully.
      Your account is now secure and ready to use.
    </p>
    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:14px;background:#F8FAFC;margin:0 0 16px;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:${BRAND.muted};">Account Access</p>
          <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:${BRAND.heading};">
            Role: <strong>${input.roleLabel}</strong>
          </p>
          ${centreLine}
          <p style="margin:0;font-size:13px;line-height:1.65;color:${BRAND.body};">
            Sign in here: <a href="${input.loginLink}" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">${input.loginLink}</a>
          </p>
        </td>
      </tr>
    </table>
    <div style="margin:0 0 16px;">${button(isEcdRole ? 'Open CentreConnect sign in' : 'Open CentreConnect', input.loginLink)}</div>
    <table role="presentation" width="100%" style="border:1px solid ${BRAND.warmBorder};border-radius:14px;background:${BRAND.warm};margin:0 0 16px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0;font-size:13px;line-height:1.65;color:${BRAND.body};">
            ${isEcdRole ? 'Your welcome guide is waiting for you after sign in, and it was sent to your email so you can come back to it anytime.' : 'If this password change was unexpected, contact CentreConnect support immediately.'}
          </p>
        </td>
      </tr>
    </table>
    ${nextSteps}
    <p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.6;">
      If you did not change your password, contact support immediately at
      <a href="mailto:admin@centerconnect.co.za" style="color:${BRAND.primary};text-decoration:none;"> admin@centerconnect.co.za</a>.
    </p>
  `

  return renderShell(
    'Your CentreConnect password was changed',
    'Secure, branded, and ready for your next step.',
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
  const welcomeGuideUrl = input.welcomeGuideLink?.trim() || input.dashboardLink
  const firstName = toFirstName(input.contactName)
  const plan = toPublicPlan(input.packagePlan ?? input.packageLabel, 'growth')
  const packageInfo = describePlan(plan)

  const checklistItems =
    input.quickSteps && input.quickSteps.length > 0
      ? input.quickSteps
      : [
          {
            label: 'Add your first child',
            href: `${input.websiteBuilderLink.replace('/website', '/children/new')}`,
            done: false,
            whereItShows: 'Children list + attendance',
          },
          {
            label: 'Take attendance once',
            href: input.attendanceLink,
            done: false,
            whereItShows: 'Daily register',
          },
          {
            label: 'Turn on safe pickup',
            href: input.pickupLink,
            done: false,
            whereItShows: 'Collection time',
          },
          {
            label: 'Print your QR posters',
            href: input.qrPosterLink,
            done: false,
            whereItShows: 'Office desk + outside poster',
          },
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
                  <p style="margin:0;font-size:12px;font-weight:700;color:${BRAND.heading};">${input.centreName} is set up on CentreConnect</p>
                  <p style="margin:2px 0 0;font-size:11px;color:${BRAND.muted};">Your branding is already showing in the workspace.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`
    : ''

  const productScenarios = renderFeatureScenarioCards([
    {
      title: 'Applications, but calm! 📋',
      body: 'Parents apply in one clean flow, and your team stops chasing the same details across many WhatsApp chats.',
      accent: BRAND.primary,
    },
    {
      title: 'One child record. One calm place! 🧒',
      body: 'Keep child details, guardians, pickup people, and health notes together on your phone.',
      accent: '#7C3AED',
    },
    {
      title: 'Attendance in under a minute! ✅',
      body: 'Mark the morning register in seconds and let CentreConnect keep the totals organised for you.',
      accent: '#0369A1',
    },
    {
      title: 'Pickup that feels safe! 🔐',
      body: 'Turn busy collection time into a calmer, safer process with authorised pickup checks.',
      accent: '#B45309',
    },
  ])

  const body = `
    <p style="margin:0 0 10px;font-size:14px;line-height:1.65;">Hi ${firstName},</p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.65;">
      Welcome to CentreConnect for <strong>${input.centreName}</strong>.
      This guide shows you, in simple English, what the product helps you do and what to start with first.
    </p>
    <p style="margin:0 0 16px;font-size:13px;line-height:1.65;color:rgb(51,65,85);">
      Because your child’s centre already uses CentreConnect, you can now see attendance, daily notes, pickup safety checks, and document requests right from your phone — no more chasing the same chats on WhatsApp.
    </p>

    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#ECFEFF;margin:0 0 14px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.body};">
            Start small. Add one child, take attendance once, and the rest will feel much easier.
          </p>
        </td>
      </tr>
    </table>

    ${centreLogoBlock}

    <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.heading};">How parents will see your creche</p>
    ${renderCentreCardPreview({ centreName: input.centreName })}

    <div style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px;">
      ${button('Open my welcome guide', welcomeGuideUrl)}
      ${button('Open workspace', input.dashboardLink, 'secondary')}
    </div>

    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:14px;background:#F8FAFC;margin:0 0 16px;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:${BRAND.accent};">Your setup right now</p>
          <p style="margin:0 0 6px;font-size:18px;font-weight:800;color:${BRAND.heading};">${packageInfo.label}</p>
          <p style="margin:0 0 10px;font-size:13px;line-height:1.65;color:${BRAND.body};">${packageInfo.description}</p>
          ${packageInfo.outcomes
            .map(
              (item) =>
                `<p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:${BRAND.body};">&#10003; ${item}</p>`
            )
            .join('')}
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.heading};">Compare the plans</p>
    ${renderPlanComparisonTable(plan)}

    <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.heading};">What CentreConnect helps you do</p>
    ${productScenarios}

    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#F8FAFC;margin:0 0 16px;">
      <tr>
        <td style="padding:12px 14px;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.08em;font-weight:800;text-transform:uppercase;color:${BRAND.accent};">Your quick checklist</p>
          <table role="presentation" width="100%" style="border-collapse:collapse;">
            ${renderChecklist(checklistItems)}
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;background:#FFFFFF;margin:0 0 14px;">
      <tr>
        <td style="padding:12px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:58px;vertical-align:top;">
                <img src="${FOUNDER_PHOTO_URL}" width="48" height="48" alt="Mandlenkosi Ngwenya" style="display:block;border-radius:999px;border:1px solid ${BRAND.border};object-fit:cover;" />
              </td>
              <td style="vertical-align:top;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.heading};">A note from the founder</p>
                <p style="margin:0;font-size:13px;line-height:1.65;color:${BRAND.body};">
                  Thank you for trusting us with your centre. We built CentreConnect to make daily work feel lighter, clearer, and more professional.
                  <br />
                  <span style="font-weight:700;color:${BRAND.heading};">- Mandlenkosi</span>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

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
    'Welcome to CentreConnect',
    'You are in! Here is your guide, your plan, and the simple next steps to start strong.',
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
    'You are now an ECD Admin',
    'Your account role has changed. Use the ECD portal for centre work.',
    body
  )
}

