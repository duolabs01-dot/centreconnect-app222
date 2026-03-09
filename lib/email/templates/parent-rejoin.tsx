import { renderBaseEmailLayout } from '../email-layout'

type ParentRejoinEmailInput = {
  recipientName: string
  inviteLink: string
  loginLink: string
  supportEmail: string
  appBaseUrl?: string
  logoUrl?: string
  tiers?: Array<{ name: string; summary: string; features: string[]; note?: string }>
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const goldBadgeSvg = `
  <div style="display:flex; align-items:center; gap:10px; padding:6px 12px; border-radius:999px; border:1px solid #f3c259; background:linear-gradient(135deg,#f7e7b7,#f2c14e); color:#1f1f1f; font-weight:600; font-size:0.85rem; box-shadow:0 8px 18px rgba(255,206,86,0.4);">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" stroke="#b58111" stroke-width="2" fill="#fbdc7d" />
      <path d="M8.5 12.8L11 15L16 9.25" stroke="#7a4d07" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span>Verified badge</span>
  </div>`

export function renderParentRejoinEmail(input: ParentRejoinEmailInput) {
  const subject = 'CentreConnect is back on – rejoin in one tap ✨'
  const tiers = input.tiers ?? [
    {
      name: 'Starter (Alone)',
      summary: 'Browse the directory, save favourites, and unlock live push updates.',
      features: ['Neighbourhood search that updates in seconds', 'Apply buttons that prefill your profile'],
    },
    {
      name: 'Growth (With Starter)',
      summary: 'Keeps documents, payments, and replies together so you can move quicker.',
      features: ['One parent profile per family for every application', 'Automated reminders when centres reply'],
      note: 'Includes Starter benefits',
    },
    {
      name: 'Pro (With all tables)',
      summary: 'Our concierge tier with premium verification and priority alerts.',
      features: ['Gold badge centres and human checks', 'Priority WhatsApp + app nudges + proof of pickup'],
      note: 'Includes Growth + Starter',
    },
  ]

  const tierRows = tiers
    .map((tier) => `
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #edf2f7; font-weight:700; color:#1f2933; background:#fdfaf4;">${escapeHtml(tier.name)}</td>
        <td style="padding:12px 16px; border-bottom:1px solid #edf2f7; color:#475569;">
          <p style="margin:0 0 6px; font-weight:600;">${escapeHtml(tier.summary)}</p>
          <ul style="margin:6px 0 0; padding-left:18px;">
            ${tier.features.map((feature) => `<li style="margin:4px 0;">${escapeHtml(feature)}</li>`).join('')}
          </ul>
          ${tier.note ? `<p style="margin:6px 0 0; font-size:12px; color:#7c8a97;">${escapeHtml(tier.note)}</p>` : ''}
        </td>
      </tr>
    `)
    .join('')

  const htmlContent = `
    <p style="margin:0 0 20px; font-size:16px; color:#334155;">
      We noticed you were part of CentreConnect before we paused for some parent + centre improvements. This email is your curious-parent invite back.
    </p>

    <p style="margin:0 0 16px; font-size:15px; color:#475569;">
      Here’s what is better now:
    </p>
    <ul style="margin:0 0 24px; padding-left:20px; color:#475569; line-height:1.6;">
      <li>Live neighbourhood availability, clearer fees, and a new gold badge that shows when a centre has completed verification.</li>
      <li>Parent steps that keep documents, payments, and replies in one profile, so you can stay curious without switching apps.</li>
      <li>Tiered experiences so you pay only for the features you need (Starter, Growth, Pro) and each tier enforces the right checks.</li>
    </ul>

    <div style="margin:0 0 30px; display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
      ${goldBadgeSvg}
      <div style="font-size:14px; color:#0f172a;">
        Centres earn this badge after completing our verified onboarding checklist – just look for the sparkle when you tap a listing.
      </div>
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate; border-spacing:0 4px;">
      ${tierRows}
    </table>

    <p style="margin:30px 0 12px; font-size:15px; color:#334155; font-weight:600;">Ready to rejoin?</p>
    <a href="${escapeHtml(input.inviteLink)}" style="display:inline-block; margin-bottom:24px; padding:16px 32px; border-radius:16px; background:#0d9488; color:#fff; text-decoration:none; font-weight:700; font-size:16px;">Rejoin CentreConnect</a>
    <p style="margin:0 0 24px; font-size:13px; color:#64748b;">
      Prefer to jump right in? <a style="color:#0891b2; text-decoration:none;" href="${escapeHtml(input.loginLink)}">Sign in now</a> and we’ll load your previous profile instantly.
    </p>

    <p style="margin:0; font-size:12px; color:#94a3b8;">
      Curious questions? Reply here or reach us at <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:#0891b2; text-decoration:none;">${escapeHtml(input.supportEmail)}</a>.
    </p>
  `

  const { html, text } = renderBaseEmailLayout({
    theme: 'parent',
    recipientName: input.recipientName,
    previewText: 'We’d love to welcome you back to CentreConnect. Here’s what’s better now.',
    appBaseUrl: input.appBaseUrl,
    logoUrl: input.logoUrl,
    children: htmlContent,
  })

  return { subject, html, text }
}
