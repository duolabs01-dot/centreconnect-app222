'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  evaluateApplicationDocumentChecklist,
  toApplicationDocumentLabels,
} from '@/lib/admissions/application-documents'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const sendReminderSchema = z.object({
  applicationId: z.string().uuid(),
})

type ReminderResult = {
  ok: boolean
  error?: string
  message?: string
  whatsappHref?: string
  smsHref?: string
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
  if (direct) {
    return direct.replace(/\/+$/, '')
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/+$/, '')}`
  }

  return 'http://localhost:3010'
}

function normalizeWhatsappNumber(rawPhone: string | null | undefined) {
  const digits = String(rawPhone ?? '').replace(/[^\d]/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) return `27${digits.slice(1)}`
  if (digits.startsWith('27')) return digits
  return digits
}

function toWhatsappHref(rawPhone: string | null | undefined, message: string) {
  if (!message.trim()) return null
  const number = normalizeWhatsappNumber(rawPhone)
  if (!number) return `https://wa.me/?text=${encodeURIComponent(message)}`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

function toSmsHref(rawPhone: string | null | undefined, message: string) {
  const digits = String(rawPhone ?? '').replace(/[^\d]/g, '')
  if (!digits || !message.trim()) return null
  const target = digits.startsWith('0') ? `+27${digits.slice(1)}` : digits.startsWith('27') ? `+${digits}` : digits
  return `sms:${target}?body=${encodeURIComponent(message)}`
}

function parseMissingCodes(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((entry) => String(entry)).map((entry) => entry.trim()).filter(Boolean)
}

export async function sendIncompleteApplicationReminderAction(input: unknown): Promise<ReminderResult> {
  const parsed = sendReminderSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Invalid reminder payload.' }
  }

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
  if (!application) {
    return { ok: false, error: 'Application not found.' }
  }

  const parent = normalizeOne(application.parents)
  if (!parent?.id) {
    return { ok: false, error: 'Parent contact is missing on this application.' }
  }

  const child = normalizeOne(application.children)
  const parentProfile = normalizeOne(parent.user_profiles)
  const parentName = parentProfile?.full_name?.trim() || 'Parent'
  const parentPhone = parentProfile?.phone ?? parent.alt_phone
  const childName =
    [child?.first_name, child?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() || 'your child'

  const { data: centre } = await session.supabase.from('ecd_centres').select('name').eq('id', session.ecdId).maybeSingle()
  const centreName = centre?.name?.trim() || 'your crèche'

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
  const message = `Hi ${parentName} 👋 Your application for ${childName} at ${centreName} is almost complete 🎉. Please upload the missing documents: ${missingLabels.join(', ')}. Tap here: ${directLink} We’re cheering you on 😊`

  const { error: notificationError } = await session.supabase.from('parent_notifications').insert({
    parent_id: parent.id,
    ecd_id: session.ecdId,
    application_id: application.id,
    template_key: 'missing_documents',
    title: 'Friendly reminder 📄',
    message,
    is_read: false,
  })
  if (notificationError) {
    return { ok: false, error: notificationError.message || 'Failed to send reminder.' }
  }

  const {
    data: { user: actor },
  } = await session.supabase.auth.getUser()

  if (actor?.id) {
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

      if (!threadError && createdThread?.id) {
        threadId = createdThread.id
      }
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
    message: 'Reminder sent to parent inbox.',
    whatsappHref: toWhatsappHref(parentPhone, message) ?? undefined,
    smsHref: toSmsHref(parentPhone, message) ?? undefined,
  }
}
