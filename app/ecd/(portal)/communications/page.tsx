import type { Metadata } from 'next'
import Link from 'next/link'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { CommunicationsComposer } from './composer'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

export const metadata: Metadata = {
  title: 'Messages - CentreConnect',
  description: 'Broadcast updates and send direct parent messages.',
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

export default async function EcdCommunicationsPage({ searchParams }: CommunicationsPageProps) {
  const { supabase, user, ecdId } = await requireEcdPortalSession()
  const [centreResult, templatesResult, recentNotificationsResult, recipientRowsResult, recentThreadsResult] =
    await Promise.all([
      supabase.from('ecd_centres').select('name').eq('id', ecdId).maybeSingle(),
      supabase
        .from('communication_templates')
        .select('template_key,title,body')
        .eq('is_active', true)
        .in('template_key', ['missing_documents', 'open_day_invite', 'application_update', 'spot_available'])
        .order('created_at', { ascending: true }),
      supabase
        .from('parent_notifications')
        .select('id,title,created_at,is_read')
        .eq('ecd_id', ecdId)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('applications')
        .select('parent_id, children(first_name,last_name), parents(user_profiles(full_name))')
        .eq('ecd_id', ecdId)
        .order('submitted_at', { ascending: false })
        .limit(200),
      supabase
        .from('message_threads')
        .select('id,context_type,created_at')
        .eq('ecd_id', ecdId)
        .order('created_at', { ascending: false })
        .limit(8),
    ])

  const centre = centreResult.data
  const templates = ((templatesResult.data ?? []) as Template[]) ?? []
  const recentNotifications = recentNotificationsResult.data ?? []
  const recipientRows = recipientRowsResult.data ?? []
  const recentThreads = recentThreadsResult.data ?? []

  const recipientsByParent = new Map<string, Recipient>()
  for (const row of recipientRows) {
    const parentId = row.parent_id as string | null
    if (!parentId || recipientsByParent.has(parentId)) continue
    const child = Array.isArray(row.children) ? row.children[0] : row.children
    const parent = Array.isArray(row.parents) ? row.parents[0] : row.parents
    const profile = Array.isArray(parent?.user_profiles) ? parent.user_profiles[0] : parent?.user_profiles
    recipientsByParent.set(parentId, {
      parentId,
      label: `${profile?.full_name ?? 'Parent'}${child ? ` (${child.first_name} ${child.last_name})` : ''}`,
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

  return (
    <EcdOsShell
      title="Messages"
      description="Choose Broadcast or Direct first, then send quickly using templates."
      roleLabel="ECD Portal"
      userEmail={user.email ?? 'Unknown email'}
    >
      <section className="space-y-6">
        <Card className="glass-card border border-border bg-card/90 text-foreground">
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href="/ecd/communications?mode=broadcast&template=application_update&audience=all"
              className="rounded-md border border-cyan-500/30 bg-muted px-3 py-2 text-sm font-semibold text-cyan-700 dark:text-cyan-200 transition-colors hover:bg-muted/80"
            >
              Broadcast general update
            </Link>
            <Link
              href="/ecd/communications?mode=broadcast&template=missing_documents&audience=pending"
              className="rounded-md border border-cyan-500/30 bg-muted px-3 py-2 text-sm font-semibold text-cyan-700 dark:text-cyan-200 transition-colors hover:bg-muted/80"
            >
              Ask pending parents for docs
            </Link>
            <Link
              href="/ecd/communications?mode=direct&template=application_update"
              className="rounded-md border border-cyan-500/30 bg-muted px-3 py-2 text-sm font-semibold text-cyan-700 dark:text-cyan-200 transition-colors hover:bg-muted/80"
            >
              Start direct parent chat
            </Link>
          </CardContent>
        </Card>

        <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <Card className="glass-card border border-border bg-card/90 text-foreground">
            <CardHeader>
              <CardTitle>Compose Message</CardTitle>
            </CardHeader>
            <CardContent>
              <CommunicationsComposer
                ecdId={ecdId}
                centreName={centre?.name ?? 'Your centre'}
                templates={templates}
                recipients={recipients}
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
            <Card className="glass-card border border-border bg-card/90 text-foreground">
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(recentNotifications ?? []).length === 0 ? (
                  <p className="text-sm text-slate-400">No notifications sent yet.</p>
                ) : (
                  (recentNotifications ?? []).map((item) => (
                    <div key={item.id} className="rounded-xl border border-border bg-card/80 p-3">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(item.created_at)} | {item.is_read ? 'Read' : 'Unread'}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card className="glass-card border border-border bg-card/90 text-foreground">
              <CardHeader>
                <CardTitle>Recent Threads</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(recentThreads ?? []).length === 0 ? (
                  <p className="text-sm text-slate-400">No thread activity yet.</p>
                ) : (
                  (recentThreads ?? []).map((thread) => (
                    <div key={thread.id} className="rounded-xl border border-border bg-card/80 p-3">
                      <p className="text-sm font-medium text-foreground">Thread {thread.id.slice(0, 8)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {thread.context_type ?? 'general'} | {formatDate(thread.created_at)}
                      </p>
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


