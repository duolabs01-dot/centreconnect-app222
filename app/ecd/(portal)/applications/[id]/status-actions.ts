'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { buildWarmApplicationUpdateMessage } from '@/lib/communications/templates'
import { applicationStatusEmail } from '@/lib/email/templates'

const statusUpdateSchema = z.object({
  applicationId: z.string().uuid(),
  status: z.enum(['submitted', 'in_review', 'approved', 'enrolled', 'waitlisted', 'rejected', 'withdrawn']),
  notes: z.string().max(2000).optional(),
})

const FINAL_STATUSES = new Set(['approved', 'waitlisted', 'rejected', 'withdrawn'])
const SUPERVISOR_BLOCKED_FINAL_STATUSES = new Set(['approved', 'enrolled', 'rejected'])

type UpdateStatusResult = {
  ok: boolean
  error?: string
  warning?: string
}

type ApplicationChild = { first_name: string | null; last_name: string | null }
type ApplicationProfile = { full_name: string | null }
type ApplicationParent = {
  id: string
  billing_email: string | null
  user_profiles: ApplicationProfile | ApplicationProfile[] | null
}
type ApplicationRecord = {
  id: string
  status: string
  ecd_id: string
  parent_id: string
  application_number: string
  offer_accepted_at: string | null
  children: ApplicationChild | ApplicationChild[] | null
  parents: ApplicationParent | ApplicationParent[] | null
}

function getAppOrigin() {
  const direct =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (direct) {
    return direct.replace(/\/+$/, '')
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/+$/, '')}`
  }

  return 'http://localhost:3010'
}

export async function updateApplicationStatusAction(input: unknown): Promise<UpdateStatusResult> {
  const parsed = statusUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Invalid status update data.' }
  }

  const session = await requireEcdPortalSession({ cached: false })
  const { applicationId, status } = parsed.data
  const notes = parsed.data.notes?.trim() ?? ''

  const { data: applicationRaw } = await session.supabase
    .from('applications')
    .select(
      'id,status,ecd_id,parent_id,application_number,admin_notes,offer_accepted_at,offer_made_at,offer_sent_at,enrolled_at,children(first_name,last_name),parents(id,billing_email,user_profiles(full_name))'
    )
    .eq('id', applicationId)
    .eq('ecd_id', session.ecdId)
    .maybeSingle()

  const application = (applicationRaw as ApplicationRecord | null) ?? null
  if (!application) {
    return { ok: false, error: 'Application not found.' }
  }

  if (application.status === 'enrolled' && status !== 'enrolled') {
    return { ok: false, error: 'Enrolled applications cannot be moved back to another status.' }
  }

  if (application.offer_accepted_at && status !== 'enrolled') {
    return { ok: false, error: 'This offer has already been accepted by the parent and cannot be changed.' }
  }

  if (session.role === 'ecd_supervisor' && status !== application.status && SUPERVISOR_BLOCKED_FINAL_STATUSES.has(status)) {
    const { data: membership } = await session.supabase
      .from('ecd_admins')
      .select('can_approve_applications')
      .eq('ecd_id', session.ecdId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (!membership?.can_approve_applications) {
      return {
        ok: false,
        error: 'Contact the crèche admin to grant approval rights before making final decisions.',
      }
    }
  }

  const now = new Date().toISOString()
  const payload: Record<string, string | null> = {
    status,
    admin_notes: notes || null,
  }

  if (status !== application.status) {
    payload.reviewed_at = now
    if (FINAL_STATUSES.has(status)) {
      payload.decided_at = now
    }
    if (status === 'approved') {
      payload.offer_made_at = now
      payload.offer_sent_at = now
      payload.withdrawn_at = null
      payload.withdraw_reason = null
    }
    if (status === 'withdrawn') {
      payload.withdrawn_at = now
      payload.withdraw_reason = 'centre_closed'
    }
  }

  const { error: updateError } = await session.supabase
    .from('applications')
    .update(payload)
    .eq('id', applicationId)
    .eq('ecd_id', session.ecdId)

  if (updateError) {
    return { ok: false, error: 'Failed to update application.' }
  }

  const warnings: string[] = []

  if (status !== application.status) {
    const { error: historyError } = await session.supabase.from('application_status_history').insert({
      application_id: applicationId,
      old_status: application.status,
      new_status: status,
      changed_by: session.user.id,
      notes: notes || null,
      ecd_id: session.ecdId,
    })

    if (historyError) {
      warnings.push('history log')
    }

    const parent = Array.isArray(application.parents) ? application.parents[0] ?? null : application.parents
    const child = Array.isArray(application.children) ? application.children[0] ?? null : application.children
    const rawParentProfile = parent?.user_profiles ?? null
    const parentProfile: ApplicationProfile | null = Array.isArray(rawParentProfile)
      ? rawParentProfile[0] ?? null
      : rawParentProfile

    if (parent?.id) {
      const centreNameResult = await session.supabase.from('ecd_centres').select('name').eq('id', session.ecdId).maybeSingle()
      const centreName = centreNameResult.data?.name ?? 'Your crèche'
      const parentName = parentProfile?.full_name ?? 'Parent'
      const childName = [child?.first_name, child?.last_name].filter(Boolean).join(' ').trim() || 'your child'

      const message = buildWarmApplicationUpdateMessage({
        centreName,
        childName,
        parentName,
        applicationNumber: application.application_number,
        status,
      })

      const { error: notificationError } = await session.supabase.from('parent_notifications').insert({
        parent_id: parent.id,
        ecd_id: session.ecdId,
        application_id: applicationId,
        template_key: null,
        title: status === 'approved' ? 'Application approved ðŸŽ‰' : 'A quick update on your application',
        message,
      })

      if (notificationError) {
        warnings.push('parent notification')
      }

      const { subject, html } = applicationStatusEmail({
        parentName,
        childName,
        centreName,
        newStatus: status,
        appUrl: `${getAppOrigin()}/parent/applications/${applicationId}`,
      })

      const recipient = parent.billing_email?.trim() || `user:${parent.id}`
      const { error: emailQueueError } = await session.supabase.from('email_queue').insert({
        recipient,
        subject,
        body: html,
        status: 'pending',
      })

      if (emailQueueError) {
        warnings.push('email queue')
      }
    }
  }

  revalidatePath('/ecd/applications')
  revalidatePath(`/ecd/applications/${applicationId}`)

  return warnings.length > 0
    ? { ok: true, warning: `Application updated, but follow-up actions failed: ${warnings.join(', ')}` }
    : { ok: true }
}


