import type { Metadata } from 'next'
import Link from 'next/link'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
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
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <section className="space-y-6">
        <Card className="border border-slate-100 bg-white text-slate-900 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">Quick Start</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 pt-6">
            <Link
              href="/ecd/communications?mode=broadcast&template=application_update&audience=all"
              className="rounded-2xl border border-teal-100 bg-teal-50/50 px-4 py-2.5 text-sm font-bold text-teal-700 transition-all hover:bg-teal-50"
            >
              Broadcast general update
            </Link>
            <Link
              href="/ecd/communications?mode=broadcast&template=missing_documents&audience=pending"
              className="rounded-2xl border border-teal-100 bg-teal-50/50 px-4 py-2.5 text-sm font-bold text-teal-700 transition-all hover:bg-teal-50"
            >
              Ask pending parents for docs
            </Link>
            <Link
              href="/ecd/communications?mode=direct&template=application_update"
              className="rounded-2xl border border-teal-100 bg-teal-50/50 px-4 py-2.5 text-sm font-bold text-teal-700 transition-all hover:bg-teal-50"
            >
              Start direct parent chat
            </Link>
          </CardContent>
        </Card>

        <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <Card className="border border-slate-100 bg-white text-slate-900 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-base font-bold">Compose Message</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <CommunicationsComposer
                ecdId={ecdId}
                centreName={centre?.name ?? 'Your crèche'}
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
            <Card className="border border-slate-100 bg-white text-slate-900 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-base font-bold">Recent Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                {(recentNotifications ?? []).length === 0 ? (
                  <p className="text-sm text-slate-400">No notifications sent yet.</p>
                ) : (
                  (recentNotifications ?? []).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-50 bg-slate-50/30 p-4 transition-all hover:bg-slate-50">
                      <p className="text-sm font-bold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {formatDate(item.created_at)} â€¢ {item.is_read ? 'Read' : 'Unread'}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card className="border border-slate-100 bg-white text-slate-900 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-base font-bold">Recent Threads</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                {(recentThreads ?? []).length === 0 ? (
                  <p className="text-sm text-slate-400">No thread activity yet.</p>
                ) : (
                  (recentThreads ?? []).map((thread) => (
                    <div key={thread.id} className="rounded-2xl border border-slate-50 bg-slate-50/30 p-4 transition-all hover:bg-slate-50">
                      <p className="text-sm font-bold text-slate-900">Thread {thread.id.slice(0, 8)}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {thread.context_type ?? 'general'} â€¢ {formatDate(thread.created_at)}
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







