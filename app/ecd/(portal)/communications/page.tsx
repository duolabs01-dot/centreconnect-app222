import type { Metadata } from 'next'
import Link from 'next/link'
import { BellRing, MessageSquare, Megaphone } from 'lucide-react'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { markEcdNotificationsReadAction } from './actions'
import { CommunicationsComposer } from './composer'
import { DirectMessagePanel } from './direct-message-panel'

export const metadata: Metadata = {
  title: 'Parent Comms - CentreConnect',
  description: 'Direct messages with parents and simple centre-wide updates.',
}

type Template = {
  template_key: string
  title: string
  body: string
}

type Recipient = {
  parentId: string
  label: string
}

type SupportedContextType = 'application' | 'pickup' | 'general'

type CommunicationsPageProps = {
  searchParams?: {
    recipient?: string
    contextType?: SupportedContextType
    contextId?: string
    template?: string
    audience?: 'all' | 'pending'
  }
}

type EcdNotificationRow = {
  id: string
  title: string | null
  message: string | null
  created_at: string
  metadata: Record<string, unknown> | null
}

type ThreadRow = {
  id: string
  context_type: SupportedContextType | null
  context_id: string | null
  participant_ids: string[] | null
  created_at: string
}

type MessageRow = {
  id: string
  thread_id: string
  sender_id: string
  body: string
  created_at: string
}

