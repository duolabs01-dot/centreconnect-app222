'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { toApplicationDocumentLabels } from '@/lib/admissions/application-documents'
import {
  sendEcdInAppAndEmailNotification,
  sendParentInAppAndWhatsappNotification,
} from '@/lib/notifications/multi-channel'

const requestDocumentSchema = z.object({
  applicationId: z.string().uuid(),
  childId: z.string().uuid(),
  requestedByUserId: z.string().uuid(),
  requestedForUserId: z.string().uuid(),
  requestedByGuardianId: z.string().uuid().optional().nullable(),
  requestedForGuardianId: z.string().uuid().optional().nullable(),
  documentCodes: z.array(z.string().min(1)).min(1),
  customMessage: z.string().max(1000).optional().nullable(),
})

type RequestDocumentResult = {
  ok: boolean
  error?: string
  message?: string
  whatsappHref?: string
}

type GuardianRow = {
  id: string
  linked_user_id: string | null
  full_name: string | null
  relationship: string | null
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

export async function requestLinkedParentDocumentsAction(input: unknown): Promise<RequestDocumentResult> {
  const parsed = requestDocumentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid document request payload.' }

  const session = await requireEcdPortalSession({ cached: false })
  const payload = parsed.data

  if (payload.requestedByUserId === payload.requestedForUserId) {
    return { ok: false, error: 'Choose two different linked users for this request.' }
  }

  const { data: application } = await session.supabase
    .from('applications')
    .select('id,ecd_id,parent_id,child_id,application_number,children(first_name,last_name)')
    .eq('id', payload.applicationId)
    .eq('ecd_id', session.ecdId)
    .maybeSingle()

  if (!application) {
    return { ok: false, error: 'Application not found for this centre.' }
  }

  if (application.child_id !== payload.childId) {
    return { ok: false, error: 'Child and application link mismatch. Refresh and try again.' }
  }

  const childRecord = Array.isArray(application.children) ? application.children[0] : application.children
  const childName = [childRecord?.first_name, childRecord?.last_name].filter(Boolean).join(' ').trim() || 'the child'

  const { data: guardianRows, error: guardiansError } = await session.supabase
    .from('guardians')
    .select('id,linked_user_id,full_name,relationship,phone')
    .eq('child_id', application.child_id)
    .eq('parent_id', application.parent_id)

  if (guardiansError) {
    return { ok: false, error: 'Could not validate linked co-parent records.' }
  }

  const guardians = (guardianRows ?? []) as GuardianRow[]
  const allowedUsers = new Set<string>([
    application.parent_id,
    ...guardians
      .map((guardian) => guardian.linked_user_id)
      .filter((value): value is string => Boolean(value)),
  ])

  if (!allowedUsers.has(payload.requestedByUserId) || !allowedUsers.has(payload.requestedForUserId)) {
    return { ok: false, error: 'One or both selected users are not linked to this child profile.' }
  }

  const guardianById = new Map(guardians.map((guardian) => [guardian.id, guardian]))
  if (payload.requestedByGuardianId && !guardianById.has(payload.requestedByGuardianId)) {
    return { ok: false, error: 'The selected requester contact is not linked to this child.' }
  }
  if (payload.requestedForGuardianId && !guardianById.has(payload.requestedForGuardianId)) {
    return { ok: false, error: 'The selected recipient contact is not linked to this child.' }
  }

  const profileIds = Array.from(allowedUsers)
  const { data: profileRows } = await session.supabase
    .from('user_profiles')
    .select('id,full_name,phone')
    .in('id', profileIds)

  const profiles = (profileRows ?? []) as ProfileRow[]
  const profileNameById = new Map(profiles.map((profile) => [profile.id, normalizeText(profile.full_name)]))
  const profilePhoneById = new Map(profiles.map((profile) => [profile.id, normalizeText(profile.phone)]))

  const requesterLabel =
    normalizeText(profileNameById.get(payload.requestedByUserId)) ||
    normalizeText(guardianById.get(payload.requestedByGuardianId ?? '')?.full_name) ||
    'Linked parent'

  const recipientLabel =
    normalizeText(profileNameById.get(payload.requestedForUserId)) ||
    normalizeText(guardianById.get(payload.requestedForGuardianId ?? '')?.full_name) ||
    'Linked parent'

  const normalizedCodes = Array.from(
    new Set(payload.documentCodes.map((value) => value.trim()).filter((value) => value.length > 0))
  )
  if (normalizedCodes.length === 0) {
    return { ok: false, error: 'Select at least one document to request.' }
  }

  const labels = toApplicationDocumentLabels(normalizedCodes)
  const centreResult = await session.supabase
    .from('ecd_centres')
    .select('name,email')
    .eq('id', session.ecdId)
    .maybeSingle()
  const centreName = centreResult.data?.name ?? 'your creche'

  const defaultMessage = `Hi ${recipientLabel}, ${requesterLabel} asked you to upload ${labels.join(', ')} for ${childName}.`
  const composedMessage = normalizeText(payload.customMessage) || defaultMessage

  const { error: insertRequestError } = await session.supabase.from('child_document_requests').insert({
    ecd_id: session.ecdId,
    application_id: application.id,
    child_id: application.child_id,
    requested_by_user_id: payload.requestedByUserId,
    requested_for_user_id: payload.requestedForUserId,
    requested_by_guardian_id: payload.requestedByGuardianId || null,
    requested_for_guardian_id: payload.requestedForGuardianId || null,
    requested_by_label: requesterLabel,
    requested_for_label: recipientLabel,
    document_codes: normalizedCodes,
    message: composedMessage,
    status: 'requested',
  })

  if (insertRequestError) {
    return {
      ok: false,
      error: insertRequestError.message.includes('child_document_requests')
        ? 'Document request tracking is not ready yet. Run the latest Supabase migration and retry.'
        : insertRequestError.message || 'Failed to save this document request.',
    }
  }

  const notificationMessage = `${composedMessage}\n\nFrom ${centreName}. Open your profile documents to upload now.`
  const recipientPhone =
    profilePhoneById.get(payload.requestedForUserId) ||
    normalizeText(guardianById.get(payload.requestedForGuardianId ?? '')?.phone) ||
    null
  const whatsappEventKey = `document_request_from_coparent:${application.id}:${payload.requestedByUserId}:${payload.requestedForUserId}:${Date.now()}`
  const parentNotification = await sendParentInAppAndWhatsappNotification(createAdminClient(), {
    parent_id: payload.requestedForUserId,
    ecd_id: session.ecdId,
    application_id: application.id,
    template_key: 'document_request',
    title: `Document request for ${childName}`,
    message: notificationMessage,
    parent_phone: recipientPhone,
    recipient_name: recipientLabel,
    whatsapp_event_type: 'document_request_from_coparent',
    whatsapp_event_key: whatsappEventKey,
    whatsapp_metadata: {
      requested_by_user_id: payload.requestedByUserId,
      requested_for_user_id: payload.requestedForUserId,
      child_name: childName,
      document_codes: normalizedCodes,
    },
    is_read: false,
  })
  if (!parentNotification.ok) {
    return { ok: false, error: parentNotification.error || 'Document request saved, but notification failed.' }
  }

  await sendEcdInAppAndEmailNotification(createAdminClient(), {
    ecd_id: session.ecdId,
    application_id: application.id,
    title: 'Linked parent request sent',
    message: `${requesterLabel} requested documents from ${recipientLabel} for ${childName}.`,
    metadata: {
      kind: 'linked_parent_document_request',
      requested_by_user_id: payload.requestedByUserId,
      requested_for_user_id: payload.requestedForUserId,
      document_codes: normalizedCodes,
    },
    email_recipient: centreResult.data?.email ?? null,
    email_subject: `[CentreConnect] Linked parent document request for ${childName}`,
    email_body: `<p>${requesterLabel} requested documents from ${recipientLabel} for <strong>${childName}</strong>.</p><p>Open applications to follow up.</p>`,
    is_read: false,
  })

  revalidatePath('/ecd/applications')
  revalidatePath(`/ecd/applications/${application.id}`)

  return {
    ok: true,
    message: `Document request sent to ${recipientLabel}.`,
    whatsappHref: parentNotification.whatsappHref ?? undefined,
  }
}
