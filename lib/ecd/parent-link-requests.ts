import 'server-only'

import { createHash, randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildAuthCallbackRedirect, generateMagicFirstAccessLink, normalizeAppUrl } from '@/lib/auth/onboarding-links'
import { deliverTransactionalEmail } from '@/lib/email/delivery'
import { renderBaseEmailLayout } from '@/lib/email/email-layout'
import { enqueueParentWelcomeSequence } from '@/lib/notifications/parent-welcome-sequence'
import { syncAuthUserMetadataRole } from '@/lib/auth/provision-role'

export type ParentLinkRequestStatus = 'pending' | 'opened' | 'accepted' | 'expired' | 'cancelled'
export type ParentLinkEmailMode = 'link_profile' | 'invite'

export type ParentLinkRequestSummary = {
  id: string
  childId: string
  ecdId: string
  parentEmail: string
  parentPhone: string | null
  parentName: string | null
  status: ParentLinkRequestStatus
  emailMode: ParentLinkEmailMode
  requestedAt: string
  sentAt: string | null
  openedAt: string | null
  acceptedAt: string | null
  linkedUserId: string | null
}

type ChildRow = {
  id: string
  ecd_id: string
  parent_id: string | null
  first_name: string | null
  last_name: string | null
  guardian_contacts: unknown
  emergency_contacts: unknown
}

type CreateParentLinkRequestInput = {
  childId: string
  ecdId: string
  requestedByUserId: string
  parentEmail: string
  parentPhone?: string | null
  parentName?: string | null
}

type CreateParentLinkRequestResult = {
  ok: boolean
  message: string
  request?: ParentLinkRequestSummary
  whatsappHref?: string | null
  accessLink?: string | null
  existingParentDetected?: boolean
}

type AcceptParentLinkRequestResult = {
  ok: boolean
  message: string
  childId?: string
  ecdId?: string
  roleChanged?: boolean
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeText(value: string | null | undefined) {
  const next = String(value ?? '').trim()
  return next.length > 0 ? next : null
}

function normalizeEmail(value: string | null | undefined) {
  return normalizeText(value)?.toLowerCase() ?? null
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function normalizePhoneForWhatsapp(rawPhone: string | null | undefined) {
  const digits = String(rawPhone ?? '').replace(/[^\d+]/g, '')
  const withoutPlus = digits.replace(/\+/g, '')
  if (!withoutPlus) return null
  if (withoutPlus.startsWith('0')) return `27${withoutPlus.slice(1)}`
  if (withoutPlus.startsWith('27')) return withoutPlus
  return withoutPlus
}

function toPlainTextEmail(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<a[^>]*href=['"]([^'"]+)['"][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizeGuardianContacts(raw: unknown) {
  if (!Array.isArray(raw)) return [] as Array<Record<string, unknown>>
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      return { ...(entry as Record<string, unknown>) }
    })
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
}

function normalizeEmergencyContacts(raw: unknown) {
  if (!Array.isArray(raw)) return [] as Array<Record<string, unknown>>
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      return { ...(entry as Record<string, unknown>) }
    })
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
}

async function findExistingAuthUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  
  const magicResult = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
    options: { redirectTo: '/' },
  })
  
  if (!magicResult.error && magicResult.data?.user?.id) {
    return magicResult.data.user.id
  }

  if (magicResult.error?.message && !magicResult.error.message.includes('user not found')) {
    console.warn('[findExistingAuthUserIdByEmail] generateLink error:', magicResult.error.message)
  }

  const usersResult = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (!usersResult.error) {
    const match = usersResult.data.users.find(
      (user) => String(user.email ?? '').trim().toLowerCase() === normalizedEmail
    )
    if (match?.id) return match.id
  }

  return null
}

async function loadChild(admin: ReturnType<typeof createAdminClient>, input: { childId: string; ecdId: string }) {
  const { data, error } = await admin
    .from('children')
    .select('id,ecd_id,parent_id,first_name,last_name,guardian_contacts,emergency_contacts')
    .eq('id', input.childId)
    .eq('ecd_id', input.ecdId)
    .maybeSingle()

  if (error || !data) return null
  return data as ChildRow
}

