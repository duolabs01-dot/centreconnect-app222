'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { buildWarmApplicationUpdateMessage } from '@/lib/communications/templates'
import { applicationStatusEmail } from '@/lib/email/templates'
import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateApplicationIntakeReadiness } from '@/lib/admissions/intake-readiness'
import { resolveAgeGroupFeeForDateOfBirth } from '@/lib/pricing/age-group-pricing'
import {
  sendEcdInAppAndEmailNotification,
  sendParentInAppAndWhatsappNotification,
} from '@/lib/notifications/multi-channel'

const statusUpdateSchema = z.object({
  applicationId: z.string().uuid(),
  status: z.enum(['draft', 'partial', 'submitted', 'in_review', 'approved', 'enrolled', 'waitlisted', 'rejected', 'withdrawn']),
  notes: z.string().max(2000).optional(),
})

const FINAL_STATUSES = new Set(['approved', 'waitlisted', 'rejected', 'withdrawn'])
const SUPERVISOR_BLOCKED_FINAL_STATUSES = new Set(['approved', 'enrolled', 'rejected'])

type UpdateStatusResult = {
  ok: boolean
  error?: string
  warning?: string
}

type ApplicationChild = {
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
  gender: string | null
}
type ApplicationProfile = { full_name: string | null; phone: string | null }
type ApplicationParent = {
  id: string
  billing_email: string | null
  alt_phone: string | null
  guardian_relationship: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  id_verification_status: string | null
  user_profiles: ApplicationProfile | ApplicationProfile[] | null
}
type ApplicationRecord = {
  id: string
  status: string
  ecd_id: string
  parent_id: string
  child_id: string
  application_number: string
  monthly_fee_cents: number | null
  offer_accepted_at: string | null
  children: ApplicationChild | ApplicationChild[] | null
  parents: ApplicationParent | ApplicationParent[] | null
}

