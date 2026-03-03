'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { buildWarmApplicationUpdateMessage } from '@/lib/communications/templates'
import { applicationStatusEmail } from '@/lib/email/templates'
import {
  REJECTION_REASON_OPTIONS,
  buildParentFacingRejectionReason,
  type RejectionReasonCode,
} from '@/lib/admissions/rejection-reasons'
import { buildSaParentOfferAgreement, type OfferBreakdownItem } from '@/lib/legal/sa-parent-offer-agreement'
import { DEFAULT_OFFER_CONDITIONS, DEFAULT_OFFER_PENALTIES } from './offer-defaults'

const createOfferSchema = z.object({
  applicationId: z.string().uuid(),
  monthlyFeeRand: z.coerce.number().min(0),
  registrationFeeRand: z.coerce.number().min(0).optional().default(0),
  depositFeeRand: z.coerce.number().min(0).optional().default(0),
  transportFeeRand: z.coerce.number().min(0).optional().default(0),
  stationeryFeeRand: z.coerce.number().min(0).optional().default(0),
  otherFeeLabel: z.string().max(80).optional().default(''),
  otherFeeRand: z.coerce.number().min(0).optional().default(0),
  proposedStartDate: z.string().optional().default(''),
  offerExpiresOn: z.string().optional().default(''),
  conditions: z.string().max(4000).optional().default(''),
  penalties: z.string().max(4000).optional().default(''),
})

const rejectSchema = z.object({
  applicationId: z.string().uuid(),
  reasonCode: z.enum(
    REJECTION_REASON_OPTIONS.map((item) => item.code) as [RejectionReasonCode, ...RejectionReasonCode[]]
  ),
  reasonNote: z.string().max(1200).optional().default(''),
})

type ActionResult = {
  ok: boolean
  error?: string
  message?: string
  missingDetails?: string[]
  agreementPreview?: string
}

type AppChild = {
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
}

type AppParentProfile = {
  full_name: string | null
  phone: string | null
}

type AppParent = {
  id: string
  billing_email: string | null
  alt_phone: string | null
  user_profiles: AppParentProfile | AppParentProfile[] | null
}

type AppCentre = {
  name: string | null
}

