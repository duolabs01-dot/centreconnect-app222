import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BellRing, MessageSquare } from 'lucide-react'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { markEcdNotificationsReadAction } from './actions'
import { CommunicationsComposer } from './composer'

export const metadata: Metadata = {
  title: 'Parent Comms - CentreConnect',
  description: 'Read parent messages, reply quickly, and send updates from one calm inbox.',
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

type CommunicationsPageProps = {
  searchParams?: {
    recipient?: string
    contextType?: 'application' | 'pickup' | 'general'
    contextId?: string
    template?: string
    audience?: 'all' | 'pending'
    mode?: 'broadcast' | 'direct'
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
  context_type: 'application' | 'pickup' | 'general' | null
  context_id: string | null
  participant_ids: string[] | null
  created_at: string
}

type MessageRow = {
  id: string
  thread_id: string
  sender_id: string
  body: string
  read_by: string[] | null
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

function buildReplyHref(parentId: string, contextType: ThreadRow['context_type'], contextId: string | null) {
  const params = new URLSearchParams({
    mode: 'direct',
    recipient: parentId,
    contextType: contextType ?? 'general',
  })

  if (contextId) params.set('contextId', contextId)
  return `/ecd/communications?${params.toString()}`
}

function formatContextLabel(contextType: ThreadRow['context_type']) {
  if (contextType === 'application') return 'Application'
  if (contextType === 'pickup') return 'Pickup'
  return 'General'
}

export default async function EcdCommunicationsPage({ searchParams }: CommunicationsPageProps) {
  const { user, ecdId, role } = await requireEcdPortalSession()
  const admin = createAdminClient()

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
      .order('created_at', { ascending: false })
      .limit(8),
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
    admin
      .from('ecd_admins')
      .select('user_id')
      .eq('ecd_id', ecdId),
    admin
      .from('message_threads')
      .select('id,context_type,context_id,participant_ids,created_at')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const centreName = centreResult.data?.name?.trim() || 'Your crèche'
  const templates = ((templatesResult.data ?? []) as Template[]) ?? []
  const unreadNotifications = (unreadNotificationsResult.data ?? []) as EcdNotificationRow[]
  const applicationRecipients = applicationRecipientsResult.data ?? []
  const childRecipients = childRecipientsResult.data ?? []
  const centreParticipantIds = Array.from(
    new Set((centreParticipantsResult.data ?? []).map((row) => String(row.user_id)).filter(Boolean))
  )
  const recentThreads = (recentThreadsResult.data ?? []) as ThreadRow[]

  const threadIds = recentThreads.map((thread) => thread.id)
  const recentMessagesResult =
    threadIds.length > 0
      ? await admin
          .from('messages')
          .select('id,thread_id,sender_id,body,read_by,created_at')
          .in('thread_id', threadIds)
          .order('created_at', { ascending: false })
          .limit(80)
      : { data: [] as MessageRow[] }

  const recentMessages = (recentMessagesResult.data ?? []) as MessageRow[]
  const latestMessageByThread = new Map<string, MessageRow>()
  for (const message of recentMessages) {
    if (!latestMessageByThread.has(message.thread_id)) {
      latestMessageByThread.set(message.thread_id, message)
    }
  }

  const threadParentIds = Array.from(
    new Set(
      recentThreads
        .flatMap((thread) => thread.participant_ids ?? [])
        .filter((participantId) => !centreParticipantIds.includes(participantId))
    )
  )
  const notificationParentIds = Array.from(
    new Set(
      unreadNotifications
        .map((row) => String(row.metadata?.parent_id ?? '').trim())
        .filter(Boolean)
    )
  )
  const profileIds = Array.from(new Set([...threadParentIds, ...notificationParentIds]))
  const parentProfilesResult =
    profileIds.length > 0
      ? await admin.from('user_profiles').select('id,full_name').in('id', profileIds)
      : { data: [] as ProfileRow[] }
  const parentProfiles = new Map(((parentProfilesResult.data ?? []) as ProfileRow[]).map((row) => [row.id, row]))

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
  const initialRecipientParentId =
    searchParams?.recipient && recipients.some((recipient) => recipient.parentId === searchParams.recipient)
      ? searchParams.recipient
      : null
  const initialContextType =
    searchParams?.contextType === 'application' || searchParams?.contextType === 'pickup'
      ? searchParams.contextType
      : 'general'
  const initialContextId = searchParams?.contextId ?? null
  const initialTemplateKey =
    searchParams?.template && templates.some((template) => template.template_key === searchParams.template)
      ? searchParams.template
      : null
  const initialAudience = searchParams?.audience === 'pending' ? 'pending' : 'all'
  const initialMode = searchParams?.mode === 'direct' ? 'direct' : 'broadcast'

  const threadSummaries = recentThreads.map((thread) => {
    const latestMessage = latestMessageByThread.get(thread.id) ?? null
    const parentId =
      (thread.participant_ids ?? []).find((participantId) => !centreParticipantIds.includes(participantId)) ?? null
    const parentName = parentId
      ? normalizeText(parentProfiles.get(parentId)?.full_name, 'Parent')
      : 'Parent'
    const lastSenderIsParent = latestMessage ? latestMessage.sender_id === parentId : false
    const unreadForEcd =
      latestMessage != null &&
      latestMessage.sender_id !== user.id &&
      !(latestMessage.read_by ?? []).includes(user.id)

    return {
      id: thread.id,
      parentId,
      parentName,
      contextLabel: formatContextLabel(thread.context_type),
      preview: normalizeText(latestMessage?.body, 'Conversation started.'),
      createdAt: latestMessage?.created_at ?? thread.created_at,
      unreadForEcd,
      lastSenderLabel: lastSenderIsParent ? 'Parent' : 'Centre',
      replyHref: parentId ? buildReplyHref(parentId, thread.context_type, thread.context_id) : null,
    }
  })

  return (
    <EcdOsShell
      title="Parent Comms"
      description="Read parent messages, send replies, and keep announcements in one clear inbox."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <section className="space-y-6">
        <Card className="rounded-3xl border border-slate-100 bg-white text-slate-900 shadow-sm">
          <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl font-black">Parent Comms</CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 text-slate-600">
                The red badge on this tab comes from the unread parent updates below. Open this page to see exactly who contacted the centre and what needs a reply.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/ecd/communications?mode=broadcast&template=application_update&audience=all"
                className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-2.5 text-sm font-bold text-teal-700 transition-colors hover:bg-teal-100"
              >
                Send update to all parents
              </Link>
              <Link
                href="/ecd/communications?mode=direct&template=application_update"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Reply to one parent
              </Link>
            </div>
          </CardHeader>
        </Card>

        <section className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
          <Card className="rounded-3xl border border-slate-100 bg-white text-slate-900 shadow-sm">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-base font-bold">Compose message</CardTitle>
              <CardDescription className="text-sm text-slate-600">
                One dominant job here: choose broadcast or direct, then send clearly.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <CommunicationsComposer
                ecdId={ecdId}
                centreName={centreName}
                templates={templates}
                recipients={recipients}
                centreParticipantIds={centreParticipantIds}
                initialRecipientParentId={initialRecipientParentId}
                initialContextType={initialContextType}
                initialContextId={initialContextId}
                initialTemplateKey={initialTemplateKey}
                initialAudience={initialAudience}
                initialMode={initialMode}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-3xl border border-slate-100 bg-white text-slate-900 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-3 bg-slate-50/50">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <BellRing className="h-4 w-4 text-teal-600" />
                    New parent updates
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-600">
                    {unreadNotifications.length} unread item{unreadNotifications.length === 1 ? '' : 's'} waiting here.
                  </CardDescription>
                </div>
                {unreadNotifications.length > 0 ? (
                  <form action={markEcdNotificationsReadAction}>
                    <Button type="submit" variant="outline" size="sm" className="rounded-xl">
                      Mark seen
                    </Button>
                  </form>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                {unreadNotifications.length === 0 ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No unread parent updates right now.
                  </p>
                ) : (
                  unreadNotifications.map((item) => {
                    const parentId = String(item.metadata?.parent_id ?? '').trim() || null
                    const threadId = String(item.metadata?.thread_id ?? '').trim() || null
                    const kind = String(item.metadata?.kind ?? '').trim()
                    const parentName = parentId
                      ? normalizeText(parentProfiles.get(parentId)?.full_name, 'Parent')
                      : 'Parent'
                    const replyHref = parentId ? buildReplyHref(parentId, 'general', null) : null

                    return (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {kind === 'parent_message'
                                ? `${parentName} sent a message`
                                : normalizeText(item.title, 'New update')}
                            </p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                          {kind === 'parent_message' ? (
                            <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-teal-700">
                              Message
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {normalizeText(item.message, 'Open Parent Comms to read the latest update.')}
                        </p>
                        {replyHref || threadId ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {replyHref ? (
                              <Button asChild size="sm" className="rounded-xl bg-teal-600 text-white hover:bg-teal-700">
                                <Link href={replyHref}>Reply to parent</Link>
                              </Button>
                            ) : null}
                            {threadId ? (
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                Thread {threadId.slice(0, 8)}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-slate-100 bg-white text-slate-900 shadow-sm">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <MessageSquare className="h-4 w-4 text-cyan-600" />
                  Conversations
                </CardTitle>
                <CardDescription className="text-sm text-slate-600">
                  Recent parent conversations with the latest message preview.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                {threadSummaries.length === 0 ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No parent conversations yet.
                  </p>
                ) : (
                  threadSummaries.map((thread) => (
                    <div key={thread.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{thread.parentName}</p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {thread.contextLabel} · {formatDate(thread.createdAt)}
                          </p>
                        </div>
                        {thread.unreadForEcd ? (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rose-700">
                            New reply
                          </span>
                        ) : (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                            {thread.lastSenderLabel}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{thread.preview}</p>
                      {thread.replyHref ? (
                        <div className="mt-3">
                          <Link href={thread.replyHref} className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800">
                            Reply in Parent Comms
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </section>
    </EcdOsShell>
  )
}
