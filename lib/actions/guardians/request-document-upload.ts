'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { toApplicationDocumentLabels } from '@/lib/admissions/application-documents'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  sendEcdInAppAndEmailNotification,
  sendParentInAppAndWhatsappNotification,
} from '@/lib/notifications/multi-channel'

const requestDocumentUploadSchema = z.object({
  childId: z.string().uuid(),
  requestedForUserId: z.string().uuid(),
  documentCodes: z.array(z.string().min(1)).min(1),
  customMessage: z.string().max(1000).optional().nullable(),
})

type RequestDocumentUploadResult = {
  ok: boolean
  error?: string
  message?: string
  whatsappHref?: string
}

type ChildRow = {
  id: string
  parent_id: string
  ecd_id: string | null
  first_name: string | null
  last_name: string | null
}

type GuardianRow = {
  id: string
  parent_id: string
  linked_user_id: string | null
  full_name: string | null
  phone: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  phone: string | null
}

function normalizeText(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function requestCoParentDocumentUploadAction(
  input: unknown
): Promise<RequestDocumentUploadResult> {
  const parsed = requestDocumentUploadSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid document request payload.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Please sign in again.' }

  const payload = parsed.data
  if (payload.requestedForUserId === user.id) {
    return { ok: false, error: 'Select another linked parent.' }
  }

  const admin = createAdminClient()
  const { data: childRaw } = await admin
    .from('children')
    .select('id,parent_id,ecd_id,first_name,last_name')
    .eq('id', payload.childId)
    .maybeSingle()

  const child = (childRaw as ChildRow | null) ?? null
  if (!child) return { ok: false, error: 'Child profile not found.' }

  const { data: guardianRowsRaw } = await admin
    .from('guardians')
    .select('id,parent_id,linked_user_id,full_name,phone')
    .eq('child_id', child.id)
    .eq('parent_id', child.parent_id)

  const guardianRows = (guardianRowsRaw ?? []) as GuardianRow[]
  const linkedUserIds = guardianRows
    .map((guardian) => guardian.linked_user_id)
    .filter((value): value is string => Boolean(value))
  const linkedUsers = new Set<string>([child.parent_id, ...linkedUserIds])

  if (!linkedUsers.has(user.id)) {
    return { ok: false, error: 'You are not linked to this child profile.' }
  }
  if (!linkedUsers.has(payload.requestedForUserId)) {
    return { ok: false, error: 'The selected parent is not linked to this child profile.' }
  }

  const { data: applicationRaw } = await admin
    .from('applications')
    .select('id,ecd_id')
    .eq('child_id', child.id)
    .in('status', ['partial', 'draft', 'submitted', 'in_review', 'approved', 'enrolled', 'waitlisted'])
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ecdId = child.ecd_id ?? applicationRaw?.ecd_id ?? null
  if (!ecdId) {
    return {
      ok: false,
      error: 'This child is not linked to a creche yet. Submit an application first, then request documents.',
    }
  }

  const applicationId = applicationRaw?.id ?? null
  const profileIds = Array.from(linkedUsers)
  const { data: profilesRaw } = await admin
    .from('user_profiles')
    .select('id,full_name,phone')
    .in('id', profileIds)
  const profiles = (profilesRaw ?? []) as ProfileRow[]
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))

  const byGuardian = guardianRows.find((guardian) => guardian.linked_user_id === user.id) ?? null
  const forGuardian = guardianRows.find((guardian) => guardian.linked_user_id === payload.requestedForUserId) ?? null
  const normalizedCodes = Array.from(
    new Set(payload.documentCodes.map((code) => String(code).trim()).filter(Boolean))
  )
  if (normalizedCodes.length === 0) return { ok: false, error: 'Select at least one document.' }

  const childName = [child.first_name, child.last_name].filter(Boolean).join(' ').trim() || 'the child'
  const requesterLabel =
    normalizeText(profileById.get(user.id)?.full_name) ||
    normalizeText(byGuardian?.full_name) ||
    'Linked parent'
  const recipientLabel =
    normalizeText(profileById.get(payload.requestedForUserId)?.full_name) ||
    normalizeText(forGuardian?.full_name) ||
    'Linked parent'
  const requestedLabels = toApplicationDocumentLabels(normalizedCodes)

  const defaultMessage = `Hi ${recipientLabel}, ${requesterLabel} asked for ${requestedLabels.join(', ')} for ${childName}.`
  const message = normalizeText(payload.customMessage) || defaultMessage

  const { error: insertError } = await admin.from('child_document_requests').insert({
    ecd_id: ecdId,
    application_id: applicationId,
    child_id: child.id,
    requested_by_user_id: user.id,
    requested_for_user_id: payload.requestedForUserId,
    requested_by_guardian_id: byGuardian?.id ?? null,
    requested_for_guardian_id: forGuardian?.id ?? null,
    requested_by_label: requesterLabel,
    requested_for_label: recipientLabel,
    document_codes: normalizedCodes,
    message,
    status: 'requested',
  })
  if (insertError) {
    return { ok: false, error: insertError.message || 'Could not save this document request.' }
  }

  const { data: centre } = await admin
    .from('ecd_centres')
    .select('name,email')
    .eq('id', ecdId)
    .maybeSingle()
  const centreName = centre?.name?.trim() || 'your creche'
  const notificationMessage = `${message}\n\nFrom ${centreName}. Open your profile documents to upload now.`

  const recipientPhone = normalizeText(profileById.get(payload.requestedForUserId)?.phone) || normalizeText(forGuardian?.phone)
  const whatsappEventKey = `document_request_from_coparent:${applicationId ?? child.id}:${user.id}:${payload.requestedForUserId}:${Date.now()}`
  const parentNotification = await sendParentInAppAndWhatsappNotification(admin as any, {
    parent_id: payload.requestedForUserId,
    ecd_id: ecdId,
    application_id: applicationId,
    template_key: 'document_request',
    title: `Document request for ${childName}`,
    message: notificationMessage,
    parent_phone: recipientPhone,
    recipient_name: recipientLabel,
    whatsapp_event_type: 'document_request_from_coparent',
    whatsapp_event_key: whatsappEventKey,
    whatsapp_metadata: {
      requested_by_user_id: user.id,
      requested_for_user_id: payload.requestedForUserId,
      child_name: childName,
      document_codes: normalizedCodes,
    },
    is_read: false,
  })
  if (!parentNotification.ok) {
    return { ok: false, error: parentNotification.error || 'Request saved, but notification failed.' }
  }

  await sendParentInAppAndWhatsappNotification(admin as any, {
    parent_id: user.id,
    ecd_id: ecdId,
    application_id: applicationId,
    template_key: 'document_request',
    title: `Document request sent to ${recipientLabel}`,
    message: `You asked ${recipientLabel} to upload: ${requestedLabels.join(', ')} for ${childName}.`,
    parent_phone: normalizeText(profileById.get(user.id)?.phone),
    is_read: false,
  })

  await sendEcdInAppAndEmailNotification(admin as any, {
    ecd_id: ecdId,
    application_id: applicationId,
    title: 'Co-parent document request',
    message: `${requesterLabel} requested documents from ${recipientLabel} for ${childName}.`,
    metadata: {
      kind: 'co_parent_document_request',
      child_id: child.id,
      requested_by_user_id: user.id,
      requested_for_user_id: payload.requestedForUserId,
      document_codes: normalizedCodes,
    },
    email_recipient: centre?.email ?? null,
    email_subject: `[CentreConnect] Document request for ${childName}`,
    email_body: `<p>${requesterLabel} requested documents from ${recipientLabel} for <strong>${childName}</strong>.</p><p>Open applications to monitor upload progress.</p>`,
    is_read: false,
  })

  revalidatePath('/parent/profile/guardians')
  revalidatePath('/parent/profile/documents')

  return {
    ok: true,
    message: `Request sent to ${recipientLabel}.`,
    whatsappHref: parentNotification.whatsappHref ?? undefined,
  }
}