async function syncChildGuardianSnapshot(input: {
  admin: ReturnType<typeof createAdminClient>
  child: ChildRow
  parentName: string | null
  parentPhone: string | null
  parentEmail: string | null
}) {
  const guardianContacts = normalizeGuardianContacts(input.child.guardian_contacts)
  const emergencyContacts = normalizeEmergencyContacts(input.child.emergency_contacts)

  const primaryIndex = guardianContacts.findIndex((entry) => {
    const role = normalizeText(typeof entry.role === 'string' ? entry.role : null)
    const relationship = normalizeText(typeof entry.relationship === 'string' ? entry.relationship : null)
    return role === 'primary_guardian' || relationship === 'parent'
  })

  const nextPrimary = {
    full_name: input.parentName ?? (primaryIndex >= 0 ? normalizeText(String(guardianContacts[primaryIndex].full_name ?? '')) : null),
    relationship: 'parent',
    phone: input.parentPhone ?? (primaryIndex >= 0 ? normalizeText(String(guardianContacts[primaryIndex].phone ?? '')) : null),
    email: input.parentEmail ?? (primaryIndex >= 0 ? normalizeText(String(guardianContacts[primaryIndex].email ?? '')) : null),
    can_pickup: primaryIndex >= 0 && typeof guardianContacts[primaryIndex].can_pickup === 'boolean'
      ? guardianContacts[primaryIndex].can_pickup
      : true,
    role: 'primary_guardian',
  }

  if (primaryIndex >= 0) {
    guardianContacts[primaryIndex] = { ...guardianContacts[primaryIndex], ...nextPrimary }
  } else {
    guardianContacts.unshift(nextPrimary)
  }

  const hasEmergencyPhone = emergencyContacts.some((entry) => normalizeText(String(entry.phone ?? '')))
  if (!hasEmergencyPhone && nextPrimary.phone) {
    emergencyContacts.unshift({
      full_name: nextPrimary.full_name,
      relationship: 'primary_guardian',
      phone: nextPrimary.phone,
      notes: 'Added during family linking',
    })
  }

  await input.admin
    .from('children')
    .update({
      guardian_contacts: guardianContacts,
      emergency_contacts: emergencyContacts,
      emergency_contact_name: nextPrimary.full_name,
      emergency_contact_phone: nextPrimary.phone,
      onboarding_link_sent_at: nowIso(),
    })
    .eq('id', input.child.id)
    .eq('ecd_id', input.child.ecd_id)
}

function buildWhatsappHref(input: {
  phone: string | null
  parentName: string | null
  childName: string
  centreName: string
  accessLink: string
}) {
  const normalizedPhone = normalizePhoneForWhatsapp(input.phone)
  if (!normalizedPhone) return null

  const greeting = input.parentName?.trim() || 'Parent'
  const message = [
    `Hi ${greeting},`,
    `${input.centreName} is ready to link ${input.childName}'s CentreConnect profile with you.`,
    'We already sent the official email link, and you can also open it here:',
    input.accessLink,
    'Once you confirm, you will start getting the best creche updates, messages, and daily moments in one calm place.',
  ].join('\n')

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
}

function renderParentLinkEmail(input: {
  parentName: string
  childName: string
  centreName: string
  accessLink: string
  emailMode: ParentLinkEmailMode
}) {
  const heading =
    input.emailMode === 'link_profile'
      ? `Your child's creche is ready to connect with you.`
      : `Your child's creche invited you to CentreConnect.`
  const previewText =
    input.emailMode === 'link_profile'
      ? `${input.centreName} is ready to link ${input.childName}'s profile so you can start receiving daily updates, messages, and reminders.`
      : `${input.centreName} invited you to CentreConnect so you can start receiving daily updates, messages, and reminders for ${input.childName}.`

  const body = `
    <p style="margin:0 0 16px;">Hi ${input.parentName},</p>
    <p style="margin:0 0 16px;">${input.centreName} is ready to connect <strong>${input.childName}</strong> with you on CentreConnect.</p>
    <p style="margin:0 0 16px;">You are about to experience the easiest way to stay close to your child's creche: daily updates, warm announcements, faster document sharing, and one trusted place for the moments that matter.</p>
    <div style="margin:24px 0;">
      <a href="${input.accessLink}" style="display:inline-block;border-radius:18px;background:#0891b2;padding:14px 22px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;">Open my family link</a>
    </div>
    <p style="margin:0 0 16px;">When you open it, we will link your profile, keep your family details in sync with the creche, and help you stay in contact without the usual back-and-forth.</p>
    <p style="margin:0;">We are excited to welcome you. This is the new way to do creche communication, and it is built around parents first.</p>
  `

  return renderBaseEmailLayout({
    theme: 'parent',
    recipientName: input.parentName,
    previewText,
    heading,
    subheading: 'One link, one calm place, and one trusted way to stay close to your child\'s creche.',
    children: body,
    appBaseUrl: normalizeAppUrl(),
  })
}