type ApplicationRecord = {
  id: string
  status: string
  application_number: string
  ecd_id: string
  parent_id: string
  child_id: string
  start_date: string | null
  offer_accepted_at: string | null
  children: AppChild | AppChild[] | null
  parents: AppParent | AppParent[] | null
  ecd_centres: AppCentre | AppCentre[] | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function toCents(randValue: number) {
  return Math.max(0, Math.round(randValue * 100))
}

function getAppOrigin() {
  const direct =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (direct) return direct.replace(/\/+$/, '')

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, '')}`

  return 'http://localhost:3010'
}

function parseDateString(value: string | null | undefined) {
  const raw = value?.trim()
  if (!raw) return null
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function buildBreakdown(input: z.infer<typeof createOfferSchema>) {
  const items: OfferBreakdownItem[] = [
    { key: 'monthly_fee', label: 'Monthly tuition fee', amount_cents: toCents(input.monthlyFeeRand), frequency: 'monthly' },
    { key: 'registration_fee', label: 'Registration fee', amount_cents: toCents(input.registrationFeeRand), frequency: 'once' },
    { key: 'deposit_fee', label: 'Security deposit', amount_cents: toCents(input.depositFeeRand), frequency: 'once' },
    { key: 'transport_fee', label: 'Transport fee', amount_cents: toCents(input.transportFeeRand), frequency: 'monthly' },
    { key: 'stationery_fee', label: 'Learning materials', amount_cents: toCents(input.stationeryFeeRand), frequency: 'once' },
  ]

  if (input.otherFeeLabel.trim() && input.otherFeeRand > 0) {
    items.push({
      key: 'other_fee',
      label: input.otherFeeLabel.trim(),
      amount_cents: toCents(input.otherFeeRand),
      frequency: 'once',
    })
  }

  return items.filter((item) => item.amount_cents > 0)
}

export async function createApplicationOfferAction(input: unknown): Promise<ActionResult> {
  const parsed = createOfferSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid offer payload.' }
  }

  const session = await requireEcdPortalSession({ cached: false })
  const payload = parsed.data

  const { data: applicationRaw } = await session.supabase
    .from('applications')
    .select(
      'id,status,application_number,ecd_id,parent_id,child_id,start_date,offer_accepted_at,children(first_name,last_name,date_of_birth),parents(id,billing_email,alt_phone,user_profiles(full_name,phone)),ecd_centres(name)'
    )
    .eq('id', payload.applicationId)
    .eq('ecd_id', session.ecdId)
    .maybeSingle()

  const application = (applicationRaw as ApplicationRecord | null) ?? null
  if (!application) {
    return { ok: false, error: 'Application not found.' }
  }

  if (application.offer_accepted_at) {
    return { ok: false, error: 'This offer was already accepted. Terms are locked.' }
  }

  if (application.status === 'rejected' || application.status === 'withdrawn') {
    return { ok: false, error: 'Offer cannot be created on a rejected or withdrawn application.' }
  }

  const child = normalizeOne(application.children)
  const parent = normalizeOne(application.parents)
  const parentProfile = normalizeOne(parent?.user_profiles ?? null)
  const centre = normalizeOne(application.ecd_centres)

  const breakdown = buildBreakdown(payload)
  const monthlyFeeCents = toCents(payload.monthlyFeeRand)
  const proposedStartDate = payload.proposedStartDate.trim() || application.start_date || null
  const expiresDate = parseDateString(payload.offerExpiresOn)

  const missingDetails: string[] = []
  if (!child?.first_name?.trim() || !child?.last_name?.trim()) missingDetails.push('Child full name')
  if (!parentProfile?.full_name?.trim()) missingDetails.push('Parent full name')
  if (!(parentProfile?.phone?.trim() || parent?.alt_phone?.trim())) missingDetails.push('Parent phone number')
  if (!parent?.billing_email?.trim()) missingDetails.push('Parent billing email')
  if (!proposedStartDate) missingDetails.push('Proposed start date')
  if (monthlyFeeCents <= 0) missingDetails.push('Monthly fee amount')
  if (breakdown.length === 0) missingDetails.push('At least one priced offer line item')

  if (payload.otherFeeRand > 0 && !payload.otherFeeLabel.trim()) {
    missingDetails.push('Label for other fee item')
  }

  if (missingDetails.length > 0) {
    return {
      ok: false,
      error: 'Please fill in the missing offer details before sending.',
      missingDetails,
    }
  }

  if (payload.offerExpiresOn.trim() && !expiresDate) {
    return { ok: false, error: 'Offer expiry date is invalid.' }
  }

  const now = new Date().toISOString()
  const parentName = parentProfile?.full_name?.trim() || 'Parent'
  const childName = `${child?.first_name?.trim() || 'Child'} ${child?.last_name?.trim() || ''}`.trim()
  const centreName = centre?.name?.trim() || 'Your creche'

  const agreement = buildSaParentOfferAgreement({
    centreName,
    parentName,
    childName,
    applicationNumber: application.application_number,
    startDate: proposedStartDate,
    offerExpiresAt: expiresDate ? expiresDate.toISOString() : null,
    breakdown,
    customConditions: payload.conditions || DEFAULT_OFFER_CONDITIONS,
    customPenalties: payload.penalties || DEFAULT_OFFER_PENALTIES,
  })

  const { error: updateError } = await session.supabase
    .from('applications')
    .update({
      status: 'approved',
      reviewed_at: now,
      decided_at: now,
      offer_made_at: now,
      offer_sent_at: now,
      offer_sent_by: session.user.id,
      offer_breakdown: breakdown,
      offer_conditions: (payload.conditions || DEFAULT_OFFER_CONDITIONS).trim(),
      offer_penalties: (payload.penalties || DEFAULT_OFFER_PENALTIES).trim(),
      offer_legal_agreement: agreement,
      offer_legal_version: 'sa-parent-v1',
      offer_expires_at: expiresDate ? expiresDate.toISOString() : null,
      monthly_fee_cents: monthlyFeeCents,
      start_date: proposedStartDate,
      withdrawn_at: null,
      withdraw_reason: null,
      rejected_at: null,
      rejection_reason_code: null,
      rejection_reason_note: null,
    })
    .eq('id', application.id)
    .eq('ecd_id', session.ecdId)

  if (updateError) {
    return { ok: false, error: updateError.message || 'Failed to create offer.' }
  }

  if (application.status !== 'approved') {
    await session.supabase.from('application_status_history').insert({
      application_id: application.id,
      old_status: application.status,
      new_status: 'approved',
      changed_by: session.user.id,
      notes: 'Offer created with pricing breakdown and agreement terms.',
      ecd_id: session.ecdId,
    })
  }

  if (parent?.id) {
    const message = buildWarmApplicationUpdateMessage({
      centreName,
      childName,
      parentName,
      applicationNumber: application.application_number,
      status: 'approved',
    })

    await session.supabase.from('parent_notifications').insert({
      parent_id: parent.id,
      ecd_id: session.ecdId,
      application_id: application.id,
      template_key: null,
      title: 'Offer ready to review',
      message,
    })

    const { subject, html } = applicationStatusEmail({
      parentName,
      childName,
      centreName,
      newStatus: 'approved',
      appUrl: `${getAppOrigin()}/parent/applications/${application.id}`,
    })

    await session.supabase.from('email_queue').insert({
      recipient: parent.billing_email?.trim() || `user:${parent.id}`,
      subject,
      body: `${html}<p>Offer terms are now available in your Application Journey.</p>`,
      status: 'pending',
    })
  }

  revalidatePath('/ecd/applications')
  revalidatePath(`/ecd/applications/${application.id}`)
  revalidatePath(`/parent/applications/${application.id}`)
  revalidatePath('/parent/applications')

  return { ok: true, message: 'Offer sent to parent.', agreementPreview: agreement }
}

export async function rejectApplicationWithReasonAction(input: unknown): Promise<ActionResult> {
  const parsed = rejectSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid rejection payload.' }
  }

  const session = await requireEcdPortalSession({ cached: false })
  const payload = parsed.data
  const reasonNote = payload.reasonNote.trim()

  if (payload.reasonCode === 'other' && !reasonNote) {
    return { ok: false, error: 'Please add a short note when choosing Other.' }
  }

  const { data: applicationRaw } = await session.supabase
    .from('applications')
    .select(
      'id,status,application_number,ecd_id,parent_id,child_id,offer_accepted_at,children(first_name,last_name),parents(id,billing_email,alt_phone,user_profiles(full_name,phone)),ecd_centres(name)'
    )
    .eq('id', payload.applicationId)
    .eq('ecd_id', session.ecdId)
    .maybeSingle()

  const application = (applicationRaw as ApplicationRecord | null) ?? null
  if (!application) {
    return { ok: false, error: 'Application not found.' }
  }

  if (application.offer_accepted_at) {
    return { ok: false, error: 'This offer has already been accepted and cannot be rejected.' }
  }

  if (application.status === 'enrolled') {
    return { ok: false, error: 'Enrolled applications cannot be rejected.' }
  }

  const child = normalizeOne(application.children)
  const parent = normalizeOne(application.parents)
  const parentProfile = normalizeOne(parent?.user_profiles ?? null)
  const centre = normalizeOne(application.ecd_centres)
  const now = new Date().toISOString()

  const { error: updateError } = await session.supabase
    .from('applications')
    .update({
      status: 'rejected',
      reviewed_at: now,
      decided_at: now,
      rejected_at: now,
      rejection_reason_code: payload.reasonCode,
      rejection_reason_note: reasonNote || null,
      offer_expires_at: null,
    })
    .eq('id', application.id)
    .eq('ecd_id', session.ecdId)

  if (updateError) {
    return { ok: false, error: updateError.message || 'Failed to reject application.' }
  }

  const rejectionReason = buildParentFacingRejectionReason({
    code: payload.reasonCode,
    note: reasonNote || null,
  })

  await session.supabase.from('application_status_history').insert({
    application_id: application.id,
    old_status: application.status,
    new_status: 'rejected',
    changed_by: session.user.id,
    notes: `Reason: ${rejectionReason}`,
    ecd_id: session.ecdId,
  })

  const parentName = parentProfile?.full_name?.trim() || 'Parent'
  const childName = `${child?.first_name?.trim() || 'Child'} ${child?.last_name?.trim() || ''}`.trim()
  const centreName = centre?.name?.trim() || 'Your creche'

  if (parent?.id) {
    await session.supabase.from('parent_notifications').insert({
      parent_id: parent.id,
      ecd_id: session.ecdId,
      application_id: application.id,
      template_key: null,
      title: 'Application update',
      message: `Hi ${parentName}, ${childName}'s application was not successful this time. ${rejectionReason}`,
    })

    await session.supabase.from('email_queue').insert({
      recipient: parent.billing_email?.trim() || `user:${parent.id}`,
      subject: `${centreName}: application update`,
      body: `<p>Hi ${parentName},</p><p>${childName}'s application was not successful this time.</p><p><strong>Reason:</strong> ${rejectionReason}</p><p>You can view details in your Application Journey.</p><p><a href="${getAppOrigin()}/parent/applications/${application.id}">Open application</a></p>`,
      status: 'pending',
    })
  }

  revalidatePath('/ecd/applications')
  revalidatePath(`/ecd/applications/${application.id}`)
  revalidatePath(`/parent/applications/${application.id}`)
  revalidatePath('/parent/applications')

  return { ok: true, message: 'Application rejected with parent-visible reason.' }
}
