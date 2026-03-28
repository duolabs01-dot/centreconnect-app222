import 'server-only'

/**
 * Onboarding drip email templates for ECD centres.
 *
 * Day 3 — sent if the centre has 0 children added after 3 days.
 * Day 7 — sent if the centre has not published their website/profile after 7 days.
 *
 * All templates share the same simple HTML layout (no heavy design — these
 * are plain, personal-feeling nudges, not marketing emails).
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

function baseLayout(body: string, appUrl: string): string {
  const unsubUrl = `${appUrl.replace(/\/$/, '')}/ecd/settings`
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
              You received this because you registered a cr&egrave;che on CentreConnect.<br />
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
// Day 0: Celebration — sent immediately on onboarding completion
// ---------------------------------------------------------------------------

export type DayZeroCelebrationInput = {
  centreName: string
  publicProfileLink: string
  dashboardLink: string
  appUrl: string
}

export function renderDayZeroCelebrationEmail(input: DayZeroCelebrationInput): string {
  const centre = escapeHtml(input.centreName)
  const profileLink = escapeHtml(input.publicProfileLink)
  const dashboardLink = escapeHtml(input.dashboardLink)
  const whatsappText = encodeURIComponent(
    `Check out ${input.centreName} on CentreConnect \u2014 no registration fee to apply: ${input.publicProfileLink}`
  )

  const body = `
    <p style="margin:0 0 16px;font-size:22px;font-weight:900;color:#0F172A;">
      ${centre} is now discoverable by families
    </p>
    <p style="margin:0 0 16px;">
      Your cr&egrave;che is live on CentreConnect. Parents in your area can find you in the directory,
      view your profile, and apply &mdash; all for free.
    </p>
    <p style="margin:0 0 24px;">
      Share your link today so families know you&apos;re open for applications.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td style="padding:12px 16px;background:#F0FDF4;border-radius:12px;border:1px solid #BBF7D0;font-size:14px;">
          <strong>Your public profile link</strong><br />
          <a href="${profileLink}" style="color:${BRAND_PRIMARY};font-weight:700;word-break:break-all;">${profileLink}</a>
        </td>
      </tr>
      <tr><td style="height:10px;"></td></tr>
      <tr>
        <td style="padding:12px 16px;background:#ECFDF5;border-radius:12px;border:1px solid #A7F3D0;font-size:14px;">
          <strong>Share on WhatsApp</strong><br />
          <span style="color:${BRAND_MUTED};">Copy this message and send it to parents:</span><br />
          <a href="https://wa.me/?text=${whatsappText}" style="color:#059669;font-weight:700;">Open WhatsApp share &rarr;</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:14px;color:${BRAND_MUTED};">
      Tip: Print your link on a poster for your gate, post it on Facebook, or add it to your WhatsApp status.
      Every family who sees it can apply directly &mdash; no registration fee.
    </p>
    <p style="margin:24px 0 16px;">
      <a href="${dashboardLink}"
         style="display:inline-block;background:${BRAND_PRIMARY};color:#ffffff;font-size:14px;font-weight:800;padding:14px 28px;border-radius:50px;text-decoration:none;">
        Go to my dashboard &rarr;
      </a>
    </p>
    <p style="margin:24px 0 0;font-size:14px;">
      Warm regards,<br />
      <strong>Mandla</strong><br />
      <span style="font-size:12px;color:${BRAND_MUTED};">Founder, CentreConnect &mdash; Alexandra, Johannesburg</span>
    </p>`

  return baseLayout(body, input.appUrl)
}

// ---------------------------------------------------------------------------
// Day 1: Resume nudge — sent if onboarding still incomplete after 1 day
// ---------------------------------------------------------------------------

export type DripDay1ResumeInput = {
  contactName: string
  centreName: string
  onboardingLink: string
  appUrl: string
}

export function renderDripDay1ResumeEmail(input: DripDay1ResumeInput): string {
  const name = escapeHtml(input.contactName || 'there')
  const centre = escapeHtml(input.centreName)
  const link = escapeHtml(input.onboardingLink)

  const body = `
    <p style="margin:0 0 16px;font-size:22px;font-weight:900;color:#0F172A;">
      Hi ${name} &mdash; finish your setup in 5 minutes
    </p>
    <p style="margin:0 0 16px;">
      Your cr&egrave;che <strong>${centre}</strong> is almost ready on CentreConnect.
      Families won&apos;t be able to find you until setup is complete.
    </p>
    <p style="margin:0 0 24px;">
      It takes about 5 minutes to finish. Once you&apos;re done, your profile goes live and parents
      can start applying &mdash; with no registration fee.
    </p>
    <p style="margin:0 0 32px;">
      <a href="${link}"
         style="display:inline-block;background:${BRAND_PRIMARY};color:#ffffff;font-size:14px;font-weight:800;padding:14px 28px;border-radius:50px;text-decoration:none;">
        Finish setup &rarr;
      </a>
    </p>
    <p style="margin:24px 0 0;font-size:14px;">
      Warm regards,<br />
      <strong>Mandla</strong><br />
      <span style="font-size:12px;color:${BRAND_MUTED};">Founder, CentreConnect &mdash; Alexandra, Johannesburg</span>
    </p>`

  return baseLayout(body, input.appUrl)
}

// ---------------------------------------------------------------------------
// Day 14: Features highlight — sent 14 days after onboarding completion
// ---------------------------------------------------------------------------

export type DripDay14FeaturesInput = {
  contactName: string
  centreName: string
  tier: 'basic' | 'standard' | 'premium'
  dashboardLink: string
  billingLink: string
  publicProfileLink: string
  appUrl: string
}

export function renderDripDay14FeaturesEmail(input: DripDay14FeaturesInput): string {
  const name = escapeHtml(input.contactName || 'there')
  const centre = escapeHtml(input.centreName)
  const isGrowthPlus = input.tier !== 'basic'

  const growthFeatures = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="padding:12px 16px;background:#F0FDF4;border-radius:12px;border:1px solid #BBF7D0;font-size:14px;margin-bottom:8px;">
          <strong>Daily Reports</strong><br />
          <span style="color:${BRAND_MUTED};">Send parents a daily photo and note. Takes 2 minutes per child.</span><br />
          <a href="${escapeHtml(input.dashboardLink.replace(/\/$/, '') + '/ecd/daily-reports')}" style="color:${BRAND_PRIMARY};font-weight:700;">Try daily reports &rarr;</a>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:12px 16px;background:#EFF6FF;border-radius:12px;border:1px solid #BFDBFE;font-size:14px;">
          <strong>Safe Pickup</strong><br />
          <span style="color:${BRAND_MUTED};">Replace your paper collection book with QR-based verification.</span><br />
          <a href="${escapeHtml(input.dashboardLink.replace(/\/dashboard$/, '/pickup'))}" style="color:${BRAND_PRIMARY};font-weight:700;">Enable safe pickup &rarr;</a>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:12px 16px;background:#FDF4FF;border-radius:12px;border:1px solid #E9D5FF;font-size:14px;">
          <strong>Parent Messaging</strong><br />
          <span style="color:${BRAND_MUTED};">Send announcements to all parents at once. No more WhatsApp groups.</span><br />
          <a href="${escapeHtml(input.dashboardLink.replace(/\/dashboard$/, '/communications'))}" style="color:${BRAND_PRIMARY};font-weight:700;">Send an announcement &rarr;</a>
        </td>
      </tr>
    </table>`

  const starterFeatures = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="padding:12px 16px;background:#F0FDF4;border-radius:12px;border:1px solid #BBF7D0;font-size:14px;">
          <strong>Share your profile</strong><br />
          <span style="color:${BRAND_MUTED};">Post your public link on Facebook, your gate, or WhatsApp status.</span><br />
          <a href="${escapeHtml(input.publicProfileLink)}" style="color:${BRAND_PRIMARY};font-weight:700;">See your public page &rarr;</a>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:12px 16px;background:#EFF6FF;border-radius:12px;border:1px solid #BFDBFE;font-size:14px;">
          <strong>Unlock daily operations</strong><br />
          <span style="color:${BRAND_MUTED};">R299/month gets you daily reports, parent messaging, safe pickup, and more.</span><br />
          <a href="${escapeHtml(input.billingLink)}" style="color:${BRAND_PRIMARY};font-weight:700;">See Growth plan &rarr;</a>
        </td>
      </tr>
    </table>`

  const body = `
    <p style="margin:0 0 16px;font-size:22px;font-weight:900;color:#0F172A;">
      Hi ${name} &mdash; 2 weeks in with ${centre}
    </p>
    <p style="margin:0 0 24px;">
      You&apos;ve had CentreConnect for two weeks now. Here are the features most centres
      start using in their second week:
    </p>
    ${isGrowthPlus ? growthFeatures : starterFeatures}
    <p style="margin:0 0 16px;">
      <a href="${escapeHtml(input.dashboardLink)}"
         style="display:inline-block;background:${BRAND_PRIMARY};color:#ffffff;font-size:14px;font-weight:800;padding:14px 28px;border-radius:50px;text-decoration:none;">
        Go to my dashboard &rarr;
      </a>
    </p>
    <p style="margin:24px 0 0;font-size:14px;">
      Warm regards,<br />
      <strong>Mandla</strong><br />
      <span style="font-size:12px;color:${BRAND_MUTED};">Founder, CentreConnect &mdash; Alexandra, Johannesburg</span>
    </p>`

  return baseLayout(body, input.appUrl)
}

// ---------------------------------------------------------------------------
// Day 3 and Day 7 (existing — unchanged)
// ---------------------------------------------------------------------------

export type DripDay3Input = {
  contactName: string
  centreName: string
  addChildrenLink: string
  appUrl: string
}

export type DripDay7Input = {
  contactName: string
  centreName: string
  centreSlug: string
  websiteLink: string
  publicProfileLink: string
  appUrl: string
}

export function renderDripDay3Email(input: DripDay3Input): string {
  const name = escapeHtml(input.contactName || 'there')
  const centre = escapeHtml(input.centreName)
  const link = escapeHtml(input.addChildrenLink)

  const body = `
    <p style="margin:0 0 16px;font-size:22px;font-weight:900;color:#0F172A;">
      Hi ${name} &mdash; have you added your children yet?
    </p>
    <p style="margin:0 0 16px;">
      It has been a few days since <strong>${centre}</strong> joined CentreConnect.
      The one thing that makes the biggest difference early on is adding your first
      few children &mdash; it unlocks attendance, daily reports, and the parent
      pickup workflow all at once.
    </p>
    <p style="margin:0 0 24px;">
      It takes about two minutes.
    </p>
    <p style="margin:0 0 32px;">
      <a href="${link}"
         style="display:inline-block;background:${BRAND_PRIMARY};color:#ffffff;font-size:14px;font-weight:800;padding:14px 28px;border-radius:50px;text-decoration:none;">
        Add your first children &rarr;
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:14px;color:${BRAND_MUTED};">
      Once they&rsquo;re in, you can mark attendance, send daily reports to parents,
      and turn on safe pickup &mdash; all from your dashboard.
    </p>
    <p style="margin:24px 0 0;font-size:14px;">
      Warm regards,<br />
      <strong>Mandla</strong><br />
      <span style="font-size:12px;color:${BRAND_MUTED};">Founder, CentreConnect &mdash; Alexandra, Johannesburg</span>
    </p>`

  return baseLayout(body, input.appUrl)
}

export function renderDripDay7Email(input: DripDay7Input): string {
  const name = escapeHtml(input.contactName || 'there')
  const centre = escapeHtml(input.centreName)
  const websiteLink = escapeHtml(input.websiteLink)
  const publicLink = escapeHtml(input.publicProfileLink)

  const body = `
    <p style="margin:0 0 16px;font-size:22px;font-weight:900;color:#0F172A;">
      ${centre} is live &mdash; share it with families
    </p>
    <p style="margin:0 0 16px;">
      Hi ${name}, your cr&egrave;che has been on CentreConnect for a week now.
      Parents in your area can already find ${centre} in the directory
      &mdash; but a complete profile with a logo and cover photo gets
      <strong>3&times; more applications</strong> than one without.
    </p>
    <p style="margin:0 0 24px;">
      Two things make the biggest difference this week:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td style="padding:12px 16px;background:#F0FDF4;border-radius:12px;border:1px solid #BBF7D0;font-size:14px;">
          <strong>1. Upload your logo &amp; cover photo</strong><br />
          <span style="color:${BRAND_MUTED};">Parents trust a page with real photos. It takes 2 minutes.</span><br />
          <a href="${websiteLink}" style="color:${BRAND_PRIMARY};font-weight:700;">Go to Website Builder &rarr;</a>
        </td>
      </tr>
      <tr><td style="height:10px;"></td></tr>
      <tr>
        <td style="padding:12px 16px;background:#EFF6FF;border-radius:12px;border:1px solid #BFDBFE;font-size:14px;">
          <strong>2. Share your public profile link</strong><br />
          <span style="color:${BRAND_MUTED};">Send it on WhatsApp, paste it on your gate poster, or add it to your Facebook page.</span><br />
          <a href="${publicLink}" style="color:${BRAND_PRIMARY};font-weight:700;">See your profile &rarr;</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:14px;color:${BRAND_MUTED};">
      Families in Alexandra, Sandton, and Tembisa are looking for cr&egrave;ches right now.
      A complete profile means they find you &mdash; not someone else.
    </p>
    <p style="margin:24px 0 0;font-size:14px;">
      Warm regards,<br />
      <strong>Mandla</strong><br />
      <span style="font-size:12px;color:${BRAND_MUTED};">Founder, CentreConnect &mdash; Alexandra, Johannesburg</span>
    </p>`

  return baseLayout(body, input.appUrl)
}