function toSummary(row: Record<string, unknown>): ParentLinkRequestSummary {
  return {
    id: String(row.id),
    childId: String(row.child_id),
    ecdId: String(row.ecd_id),
    parentEmail: String(row.parent_email),
    parentPhone: normalizeText(typeof row.parent_phone === 'string' ? row.parent_phone : null),
    parentName: normalizeText(typeof row.parent_name === 'string' ? row.parent_name : null),
    status: String(row.status) as ParentLinkRequestStatus,
    emailMode: String(row.email_mode) as ParentLinkEmailMode,
    requestedAt: String(row.requested_at),
    sentAt: typeof row.sent_at === 'string' ? row.sent_at : null,
    openedAt: typeof row.opened_at === 'string' ? row.opened_at : null,
    acceptedAt: typeof row.accepted_at === 'string' ? row.accepted_at : null,
    linkedUserId: typeof row.linked_user_id === 'string' ? row.linked_user_id : null,
  }
}

export async function getLatestParentLinkRequestsByChildIds(childIds: string[]) {
  if (childIds.length === 0) return new Map<string, ParentLinkRequestSummary>()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('parent_link_requests')
    .select('id,child_id,ecd_id,parent_email,parent_phone,parent_name,status,email_mode,requested_at,sent_at,opened_at,accepted_at,linked_user_id,created_at')
    .in('child_id', childIds)
    .order('created_at', { ascending: false })

  if (error || !data) return new Map<string, ParentLinkRequestSummary>()

  const byChildId = new Map<string, ParentLinkRequestSummary>()
  for (const row of data as Array<Record<string, unknown>>) {
    const childId = String(row.child_id)
    if (!byChildId.has(childId)) {
      byChildId.set(childId, toSummary(row))
    }
  }

  return byChildId
}

export async function createOrResendParentLinkRequest(
  input: CreateParentLinkRequestInput
): Promise<CreateParentLinkRequestResult> {
  const admin = createAdminClient()
  const parentEmail = normalizeEmail(input.parentEmail)
  const parentName = normalizeText(input.parentName)
  const parentPhone = normalizeText(input.parentPhone)

  if (!parentEmail) {
    return { ok: false, message: 'Add the parent email before sending the family link.' }
  }

  const child = await loadChild(admin, { childId: input.childId, ecdId: input.ecdId })
  if (!child) {
    return { ok: false, message: 'Child profile not found.' }
  }
  if (child.parent_id) {
    return { ok: false, message: 'This child is already linked to a parent account.' }
  }

  const { data: centre } = await admin
    .from('ecd_centres')
    .select('name')
    .eq('id', input.ecdId)
    .maybeSingle()

  const childName = `${child.first_name ?? ''} ${child.last_name ?? ''}`.trim() || 'your child'
  const centreName = centre?.name?.trim() || 'your creche'
  const existingAuthUserId = await findExistingAuthUserIdByEmail(admin, parentEmail)
  const emailMode: ParentLinkEmailMode = existingAuthUserId ? 'link_profile' : 'invite'
  const rawToken = `${randomUUID()}${randomUUID().replace(/-/g, '')}`
  const linkPath = `/account/link-child?token=${encodeURIComponent(rawToken)}`
  const redirectTo = buildAuthCallbackRedirect(linkPath)
  const accessLinkResult = await generateMagicFirstAccessLink({
    adminClient: admin,
    email: parentEmail,
    redirectTo,
    preferMagicLink: emailMode === 'link_profile',
  })

  if (!accessLinkResult.link) {
    return {
      ok: false,
      message: accessLinkResult.warning || 'We could not create the parent access link right now.',
    }
  }

  await syncChildGuardianSnapshot({
    admin,
    child,
    parentName,
    parentPhone,
    parentEmail,
  })

  const now = nowIso()
  await admin
    .from('parent_link_requests')
    .update({
      status: 'cancelled',
      cancelled_at: now,
      updated_at: now,
    })
    .eq('child_id', child.id)
    .eq('ecd_id', input.ecdId)
    .in('status', ['pending', 'opened'])

  const { data: inserted, error: insertError } = await admin
    .from('parent_link_requests')
    .insert({
      child_id: child.id,
      ecd_id: input.ecdId,
      parent_email: parentEmail,
      parent_phone: parentPhone,
      parent_name: parentName,
      requested_by_user_id: input.requestedByUserId,
      secure_token_hash: hashToken(rawToken),
      status: 'pending',
      email_mode: emailMode,
      linked_user_id: accessLinkResult.authUserId,
      requested_at: now,
      sent_at: now,
      created_at: now,
      updated_at: now,
    })
    .select('id,child_id,ecd_id,parent_email,parent_phone,parent_name,status,email_mode,requested_at,sent_at,opened_at,accepted_at,linked_user_id')
    .single()

  if (insertError || !inserted) {
    return { ok: false, message: insertError?.message || 'Failed to save the parent link request.' }
  }

  const emailPayload = renderParentLinkEmail({
    parentName: parentName || 'Parent',
    childName,
    centreName,
    accessLink: accessLinkResult.link,
    emailMode,
  })

  const emailDeliveryResult = await deliverTransactionalEmail({
    to: parentEmail,
    subject: emailMode === 'link_profile'
      ? `${centreName} is ready to connect ${childName} on CentreConnect`
      : `${centreName} invited you to CentreConnect for ${childName}`,
    html: emailPayload.html,
  })

  await admin.from('audit_logs').insert({
    user_id: input.requestedByUserId,
    ecd_id: input.ecdId,
    action: 'parent_link_request_sent',
    resource_type: 'children',
    resource_id: child.id,
    changes: {
      parent_email: parentEmail,
      parent_phone: parentPhone,
      email_mode: emailMode,
      email_delivery_status: emailDeliveryResult.status,
      email_delivery_message: emailDeliveryResult.deliveryMessage,
      access_link_mode: accessLinkResult.mode,
    },
  })

  revalidatePath('/ecd/children')
  revalidatePath(`/ecd/children/${child.id}`)
  revalidatePath('/ecd/dashboard')

  return {
    ok: true,
    message:
      emailMode === 'link_profile'
        ? 'Parent detected! Family link emailed. They can now confirm their profile and start receiving updates.'
        : 'Invitation emailed. The parent can now join CentreConnect and link this child profile.',
    request: toSummary(inserted as unknown as Record<string, unknown>),
    whatsappHref: buildWhatsappHref({
      phone: parentPhone,
      parentName,
      childName,
      centreName,
      accessLink: accessLinkResult.link,
    }),
    accessLink: accessLinkResult.link,
    existingParentDetected: emailMode === 'link_profile',
  }
}

