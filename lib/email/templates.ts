export function applicationStatusEmail({
  parentName,
  childName,
  centreName,
  newStatus,
  appUrl,
}: {
  parentName: string
  childName: string
  centreName: string
  newStatus: string
  appUrl: string
}): { subject: string; html: string } {
  const statusLabels: Record<string, string> = {
    in_review: 'is now in review',
    approved: 'has been approved',
    enrolled: 'is now enrolled',
    waitlisted: 'is currently on the waitlist',
    rejected: 'was not successful this time',
  }
  const label = statusLabels[newStatus] ?? `has been updated to: ${newStatus}`

  const subject =
    newStatus === 'approved'
      ? `${centreName}: ${childName}'s application was approved`
      : newStatus === 'enrolled'
        ? `${childName} is enrolled at ${centreName}`
        : `${centreName} shared an update about ${childName}`

  const html = `
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="background: #0891b2; padding: 20px 24px; border-radius: 12px 12px 0 0;">
        <p style="color: white; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; margin: 0; text-transform: uppercase;">CentreConnect Family Update</p>
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <p style="color: #475569; font-size: 14px; margin: 0 0 8px;">Hi ${parentName},</p>
        <h1 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px; line-height: 1.3;">
          ${childName}'s application ${label}
        </h1>
        <p style="color: #475569; font-size: 14px; margin: 0 0 12px;">Centre: <strong>${centreName}</strong></p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          We know this journey is important for your family. Open your application to view the latest details and next steps.
        </p>
        <a href="${appUrl}" style="display: inline-block; background: #0891b2; color: white; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          View Application ->
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0;">
          You received this because you have an application on CentreConnect.
        </p>
      </div>
    </div>
  `

  return { subject, html }
}
