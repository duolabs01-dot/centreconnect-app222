import type { Metadata } from 'next'
import Link from 'next/link'
import { MessageSquare, Send, ArrowDown, ArrowUp, Megaphone, BellRing, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { markEcdNotificationsReadAction } from './actions'
import { CommunicationsComposer } from './composer'
import { DirectMessagePanel } from './direct-message-panel'

export const metadata: Metadata = {
  title: 'Messages - CentreConnect',
  description: 'Direct messages with parents and centre-wide announcements.',
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

type ApplicationRow = {
  parent_id: string | null
  children: Array<{ first_name: string | null; last_name: string | null }> | null
  parents: Array<{ user_profiles: Array<{ full_name: string | null }> }> | null
}

type ChildRow = {
  parent_id: string | null
  first_name: string | null
  last_name: string | null
  parents: Array<{ user_profiles: Array<{ full_name: string | null }> }> | null
}

type EcdNotificationRow = {
  id: string
  title: string | null
  message: string | null
  created_at: string
  metadata: Record<string, unknown> | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalizeText(value: string | null | undefined, fallback: string) {
  const next = String(value ?? '').trim()
  return next || fallback
}

function formatContextLabel(contextType: string | null) {
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

export default async function EcdCommunicationsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams?: Promise<{ recipient?: string; contextType?: string; contextId?: string; tab?: string; q?: string }>
}) {
  const searchParams = await searchParamsPromise
  const { user, ecdId, role } = await requireEcdPortalSession()
  const admin = createAdminClient()

  const requestedParentId = String(searchParams?.recipient ?? '').trim() || null
  const requestedContextType = searchParams?.contextType === 'application' || searchParams?.contextType === 'pickup'
    ? (searchParams.contextType as SupportedContextType)
    : 'general'
  const requestedContextId = String(searchParams?.contextId ?? '').trim() || null
  const activeTab = searchParams?.tab === 'announcements' ? 'announcements' : searchParams?.tab === 'sent' ? 'sent' : 'messages'
  const searchQuery = String(searchParams?.q ?? '').trim().toLowerCase()

  const [
    centreResult,
    templatesResult,
    unreadNotificationsResult,
    centreParticipantsResult,
    recentThreadsResult,
    applicationRecipientsResult,
    childRecipientsResult,
    outboxMessagesResult,
    announcementsHistoryResult,
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
    admin.from('ecd_admins').select('user_id').eq('ecd_id', ecdId),
    admin
      .from('message_threads')
      .select('id,context_type,context_id,participant_ids,created_at')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(50),
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
      .from('messages')
      .select('id,thread_id,sender_id,body,created_at')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    admin
      .from('parent_notifications')
      .select('id,title,message,created_at,parent_id')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const centreName = centreResult.data?.name?.trim() || 'Your crèche'
  const templates = ((templatesResult.data ?? []) as Template[]) ?? []
  const unreadNotifications = (unreadNotificationsResult.data ?? []) as EcdNotificationRow[]
  const centreParticipantIds = Array.from(
    new Set((centreParticipantsResult.data ?? []).map((row: any) => String(row.user_id)).filter(Boolean))
  )
  const recentThreads = ((recentThreadsResult.data ?? []) as ThreadRow[]).filter((thread) =>
    (thread.participant_ids ?? []).some((participantId) => !centreParticipantIds.includes(participantId))
  )
  const outboxMessages = (outboxMessagesResult.data ?? []) as MessageRow[]

  const recipientsByParent = new Map<string, Recipient>()

  for (const row of (applicationRecipientsResult.data ?? []) as ApplicationRow[]) {
    const parentId = String(row.parent_id ?? '').trim()
    if (!parentId || recipientsByParent.has(parentId)) continue
    const child = normalizeOne(row.children)
    const parent = normalizeOne(row.parents)
    const profile = normalizeOne(parent?.user_profiles ?? null)
    const childName = `${normalizeText(child?.first_name, '')} ${normalizeText(child?.last_name, '')}`.trim()
    recipientsByParent.set(parentId, {
      parentId,
      label: `${normalizeText(profile?.full_name, 'Parent')}${childName ? ` (${childName})` : ''}`,
    })
  }

  for (const row of (childRecipientsResult.data ?? []) as ChildRow[]) {
    const parentId = String(row.parent_id ?? '').trim()
    if (!parentId || recipientsByParent.has(parentId)) continue
    const parent = normalizeOne(row.parents)
    const profile = normalizeOne(parent?.user_profiles ?? null)
    const childName = `${normalizeText(row.first_name, '')} ${normalizeText(row.last_name, '')}`.trim()
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
          .limit(200)
      : { data: [] as MessageRow[] }
  const latestMessages = (latestMessagesResult.data ?? []) as MessageRow[]
  const latestMessageByThread = new Map<string, MessageRow>()
  for (const message of latestMessages) {
    if (!latestMessageByThread.has(message.thread_id)) {
      latestMessageByThread.set(message.thread_id, message)
    }
  }

  const parentIdsFromThreads = Array.from(
    new Set(recentThreads.flatMap((thread) =>
      (thread.participant_ids ?? []).filter((participantId) => !centreParticipantIds.includes(participantId))
    ))
  )
  const parentIdsFromOutbox = Array.from(
    new Set(outboxMessages.map((msg) => msg.sender_id))
  )
  const allParentIds = [...new Set([...parentIdsFromThreads, ...parentIdsFromOutbox])]

  const parentProfilesResult =
    allParentIds.length > 0
      ? await admin.from('user_profiles').select('id,full_name').in('id', allParentIds)
      : { data: [] as ProfileRow[] }
  const parentProfiles = new Map(((parentProfilesResult.data ?? []) as ProfileRow[]).map((row: any) => [row.id, row]))

  const threadSummaries = recentThreads.map((thread) => {
    const parentId =
      (thread.participant_ids ?? []).find((participantId) => !centreParticipantIds.includes(participantId)) ?? null
    const latestMessage = latestMessageByThread.get(thread.id) ?? null
    const parentLabel = normalizeText(parentId ? parentProfiles.get(parentId)?.full_name : null, 'Parent')

    return {
      id: thread.id,
      parentId,
      parentLabel,
      contextType: thread.context_type ?? 'general',
      contextId: thread.context_id,
      preview: normalizeText(latestMessage?.body, 'Conversation started.'),
      createdAt: latestMessage?.created_at ?? thread.created_at,
      isOutgoing: latestMessage?.sender_id === user.id,
      href: parentId ? buildConversationHref(parentId, thread.context_type ?? 'general', thread.context_id) : null,
    }
  })

  const filteredThreadSummaries = searchQuery
    ? threadSummaries.filter(t => 
        t.parentLabel.toLowerCase().includes(searchQuery) ||
        t.preview.toLowerCase().includes(searchQuery)
      )
    : threadSummaries

  const outboxSummaries = outboxMessages.map((msg) => {
    const parentLabel = normalizeText(parentProfiles.get(msg.sender_id)?.full_name ?? null, 'Parent')
    return {
      id: msg.id,
      threadId: msg.thread_id,
      body: msg.body,
      createdAt: msg.created_at,
      recipientLabel: parentLabel,
    }
  })

  const filteredOutbox = searchQuery
    ? outboxSummaries.filter(o => 
        o.recipientLabel.toLowerCase().includes(searchQuery) ||
        o.body.toLowerCase().includes(searchQuery)
      )
    : outboxSummaries

  const selectedThread =
    requestedParentId
      ? threadSummaries.find(
          (thread) =>
            thread.parentId === requestedParentId &&
            thread.contextType === requestedContextType &&
            (thread.contextId ?? null) === requestedContextId
        ) ?? threadSummaries.find((thread) => thread.parentId === requestedParentId)
      : threadSummaries[0] ?? null

  const selectedRecipientParentId = selectedThread?.parentId ?? requestedParentId ?? null
  const selectedContextType = selectedThread?.contextType ?? requestedContextType
  const selectedContextId = selectedThread?.contextId ?? requestedContextId
  const selectedRecipientLabel =
    selectedRecipientParentId
      ? normalizeText(parentProfiles.get(selectedRecipientParentId)?.full_name ?? null, 'Parent')
      : 'Parent'

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

  const unreadCount = filteredThreadSummaries.filter(t => !t.isOutgoing).length

  return (
    <section className="space-y-6">
        <Tabs defaultValue={activeTab} className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3 rounded-2xl bg-slate-100 p-1">
            <TabsTrigger value="messages" className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <ArrowDown className="h-4 w-4" />
              Inbox
              {unreadCount > 0 && (
                <span className="ml-1 rounded-full bg-teal-600 px-2 py-0.5 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <ArrowUp className="h-4 w-4" />
              Sent
            </TabsTrigger>
            <TabsTrigger value="announcements" className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Megaphone className="h-4 w-4" />
              Announcements
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <form method="GET" className="flex gap-2">
              <input type="hidden" name="tab" value={activeTab} />
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Search conversations..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <Button type="submit" variant="outline" className="rounded-xl border-slate-200">
                Search
              </Button>
              {searchQuery && (
                <Link
                  href={`/ecd/communications?tab=${activeTab}`}
                  className="flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Clear
                </Link>
              )}
            </form>
          </div>

          {unreadNotifications.length > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <BellRing className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-semibold text-amber-900">
                  {unreadNotifications.length} new parent message{unreadNotifications.length === 1 ? '' : 's'}
                </span>
              </div>
              <form action={markEcdNotificationsReadAction}>
                <Button type="submit" variant="outline" size="sm" className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-100">
                  Mark as seen
                </Button>
              </form>
            </div>
          )}

          <TabsContent value="messages" className="mt-6 space-y-4">
            <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
              <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
                <CardHeader className="bg-slate-50/50">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <MessageSquare className="h-4 w-4 text-teal-600" />
                    Conversations
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-600">
                    Direct messages with parents.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pt-4">
                  {filteredThreadSummaries.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      No conversations yet. Parents will message you here.
                    </div>
                  ) : (
                    filteredThreadSummaries.map((thread) => {
                      const active = selectedRecipientParentId === thread.parentId
                      return (
                        <Link
                          key={thread.id}
                          href={thread.href ?? '/ecd/communications?tab=messages'}
                          className={
                            active
                              ? 'block rounded-2xl border border-teal-200 bg-teal-50 p-4 shadow-sm'
                              : 'block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-teal-200 hover:bg-teal-50/60'
                          }
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{thread.parentLabel}</p>
                              <p className="mt-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                                  {formatContextLabel(thread.contextType)}
                                </span>
                                <span>·</span>
                                <span>{formatDate(thread.createdAt)}</span>
                              </p>
                            </div>
                            {thread.isOutgoing ? (
                              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-700">
                                Sent
                              </span>
                            ) : (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                                New
                              </span>
                            )}
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{thread.preview}</p>
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
                  threadId={selectedThread?.id ?? null}
                  messages={selectedMessages}
                />
              ) : (
                <Card className="flex min-h-[400px] items-center justify-center rounded-3xl border border-slate-100 bg-white shadow-sm">
                  <CardContent className="space-y-3 p-8 text-center">
                    <p className="text-lg font-black text-slate-900">Select a conversation</p>
                    <p className="max-w-md text-sm leading-6 text-slate-600">
                      Choose a parent conversation from the list to read messages and reply.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sent" className="mt-6">
            <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Send className="h-4 w-4 text-cyan-600" />
                  Sent Messages
                </CardTitle>
                <CardDescription className="text-sm text-slate-600">
                  Messages you have sent to parents.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {outboxSummaries.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No messages sent yet. Start a conversation from the Inbox tab.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredOutbox.map((msg) => (
                      <div
                        key={msg.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">To: {msg.recipientLabel}</p>
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                              {formatDate(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{msg.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements" className="mt-6 space-y-6">
            <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Megaphone className="h-4 w-4 text-cyan-600" />
                  Centre Announcements
                </CardTitle>
                <CardDescription className="text-sm text-slate-600">
                  Send updates to all parents or specific groups.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <CommunicationsComposer
                  ecdId={ecdId}
                  centreName={centreName}
                  templates={templates}
                  recipients={recipients}
                  centreParticipantIds={centreParticipantIds}
                  allowedModes={['broadcast']}
                  initialMode="broadcast"
                />
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Send className="h-4 w-4 text-teal-600" />
                  Announcement History
                </CardTitle>
                <CardDescription className="text-sm text-slate-600">
                  Recent announcements sent to parents.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {(() => {
                  const announcements = (announcementsHistoryResult.data ?? []) as Array<{ id: string; title: string | null; message: string | null; created_at: string; parent_id: string }>
                  const groupedByTitle = new Map<string, { count: number; firstDate: string; title: string; message: string | null }>()
                  
                  for (const row of announcements) {
                    const key = row.title ?? 'Update'
                    const existing = groupedByTitle.get(key)
                    if (existing) {
                      existing.count++
                    } else {
                      groupedByTitle.set(key, {
                        count: 1,
                        firstDate: row.created_at,
                        title: row.title ?? 'Update',
                        message: row.message,
                      })
                    }
                  }
                  
                  const history = Array.from(groupedByTitle.values()).sort((a, b) => 
                    new Date(b.firstDate).getTime() - new Date(a.firstDate).getTime()
                  ).slice(0, 10)

                  if (history.length === 0) {
                    return (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        No announcements sent yet.
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-3">
                      {history.map((item, idx) => (
                        <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{item.title}</p>
                              <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                                {formatDate(item.firstDate)} · {item.count} recipient{item.count !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          {item.message && (
                            <p className="mt-3 text-sm leading-6 text-slate-600 line-clamp-2">{item.message}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </section>
  )
}