export async function peekParentLinkRequestByToken(token: string) {
  const admin = createAdminClient()
  const tokenHash = hashToken(token)
  const { data, error } = await admin
    .from('parent_link_requests')
    .select('id,child_id,ecd_id,parent_email,parent_phone,parent_name,status,email_mode,requested_at,sent_at,opened_at,accepted_at,linked_user_id,children(first_name,last_name),ecd_centres(name)')
    .eq('secure_token_hash', tokenHash)
    .maybeSingle()

  if (error || !data) return null

  const row = data as Record<string, unknown>
  const status = String(row.status) as ParentLinkRequestStatus
  if (status === 'expired' || status === 'cancelled') return null

  if (status === 'pending') {
    const openedAt = nowIso()
    await admin
      .from('parent_link_requests')
      .update({ status: 'opened', opened_at: openedAt, updated_at: openedAt })
      .eq('id', String(row.id))
      .in('status', ['pending'])
    row.status = 'opened'
    row.opened_at = openedAt
  }

  const child = Array.isArray(row.children) ? row.children[0] : row.children
  const centre = Array.isArray(row.ecd_centres) ? row.ecd_centres[0] : row.ecd_centres

  return {
    summary: toSummary(row),
    childName: `${String((child as Record<string, unknown> | null)?.first_name ?? '').trim()} ${String((child as Record<string, unknown> | null)?.last_name ?? '').trim()}`.trim() || 'your child',
    centreName: String((centre as Record<string, unknown> | null)?.name ?? '').trim() || 'your creche',
  }
}