type BirthdaySyncClient = {
  rpc: (
    fn: string,
    params?: Record<string, unknown>
  ) => PromiseLike<{ error: { message?: string } | null }>
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

async function syncBirthdayEventsForEnrolledChild(args: {
  supabase: BirthdaySyncClient
  ecdId: string
  childId: string
  firstName: string
  lastName: string
  dateOfBirth?: string | null
}) {
  if (!args.dateOfBirth) return
  const { error } = await args.supabase.rpc('ensure_child_birthday_events', {
    p_ecd_id: args.ecdId,
    p_child_id: args.childId,
    p_first_name: args.firstName,
    p_last_name: args.lastName,
    p_date_of_birth: args.dateOfBirth,
  })
  if (
    error &&
    !String(error.message ?? '').toLowerCase().includes('ensure_child_birthday_events')
  ) {
    throw new Error(error.message || 'Failed to sync birthday events')
  }
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
      'id,status,ecd_id,parent_id,child_id,application_number,monthly_fee_cents,admin_notes,offer_accepted_at,offer_made_at,offer_sent_at,enrolled_at,children(first_name,last_name,date_of_birth,gender),parents(id,billing_email,alt_phone,guardian_relationship,emergency_contact_name,emergency_contact_phone,id_verification_status,user_profiles(full_name,phone))'
    )
    .eq('id', applicationId)
    .eq('ecd_id', session.ecdId)
    .maybeSingle()

  const application = (applicationRaw as ApplicationRecord | null) ?? null
  if (!application) {
    return { ok: false, error: 'Application not found.' }
  }

  if (status === 'approved' && application.status !== 'approved') {
    return {
      ok: false,
      error: 'Use Create Offer to approve with pricing breakdown and agreement terms.',
    }
  }

  if (status === 'rejected' && application.status !== 'rejected') {
    return {
      ok: false,
      error: 'Use Reject With Reason so parents receive a structured rejection reason.',
    }
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

  if (status === 'approved') {
    const { data: centrePolicy } = await session.supabase
      .from('ecd_centres')
      .select('allow_incomplete_applications')
      .eq('id', session.ecdId)
      .maybeSingle()
    const allowIncompleteApplications = centrePolicy?.allow_incomplete_applications ?? true

    if (!allowIncompleteApplications) {
      const parent = normalizeOne(application.parents)
      const parentProfile = normalizeOne(parent?.user_profiles ?? null)
      const child = normalizeOne(application.children)

      let docTypes: string[] = []
      try {
        const admin = createAdminClient()
        if (parent?.id) {
          const { data: docsRows } = await admin
            .from('parent_documents')
            .select('doc_type')
            .eq('parent_id', parent.id)
            .limit(100)
          docTypes = (docsRows ?? [])
            .map((row) => row.doc_type)
            .filter((docType): docType is string => typeof docType === 'string' && docType.trim().length > 0)
        }
      } catch {
        docTypes = []
      }

      const readiness = evaluateApplicationIntakeReadiness({
        parent: {
          fullName: parentProfile?.full_name ?? null,
          phone: parentProfile?.phone ?? parent?.alt_phone ?? null,
          guardianRelationship: parent?.guardian_relationship ?? null,
          emergencyContactName: parent?.emergency_contact_name ?? null,
          emergencyContactPhone: parent?.emergency_contact_phone ?? null,
          idVerificationStatus: parent?.id_verification_status ?? null,
        },
        child: {
          firstName: child?.first_name ?? null,
          lastName: child?.last_name ?? null,
          dateOfBirth: child?.date_of_birth ?? null,
          gender: child?.gender ?? null,
        },
        docTypes,
      })

      if (!readiness.ready) {
        const missing = readiness.missing.slice(0, 4).join(', ')
        return {
          ok: false,
          error: missing
            ? `This centre currently requires complete applications before approval. Missing: ${missing}.`
            : 'This centre currently requires complete applications before approval.',
        }
      }
    }
  }

  const now = new Date().toISOString()
  const payload: Record<string, string | number | null> = {
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

      if (!application.monthly_fee_cents || application.monthly_fee_cents <= 0) {
        const child = normalizeOne(application.children)
        const { data: centrePricing } = await session.supabase
          .from('ecd_centres')
          .select('age_group_pricing,monthly_fee_min')
          .eq('id', session.ecdId)
          .maybeSingle()
        const resolvedFee = resolveAgeGroupFeeForDateOfBirth({
          dateOfBirth: child?.date_of_birth ?? null,
          ageGroupPricing: centrePricing?.age_group_pricing,
          fallbackMonthlyFeeRand: centrePricing?.monthly_fee_min ?? null,
        })
        if (resolvedFee?.monthlyFeeCents && resolvedFee.monthlyFeeCents > 0) {
          payload.monthly_fee_cents = resolvedFee.monthlyFeeCents
          if (!notes) {
            payload.fee_notes = `Auto-set from age pricing (${resolvedFee.ageGroupLabel})`
          }
        }
      }
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
      const centreResult = await session.supabase
        .from('ecd_centres')
        .select('name,email')
        .eq('id', session.ecdId)
        .maybeSingle()
      const centreName = centreResult.data?.name ?? 'Your crèche'
      const centreEmail = centreResult.data?.email ?? null
      const parentName = parentProfile?.full_name ?? 'Parent'
      const childName = [child?.first_name, child?.last_name].filter(Boolean).join(' ').trim() || 'your child'

      const message = buildWarmApplicationUpdateMessage({
        centreName,
        childName,
        parentName,
        applicationNumber: application.application_number,
        status,
      })

      const parentNotification = await sendParentInAppAndWhatsappNotification(session.supabase as any, {
        parent_id: parent.id,
        ecd_id: session.ecdId,
        application_id: applicationId,
        template_key: null,
        title: status === 'approved' ? 'Application approved' : 'A quick update on your application',
        message,
        parent_phone: parentProfile?.phone ?? parent?.alt_phone ?? null,
        recipient_name: parentName,
        whatsapp_event_type: 'application_status_change',
        whatsapp_event_key: `application_status_change:${applicationId}:${status}`,
        whatsapp_metadata: {
          old_status: application.status,
          new_status: status,
          child_name: childName,
          application_number: application.application_number,
        },
        is_read: false,
      })

      if (!parentNotification.ok) {
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

      const ecdNotification = await sendEcdInAppAndEmailNotification(session.supabase as any, {
        ecd_id: session.ecdId,
        application_id: applicationId,
        title: 'Application status changed',
        message: `${childName} moved from ${application.status} to ${status}.`,
        metadata: {
          kind: 'application_status_changed',
          old_status: application.status,
          new_status: status,
          child_name: childName,
          changed_by: session.user.id,
        },
        email_recipient: centreEmail,
        email_subject: `[CentreConnect] ${childName} status updated`,
        email_body: `<p>${childName} moved from <strong>${application.status}</strong> to <strong>${status}</strong>.</p><p>Open the applications board to review details.</p>`,
      })

      if (!ecdNotification.ok) {
        warnings.push('ecd notification')
      }
    }
  }

  if (status === 'enrolled') {
    const child = normalizeOne(application.children)
    try {
      await syncBirthdayEventsForEnrolledChild({
        supabase: session.supabase,
        ecdId: session.ecdId,
        childId: application.child_id,
        firstName: child?.first_name ?? 'Child',
        lastName: child?.last_name ?? '',
        dateOfBirth: child?.date_of_birth ?? null,
      })
    } catch {
      // Enrollment status should not fail if birthday sync is temporarily unavailable.
    }
  }

  revalidatePath('/ecd/applications')
  revalidatePath(`/ecd/applications/${applicationId}`)

  return warnings.length > 0
    ? { ok: true, warning: `Application updated, but follow-up actions failed: ${warnings.join(', ')}` }
    : { ok: true }
}


