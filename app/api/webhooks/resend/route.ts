import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      ignored: true,
      reason: 'resend_disabled',
      message: 'Resend webhooks are disabled. SMTP is the active CentreConnect email provider.',
    },
    { status: 410 }
  )
}
