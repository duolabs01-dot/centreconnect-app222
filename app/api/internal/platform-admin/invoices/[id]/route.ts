import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'

const payloadSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'canceled']),
})

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })

  const { id: invoiceId } = await context.params
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 })

  const admin = createAdminClient()
  const { data: invoice, error: readError } = await admin
    .from('invoices')
    .select('id,ecd_id,invoice_number,status,total,due_at,issued_at,ecd_centres(name,slug)')
    .eq('id', invoiceId)
    .maybeSingle()
  if (readError || !invoice) return NextResponse.json({ error: readError?.message || 'Invoice not found' }, { status: 404 })

  const nextStatus = parsed.data.status
  const patch: Record<string, unknown> = { status: nextStatus }

  if (nextStatus === 'paid') {
    patch.paid_at = new Date().toISOString()
    if (!invoice.issued_at) {
      patch.issued_at = new Date().toISOString()
    }
  } else {
    patch.paid_at = null
    if ((nextStatus === 'sent' || nextStatus === 'overdue') && !invoice.issued_at) {
      patch.issued_at = new Date().toISOString()
    }
  }

  const { error } = await admin.from('invoices').update(patch).eq('id', invoiceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await writePlatformActivity(admin, {
    actorUserId: platformAdmin.userId,
    actorEmail: platformAdmin.email,
    entityType: 'invoice',
    // Use tenant id so Tenant 360 timeline can include invoice mutations.
    entityId: invoice.ecd_id,
    action: 'set_invoice_status',
    summary: `Invoice ${invoice.invoice_number} status changed ${invoice.status} -> ${nextStatus}`,
    details: { invoiceId, invoiceNumber: invoice.invoice_number, ecdId: invoice.ecd_id, from: invoice.status, to: nextStatus },
  })
  const centre = Array.isArray((invoice as any).ecd_centres) ? (invoice as any).ecd_centres[0] : (invoice as any).ecd_centres
  void sendPlatformAdminActionNotification({
    subject: 'Invoice Status Updated',
    heading: 'An invoice status was changed.',
    lines: [
      `Invoice: ${invoice.invoice_number}`,
      `Centre: ${centre?.name ?? invoice.ecd_id}`,
      `Slug: ${centre?.slug ?? '-'}`,
      `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
    ],
    details: {
      from: invoice.status,
      to: nextStatus,
      total: invoice.total,
      dueAt: invoice.due_at,
    },
  })

  return NextResponse.json({ ok: true, id: invoiceId, status: nextStatus })
}