type ProfileRow = {
  id: string
  full_name: string | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalizeText(value: string | null | undefined, fallback: string) {
  const next = String(value ?? '').trim()
  return next || fallback
}

function normalizeContextType(value: string | null | undefined): SupportedContextType {
  return value === 'application' || value === 'pickup' ? value : 'general'
}

function formatContextLabel(contextType: SupportedContextType) {
  if (contextType === 'application') return 'Application'
  if (contextType === 'pickup') return 'Pickup'
  return 'General'
}

function buildConversationHref(parentId: string, contextType: SupportedContextType, contextId: string | null) {
  const params = new URLSearchParams({
    recipient: parentId,
    contextType,
  })
  if (contextId) params.set('contextId', contextId)
  return `/ecd/communications?${params.toString()}`
}

export default async function EcdCommunicationsPage({ searchParams }: CommunicationsPageProps) {
  const { user, ecdId, role } = await requireEcdPortalSession()
  const admin = createAdminClient()

  const requestedParentId = String(searchParams?.recipient ?? '').trim() || null
  const requestedContextType = normalizeContextType(searchParams?.contextType)
  const requestedContextId = String(searchParams?.contextId ?? '').trim() || null
  const initialTemplateKey = String(searchParams?.template ?? '').trim() || null
  const initialAudience = searchParams?.audience === 'pending' ? 'pending' : 'all'

  const [
    centreResult,
    templatesResult,
    unreadNotificationsResult,
    applicationRecipientsResult,
    childRecipientsResult,
    centreParticipantsResult,
    recentThreadsResult,
  ] = await Promise.all([
    admin.from('ecd_centres').select('name').eq('id', ecdId).maybeSingle(),
    admin
      .from('communication_templates')
      .select('template_key,title,body')
      .eq('is_active', true)
      .order('title', { ascending: true }),
    admin
      .from('ecd_notifications')
      .select('id,title,message,created_at,metadata')
      .eq('ecd_id', ecdId)
      .eq('is_read', false)
      .contains('metadata', { kind: 'parent_message' })
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('applications')
      .select('parent_id, children(first_name,last_name), parents(user_profiles(full_name))')
      .eq('ecd_id', ecdId)
      .not('parent_id', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(200),
    admin
      .from('children')
      .select('parent_id, first_name, last_name, parents(user_profiles(full_name))')
      .eq('ecd_id', ecdId)
      .not('parent_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200),
    admin.from('ecd_admins').select('user_id').eq('ecd_id', ecdId),
    admin
      .from('message_threads')
      .select('id,context_type,context_id,participant_ids,created_at')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(24),
  ])

  const centreName = centreResult.data?.name?.trim() || 'Your crèche'
  const templates = ((templatesResult.data ?? []) as Template[]) ?? []
  const unreadNotifications = (unreadNotificationsResult.data ?? []) as EcdNotificationRow[]
  const applicationRecipients = applicationRecipientsResult.data ?? []
  const childRecipients = childRecipientsResult.data ?? []
  const centreParticipantIds = Array.from(
    new Set((centreParticipantsResult.data ?? []).map((row) => String(row.user_id)).filter(Boolean))
  )
  const recentThreads = ((recentThreadsResult.data ?? []) as ThreadRow[]).filter((thread) =>
    (thread.participant_ids ?? []).some((participantId) => !centreParticipantIds.includes(participantId))
  )

  const recipientsByParent = new Map<string, Recipient>()

  for (const row of applicationRecipients) {
    const parentId = String((row as any).parent_id ?? '').trim()
    if (!parentId || recipientsByParent.has(parentId)) continue
    const child = normalizeOne((row as any).children)
    const parent = normalizeOne((row as any).parents)
    const profile = normalizeOne(parent?.user_profiles ?? null)
    const childName = `${normalizeText(child?.first_name, '')} ${normalizeText(child?.last_name, '')}`.trim()
    recipientsByParent.set(parentId, {
      parentId,
      label: `${normalizeText(profile?.full_name, 'Parent')}${childName ? ` (${childName})` : ''}`,
    })
  }

  for (const row of childRecipients) {
    const parentId = String((row as any).parent_id ?? '').trim()
    if (!parentId || recipientsByParent.has(parentId)) continue
    const parent = normalizeOne((row as any).parents)
    const profile = normalizeOne(parent?.user_profiles ?? null)
    const childName = `${normalizeText((row as any).first_name, '')} ${normalizeText((row as any).last_name, '')}`.trim()
    recipientsByParent.set(parentId, {
      parentId,
      label: `${normalizeText(profile?.full_name, 'Parent')}${childName ? ` (${childName})` : ''}`,
    })
  }

  const recipients = Array.from(recipientsByParent.values())

  const threadIds = recentThreads.map((thread) => thread.id)
  const latestMessagesResult =
    threadIds.length > 0
      ? await admin
          .from('messages')
          .select('id,thread_id,sender_id,body,created_at')
          .in('thread_id', threadIds)
          .order('created_at', { ascending: false })
          .limit(120)
      : { data: [] as MessageRow[] }
  const latestMessages = (latestMessagesResult.data ?? []) as MessageRow[]
  const latestMessageByThread = new Map<string, MessageRow>()
  for (const message of latestMessages) {
    if (!latestMessageByThread.has(message.thread_id)) {
      latestMessageByThread.set(message.thread_id, message)
    }
  }

  const parentIds = Array.from(
    new Set([
      ...recentThreads.flatMap((thread) => (thread.participant_ids ?? []).filter((participantId) => !centreParticipantIds.includes(participantId))),
      ...unreadNotifications.map((row) => String(row.metadata?.parent_id ?? '').trim()).filter(Boolean),
    ])
  )
  const parentProfilesResult =
    parentIds.length > 0
      ? await admin.from('user_profiles').select('id,full_name').in('id', parentIds)
      : { data: [] as ProfileRow[] }
  const parentProfiles = new Map(((parentProfilesResult.data ?? []) as ProfileRow[]).map((row) => [row.id, row]))

  const unreadThreadIds = new Set(
    unreadNotifications
      .map((row) => String(row.metadata?.thread_id ?? '').trim())
      .filter(Boolean)
  )

  const threadSummaries = recentThreads.map((thread) => {
    const parentId =
      (thread.participant_ids ?? []).find((participantId) => !centreParticipantIds.includes(participantId)) ?? null
    const contextType = normalizeContextType(thread.context_type)
    const latestMessage = latestMessageByThread.get(thread.id) ?? null
    const recipientLabel =
      (parentId ? recipientsByParent.get(parentId)?.label : null) ??
      normalizeText(parentId ? parentProfiles.get(parentId)?.full_name : null, 'Parent')

    return {
      id: thread.id,
      parentId,
      recipientLabel,
      contextType,
      contextId: thread.context_id,
      preview: normalizeText(latestMessage?.body, 'Conversation started.'),
      createdAt: latestMessage?.created_at ?? thread.created_at,
      unread: unreadThreadIds.has(thread.id),
      href: parentId ? buildConversationHref(parentId, contextType, thread.context_id) : null,
    }
  })

  const selectedThread =
    (requestedParentId
      ? threadSummaries.find(
          (thread) =>
            thread.parentId === requestedParentId &&
            thread.contextType === requestedContextType &&
            (thread.contextId ?? null) === requestedContextId
        ) ??
        threadSummaries.find((thread) => thread.parentId === requestedParentId)
      : null) ??
    threadSummaries.find((thread) => thread.unread) ??
    threadSummaries[0] ??
    null

  const selectedRecipientParentId = selectedThread?.parentId ?? requestedParentId ?? null
  const selectedContextType = selectedThread?.contextType ?? requestedContextType
  const selectedContextId = selectedThread?.contextId ?? requestedContextId
  const selectedRecipientLabel =
    (selectedRecipientParentId ? recipientsByParent.get(selectedRecipientParentId)?.label : null) ??
    normalizeText(selectedRecipientParentId ? parentProfiles.get(selectedRecipientParentId)?.full_name : null, 'Parent')

  const selectedMessagesResult =
    selectedThread?.id
      ? await admin
          .from('messages')
          .select('id,thread_id,sender_id,body,created_at')
          .eq('thread_id', selectedThread.id)
          .order('created_at', { ascending: true })
          .limit(80)
      : { data: [] as MessageRow[] }
  const selectedMessages = ((selectedMessagesResult.data ?? []) as MessageRow[]).map((message) => ({
    id: message.id,
    body: message.body,
    createdAt: message.created_at,
    sender: centreParticipantIds.includes(message.sender_id) ? ('centre' as const) : ('parent' as const),
    senderLabel: centreParticipantIds.includes(message.sender_id) ? centreName : selectedRecipientLabel,
  }))

  return (
    <EcdOsShell
      title="Parent Comms"
      description="Read parent messages and reply from one simple inbox."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <section className="space-y-6">
        <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
          <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl font-black text-slate-900">Parent Comms</CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 text-slate-600">
                Open one parent, read the messages, and reply. Centre-wide updates stay separate below so this inbox stays calm.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700">
                {unreadNotifications.length} new parent message{unreadNotifications.length === 1 ? '' : 's'}
              </div>
              {unreadNotifications.length > 0 ? (
                <form action={markEcdNotificationsReadAction}>
                  <Button type="submit" variant="outline" className="rounded-2xl">
                    Mark inbox seen
                  </Button>
                </form>
              ) : null}
            </div>
          </CardHeader>
        </Card>

        <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <MessageSquare className="h-4 w-4 text-teal-600" />
                Parents
              </CardTitle>
              <CardDescription className="text-sm text-slate-600">
                Choose a parent conversation to read and reply.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              {threadSummaries.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No parent conversations yet.
                </div>
              ) : (
                threadSummaries.map((thread) => {
                  const active =
                    selectedRecipientParentId === thread.parentId &&
                    selectedContextType === thread.contextType &&
                    (selectedContextId ?? null) === (thread.contextId ?? null)

                  return (
                    <Link
                      key={thread.id}
                      href={thread.href ?? '/ecd/communications'}
                      className={
                        active
                          ? 'block rounded-2xl border border-teal-200 bg-teal-50 p-4 shadow-sm'
                          : 'block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-teal-200 hover:bg-teal-50/60'
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{thread.recipientLabel}</p>
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {formatContextLabel(thread.contextType)} · {formatDate(thread.createdAt)}
                          </p>
                        </div>
                        {thread.unread ? (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rose-700">
                            New
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{thread.preview}</p>
                    </Link>
                  )
                })
              )}
            </CardContent>
          </Card>

          {selectedRecipientParentId ? (
            <DirectMessagePanel
              ecdId={ecdId}
              centreName={centreName}
              centreParticipantIds={centreParticipantIds}
              recipientParentId={selectedRecipientParentId}
              recipientLabel={selectedRecipientLabel}
              contextType={selectedContextType}
              contextId={selectedContextId}
              messages={selectedMessages}
            />
          ) : (
            <Card className="flex min-h-[560px] items-center justify-center rounded-3xl border border-slate-100 bg-white shadow-sm">
              <CardContent className="space-y-3 p-8 text-center">
                <p className="text-lg font-black text-slate-900">No direct messages yet</p>
                <p className="max-w-md text-sm leading-6 text-slate-600">
                  When a parent sends a question, it will appear here as a simple direct message conversation.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Megaphone className="h-4 w-4 text-cyan-600" />
              Centre-wide updates
            </CardTitle>
            <CardDescription className="text-sm text-slate-600">
              Use this only when you want to send one update to many parents.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <CommunicationsComposer
              ecdId={ecdId}
              centreName={centreName}
              templates={templates}
              recipients={recipients}
              centreParticipantIds={centreParticipantIds}
              allowedModes={['broadcast']}
              initialTemplateKey={initialTemplateKey}
              initialAudience={initialAudience}
              initialMode="broadcast"
            />
          </CardContent>
        </Card>
      </section>
    </EcdOsShell>
  )
}