export async function acceptParentLinkRequestByToken(input: {
  token: string
  userId: string
  email: string | null
}): Promise<AcceptParentLinkRequestResult> {
  const admin = createAdminClient()
  const tokenHash = hashToken(input.token)
  const { data, error } = await admin
    .from('parent_link_requests')
    .select('id,child_id,ecd_id,parent_email,parent_phone,parent_name,status,email_mode,linked_user_id')
    .eq('secure_token_hash', tokenHash)
    .maybeSingle()

  if (error || !data) {
    return { ok: false, message: 'This family link is missing or expired.' }
  }

  const request = data as Record<string, unknown>
  const status = String(request.status) as ParentLinkRequestStatus
  if (status === 'accepted') {
    return {
      ok: true,
      message: 'This child is already linked to your profile.',
      childId: String(request.child_id),
      ecdId: String(request.ecd_id),
    }
  }
  if (status === 'expired' || status === 'cancelled') {
    return { ok: false, message: 'This family link is no longer active.' }
  }

  const requestEmail = normalizeEmail(String(request.parent_email ?? ''))
  const userEmail = normalizeEmail(input.email)
  if (requestEmail && userEmail && requestEmail !== userEmail) {
    return { ok: false, message: 'Please sign in with the same email address that received this family link.' }
  }

  const childId = String(request.child_id)
  const ecdId = String(request.ecd_id)
  const child = await loadChild(admin, { childId, ecdId })
  if (!child) {
    return { ok: false, message: 'The child profile could not be found anymore.' }
  }

  const existingProfileResult = await admin
    .from('user_profiles')
    .select('id,role,full_name,phone')
    .eq('id', input.userId)
    .maybeSingle()

  const existingRole = normalizeText(existingProfileResult.data?.role ?? null)
  const fullName = existingProfileResult.data?.full_name?.trim() || normalizeText(typeof request.parent_name === 'string' ? request.parent_name : null) || 'Parent'
  const phone = existingProfileResult.data?.phone?.trim() || normalizeText(typeof request.parent_phone === 'string' ? request.parent_phone : null)
  const roleToPersist = !existingRole || existingRole === 'parent_user' ? 'parent_user' : existingRole

  const { error: profileError } = await admin.from('user_profiles').upsert(
    {
      id: input.userId,
      role: roleToPersist,
      full_name: fullName,
      phone,
    },
    { onConflict: 'id' }
  )

  if (profileError) {
    return { ok: false, message: profileError.message || 'Could not prepare your parent profile.' }
  }

  let roleChanged = false
  if (roleToPersist === 'parent_user') {
    const metadataSync = await syncAuthUserMetadataRole({ adminClient: admin, userId: input.userId, role: 'parent_user' })
    roleChanged = metadataSync.ok && metadataSync.changed
  }

  const { data: existingParent } = await admin.from('parents').select('id').eq('id', input.userId).maybeSingle()
  const { error: parentError } = await admin.from('parents').upsert(
    {
      id: input.userId,
      billing_email: requestEmail,
      alt_phone: phone,
      guardian_relationship: 'parent',
    },
    { onConflict: 'id' }
  )

  if (parentError) {
    return { ok: false, message: parentError.message || 'Could not create the parent record.' }
  }

  await syncChildGuardianSnapshot({
    admin,
    child,
    parentName: fullName,
    parentPhone: phone,
    parentEmail: requestEmail,
  })

  const { error: childError } = await admin
    .from('children')
    .update({
      parent_id: input.userId,
      onboarding_link_sent_at: null,
    })
    .eq('id', child.id)
    .eq('ecd_id', child.ecd_id)

  if (childError) {
    return { ok: false, message: childError.message || 'Could not link the child profile.' }
  }

  await admin
    .from('applications')
    .update({ parent_id: input.userId })
    .eq('child_id', child.id)
    .eq('ecd_id', child.ecd_id)
    .or('parent_id.is.null,parent_id.eq.' + input.userId)

  const acceptedAt = nowIso()
  await admin
    .from('parent_link_requests')
    .update({
      status: 'accepted',
      accepted_at: acceptedAt,
      linked_user_id: input.userId,
      updated_at: acceptedAt,
    })
    .eq('id', String(request.id))

  await admin.from('audit_logs').insert({
    user_id: input.userId,
    ecd_id: ecdId,
    action: 'parent_link_request_accepted',
    resource_type: 'children',
    resource_id: child.id,
    changes: {
      request_id: String(request.id),
      parent_email: requestEmail,
    },
  })

  if (!existingParent?.id) {
    await enqueueParentWelcomeSequence(admin as any, {
      parentId: input.userId,
      parentName: fullName,
    })
  }

  revalidatePath('/parent/dashboard')
  revalidatePath('/parent/children')
  revalidatePath('/parent/profile')
  revalidatePath('/ecd/children')
  revalidatePath(`/ecd/children/${child.id}`)
  revalidatePath('/ecd/applications')

  return {
    ok: true,
    message: 'Your child is now linked. Welcome to CentreConnect.',
    childId: child.id,
    ecdId,
    roleChanged,
  }
}
