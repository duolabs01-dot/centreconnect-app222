'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  evaluateApplicationDocumentChecklist,
  toApplicationDocumentLabels,
} from '@/lib/admissions/application-documents'
import {
  appendProfessionalSignature,
  channelIncludesInApp,
  channelIncludesWhatsapp,
  normalizeCommunicationAutomationSettings,
  renderAutomationTemplate,
} from '@/lib/communications/automation-settings'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendParentInAppNotification, toWhatsappHref } from '@/lib/notifications/multi-channel'

const sendReminderSchema = z.object({
  applicationId: z.string().uuid(),
})

type ReminderResult = {
  ok: boolean
  error?: string
  message?: string
  whatsappHref?: string
}

type ApplicationProfile = { full_name: string | null; phone: string | null }
type ApplicationParent = {
  id: string
  alt_phone: string | null
  user_profiles: ApplicationProfile | ApplicationProfile[] | null
}
type ApplicationChild = { first_name: string | null; last_name: string | null }
type ApplicationRecord = {
  id: string
  parent_id: string
  application_number: string
  missing_documents: unknown
  parents: ApplicationParent | ApplicationParent[] | null
  children: ApplicationChild | ApplicationChild[] | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
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

function parseMissingCodes(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((entry) => String(entry).trim()).filter(Boolean)
}

async function loadCentreWithAutomationSettings(session: Awaited<ReturnType<typeof requireEcdPortalSession>>) {
  const primary = await session.supabase
    .from('ecd_centres')
    .select('name,phone,contact_phone,contact_whatsapp,email,communication_automation_settings')
    .eq('id', session.ecdId)
    .maybeSingle()

  if (
    primary.error &&
    primary.error.message.toLowerCase().includes('communication_automation_settings')
  ) {
    const fallback = await session.supabase
      .from('ecd_centres')
      .select('name,phone,contact_phone,contact_whatsapp,email')
      .eq('id', session.ecdId)
      .maybeSingle()
    return (fallback.data ?? null) as {
      name: string | null
      phone: string | null
      contact_phone: string | null
      contact_whatsapp: string | null
      email: string | null
      communication_automation_settings?: unknown
    } | null
  }

  return (primary.data ?? null) as {
    name: string | null
    phone: string | null
    contact_phone: string | null
    contact_whatsapp: string | null
    email: string | null
    communication_automation_settings?: unknown
  } | null
}

export async function sendIncompleteApplicationReminderAction(input: unknown): Promise<ReminderResult> {
  const parsed = sendReminderSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid reminder payload.' }

  const session = await requireEcdPortalSession({ cached: false })
  const { data: applicationRaw } = await session.supabase
    .from('applications')
    .select(
      'id,parent_id,application_number,missing_documents,parents(id,alt_phone,user_profiles(full_name,phone)),children(first_name,last_name)'
    )
    .eq('id', parsed.data.applicationId)
    .eq('ecd_id', session.ecdId)
    .maybeSingle()

  const application = (applicationRaw as ApplicationRecord | null) ?? null
  if (!application) return { ok: false, error: 'Application not found.' }

  const parent = normalizeOne(application.parents)
  if (!parent?.id) return { ok: false, error: 'Parent contact is missing on this application.' }

  const child = normalizeOne(application.children)
  const parentProfile = normalizeOne(parent.user_profiles)
  const parentName = parentProfile?.full_name?.trim() || 'Parent'
  const parentPhone = parentProfile?.phone ?? parent.alt_phone
  const childName =
    [child?.first_name, child?.last_name].filter(Boolean).join(' ').trim() || 'your child'

  const centre = await loadCentreWithAutomationSettings(session)
  const centreName = centre?.name?.trim() || 'your crèche'
  const automationSettings = normalizeCommunicationAutomationSettings(
    centre?.communication_automation_settings ?? null
  )
  if (!automationSettings.enabled) {
    return { ok: false, error: 'Automatic reminders are disabled in Calendar automation settings.' }
  }

  let missingCodes = parseMissingCodes(application.missing_documents)
  if (missingCodes.length === 0) {
    const { data: parentDocs } = await session.supabase
      .from('parent_documents')
      .select('doc_type')
      .eq('parent_id', parent.id)
      .limit(80)
    const checklist = evaluateApplicationDocumentChecklist((parentDocs ?? []).map((doc) => doc.doc_type))
    missingCodes = checklist.missingCodes
  }
  if (missingCodes.length === 0) {
    return { ok: false, error: 'No missing documents found for this application.' }
  }

  const missingLabels = toApplicationDocumentLabels(missingCodes)
  const directLink = `${getAppOrigin()}/parent/profile/documents?applicationId=${application.id}`
  const baseMessage = renderAutomationTemplate(automationSettings.application_reminder_template, {
    parent_name: parentName,
    child_name: childName,
    centre_name: centreName,
    missing_documents: missingLabels.join(', '),
    direct_link: directLink,
  })
  const message = appendProfessionalSignature(baseMessage, {
    centreName,
    signoff: automationSettings.signoff,
    includeCentrePhone: automationSettings.include_centre_phone,
    centrePhone: centre?.contact_phone ?? centre?.phone ?? null,
    includeCentreEmail: automationSettings.include_centre_email,
    centreEmail: centre?.email ?? null,
    includeCentreWhatsapp: automationSettings.include_centre_whatsapp,
    centreWhatsapp: centre?.contact_whatsapp ?? null,
  })
  const shouldSendInApp = channelIncludesInApp(automationSettings.send_channel)
  const shouldExposeWhatsapp = channelIncludesWhatsapp(automationSettings.send_channel)

  if (shouldSendInApp) {
    const notificationResult = await sendParentInAppNotification(createAdminClient(), {
      parent_id: parent.id,
      ecd_id: session.ecdId,
      application_id: application.id,
      template_key: 'missing_documents',
      title: `Document reminder from ${centreName}`,
      message,
      is_read: false,
    })
    if (!notificationResult.ok) {
      return { ok: false, error: notificationResult.error || 'Failed to send reminder.' }
    }
  }

  const {
    data: { user: actor },
  } = await session.supabase.auth.getUser()

  if (actor?.id && shouldSendInApp) {
    const { data: existingThread } = await session.supabase
      .from('message_threads')
      .select('id')
      .eq('ecd_id', session.ecdId)
      .eq('context_type', 'application')
      .eq('context_id', application.id)
      .contains('participant_ids', [actor.id, parent.id])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let threadId = existingThread?.id ?? null
    if (!threadId) {
      const { data: createdThread, error: threadError } = await session.supabase
        .from('message_threads')
        .insert({
          ecd_id: session.ecdId,
          context_type: 'application',
          context_id: application.id,
          participant_ids: [actor.id, parent.id],
        })
        .select('id')
        .single()

      if (!threadError && createdThread?.id) threadId = createdThread.id
    }

    if (threadId) {
      await session.supabase.from('messages').insert({
        thread_id: threadId,
        sender_id: actor.id,
        body: message,
      })
    }
  }

  await session.supabase
    .from('applications')
    .update({ missing_documents: missingCodes })
    .eq('id', application.id)
    .eq('ecd_id', session.ecdId)

  revalidatePath('/ecd/applications')
  revalidatePath(`/ecd/applications/${application.id}`)

  return {
    ok: true,
    message: shouldSendInApp
      ? 'Reminder sent with professional centre details.'
      : 'Reminder prepared. Open your selected channel to deliver it.',
    whatsappHref: shouldExposeWhatsapp ? toWhatsappHref(parentPhone, message) ?? undefined : undefined,
  }
}
