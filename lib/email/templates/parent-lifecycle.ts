import 'server-only'

/**
 * Parent lifecycle email templates.
 *
 * Day 1  — parent has no child added yet (nudge to add first child)
 * Day 3  — parent has a child but no enrollment yet (state-aware: pending vs discover)
 * Day 7  — post-enrollment feedback email (real child + centre name)
 *
 * All templates share the same simple HTML layout.
 * Footer identifies the recipient as a parent, not an ECD owner.
 */

const BRAND_PRIMARY = '#0F766E'
const BRAND_BODY = '#334155'
const BRAND_MUTED = '#64748B'
const BRAND_BG = '#F4F7FB'

function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function baseParentLayout(body: string, appUrl: string): string {
  const unsubUrl = `${appUrl.replace(/\/$/, '')}/parent/profile`
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>CentreConnect</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND_BG};padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;border:1px solid #E2E8F0;overflow:hidden;">
        <!-- header -->
        <tr>
          <td style="background:${BRAND_PRIMARY};padding:20px 32px;">
            <p style="margin:0;font-size:13px;font-weight:800;color:#ccfbf1;letter-spacing:0.12em;text-transform:uppercase;">CentreConnect</p>
          </td>
        </tr>
        <!-- body -->
        <tr>
          <td style="padding:32px;color:${BRAND_BODY};font-size:15px;line-height:1.7;">
            ${body}
          </td>
        </tr>
        <!-- footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #E2E8F0;background:#F8FAFC;">
            <p style="margin:0;font-size:11px;color:${BRAND_MUTED};">
              You received this because you signed up as a parent on CentreConnect.<br />
              <a href="${unsubUrl}" style="color:${BRAND_PRIMARY};">Manage your email preferences</a>
              &nbsp;&middot;&nbsp;Made in Alexandra, Johannesburg
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Email 1: No child added — Day 1
// ---------------------------------------------------------------------------

export type ParentNoChildDay1Input = {
  contactName: string
  appUrl: string
}

export function renderParentNoChildDay1Email(input: ParentNoChildDay1Input): string {
  const { contactName, appUrl } = input
  const name = escapeHtml(contactName)
  const ctaUrl = `${appUrl.replace(/\/$/, '')}/parent/children/new`

  const body = `
<p>Hi ${name},</p>
<p>Welcome to CentreConnect.</p>
<p>Adding your child takes about 2 minutes and unlocks everything &mdash; browsing cr&egrave;ches, applying, and tracking offers.</p>
<p style="margin:28px 0;">
  <a href="${ctaUrl}" style="display:inline-block;background:${BRAND_PRIMARY};color:#fff;padding:13px 28px;border-radius:50px;text-decoration:none;font-weight:800;font-size:15px;">Add your first child &rarr;</a>
</p>
<p style="color:${BRAND_MUTED};font-size:13px;">Lots of families in our area have already started &mdash; you&rsquo;re in the right place.</p>
<p>Warm regards,<br><strong>Mandla</strong><br><span style="font-size:12px;color:${BRAND_MUTED};">Founder, CentreConnect</span></p>
`

  return baseParentLayout(body, appUrl)
}

// ---------------------------------------------------------------------------
// Email 2: Child added but no enrollment — Day 3
// ---------------------------------------------------------------------------

export type ParentChildNoEnrollmentDay3Input = {
  contactName: string
  state: 'discover' | 'pending'
  appUrl: string
}

export function renderParentChildNoEnrollmentDay3Email(input: ParentChildNoEnrollmentDay3Input): string {
  const { contactName, state, appUrl } = input
  const name = escapeHtml(contactName)

  let body: string

  if (state === 'pending') {
    const ctaUrl = `${appUrl.replace(/\/$/, '')}/parent/applications`
    body = `
<p>Hi ${name}, just checking in.</p>
<p>You have applications out &mdash; the cr&egrave;che will be in touch, but you can also check the latest status anytime.</p>
<p style="margin:28px 0;">
  <a href="${ctaUrl}" style="display:inline-block;background:${BRAND_PRIMARY};color:#fff;padding:13px 28px;border-radius:50px;text-decoration:none;font-weight:800;font-size:15px;">Check my applications</a>
</p>
<p style="color:${BRAND_MUTED};font-size:13px;">If anything changes, we will let you know by email too.</p>
<p>Warm regards,<br><strong>Mandla</strong><br><span style="font-size:12px;color:${BRAND_MUTED};">Founder, CentreConnect</span></p>
`
  } else {
    const ctaUrl = `${appUrl.replace(/\/$/, '')}/parent/discover`
    body = `
<p>Hi ${name},</p>
<p>Your child is registered. You&rsquo;re one step from finding the right cr&egrave;che.</p>
<p style="margin:28px 0;">
  <a href="${ctaUrl}" style="display:inline-block;background:${BRAND_PRIMARY};color:#fff;padding:13px 28px;border-radius:50px;text-decoration:none;font-weight:800;font-size:15px;">Browse cr&egrave;ches near me</a>
</p>
<p style="color:${BRAND_MUTED};font-size:13px;">There is no registration fee to apply &mdash; apply free and hear back directly from the cr&egrave;che.</p>
<p>Warm regards,<br><strong>Mandla</strong><br><span style="font-size:12px;color:${BRAND_MUTED};">Founder, CentreConnect</span></p>
`
  }

  return baseParentLayout(body, appUrl)
}

// ---------------------------------------------------------------------------
// Email 3: Post-enrollment feedback — Day 7
// ---------------------------------------------------------------------------

export type ParentPostEnrollmentFeedbackInput = {
  contactName: string
  childName: string
  centreName: string
  dashboardLink: string
  appUrl: string
}

export function renderParentPostEnrollmentFeedbackEmail(input: ParentPostEnrollmentFeedbackInput): string {
  const { contactName, childName, centreName, dashboardLink, appUrl } = input
  const name = escapeHtml(contactName)
  const child = escapeHtml(childName)
  const centre = escapeHtml(centreName)

  const body = `
<p>Hi ${name},</p>
<p>It&rsquo;s been a week since ${child} started at ${centre}. How has it been? We hope the transition has gone smoothly.</p>
<p style="margin:28px 0;">
  <a href="${dashboardLink}" style="display:inline-block;background:${BRAND_PRIMARY};color:#fff;padding:13px 28px;border-radius:50px;text-decoration:none;font-weight:800;font-size:15px;">View ${child}&rsquo;s updates</a>
</p>
<p style="color:${BRAND_MUTED};font-size:13px;">If anything feels off, reply to this email and Mandla will read it personally.</p>
<p>Warm regards,<br><strong>Mandla</strong><br><span style="font-size:12px;color:${BRAND_MUTED};">Founder, CentreConnect</span></p>
`

  return baseParentLayout(body, appUrl)
}
