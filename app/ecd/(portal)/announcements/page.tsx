import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { AnnouncementComposer } from './announcement-composer'

export const metadata: Metadata = {
  title: 'Announcements - CentreConnect',
  description: 'Create and publish broadcast announcements for parents and staff.',
}

type AnnouncementsPageProps = {
  searchParams?: {
    published?: string
    template?: string
  }
}

const announcementTemplates: Record<string, { title: string; message: string; commsTemplate?: string }> = {
  pickup: {
    title: 'Pickup Reminder',
    message: 'Friendly reminder: please bring your pickup code and collect your child before closing time today.',
    commsTemplate: 'pickup_reminder',
  },
  fee: {
    title: 'Fee Reminder',
    message: 'Monthly fees are due soon. Please check Billing in the app if you need your invoice details.',
    commsTemplate: 'payment_reminder',
  },
  event: {
    title: 'Event Update',
    message: 'We have an upcoming parent event at the crèche. Please check Calendar for the date and time.',
    commsTemplate: 'parent_meeting_invite',
  },
  health: {
    title: 'Health Notice',
    message: 'Please keep children at home if they are unwell, and let the crèche know as soon as possible.',
    commsTemplate: 'health_notice',
  },
}

export default async function EcdAnnouncementsPage({ searchParams }: AnnouncementsPageProps) {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const { data: centre } = await supabase.from('ecd_centres').select('name').eq('id', ecdId).maybeSingle()
  const publishedFilter = searchParams?.published === 'false' ? 'false' : 'all'
  const selectedTemplate =
    searchParams?.template && announcementTemplates[searchParams.template]
      ? announcementTemplates[searchParams.template]
      : null
  const sendSimilarHref =
    searchParams?.template && announcementTemplates[searchParams.template]?.commsTemplate
      ? `/ecd/communications?mode=broadcast&template=${announcementTemplates[searchParams.template]?.commsTemplate}&audience=all`
      : null

  async function createAnnouncement(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const title = String(formData.get('title') ?? '').trim()
    const content = String(formData.get('content') ?? '').trim()
    const publishNow = String(formData.get('publish_now') ?? '') === 'on'
    if (!title || !content) return
    let canPublishAnnouncements = true
    if (session.role === 'ecd_supervisor') {
      const { data: membership } = await session.supabase
        .from('ecd_admins')
        .select('can_publish_announcements')
        .eq('ecd_id', session.ecdId)
        .eq('user_id', session.user.id)
        .maybeSingle()
      canPublishAnnouncements = membership?.can_publish_announcements === true
    }

    const pendingAdminApproval = session.role === 'ecd_supervisor' && !canPublishAnnouncements
    const shouldPublishNow = publishNow && !pendingAdminApproval

    await session.supabase.from('announcements').insert({
      ecd_id: session.ecdId,
      title,
      content,
      is_published: shouldPublishNow,
      published_at: shouldPublishNow ? new Date().toISOString() : null,
      pending_admin_approval: pendingAdminApproval,
      created_by: session.user.id,
    })

    revalidatePath('/ecd/announcements')
  }

  async function toggleAnnouncementStatus(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const id = String(formData.get('id') ?? '').trim()
    const nextPublished = String(formData.get('next_published') ?? 'false') === 'true'
    if (!id) return
    const { data: announcement } = await session.supabase
      .from('announcements')
      .select('pending_admin_approval')
      .eq('id', id)
      .eq('ecd_id', session.ecdId)
      .maybeSingle()

    if (nextPublished && announcement?.pending_admin_approval && session.role !== 'ecd_admin') {
      return
    }

    await session.supabase
      .from('announcements')
      .update({
        is_published: nextPublished,
        published_at: nextPublished ? new Date().toISOString() : null,
        pending_admin_approval: nextPublished ? false : announcement?.pending_admin_approval ?? false,
      })
      .eq('id', id)
      .eq('ecd_id', session.ecdId)

    revalidatePath('/ecd/announcements')
  }

  let query = supabase
    .from('announcements')
    .select('id,title,is_published,created_at,published_at,pending_admin_approval')
    .eq('ecd_id', ecdId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (publishedFilter !== 'all') {
    query = query.eq('is_published', false)
  }
  const { data } = await query
  const announcements = data ?? []

  return (
    <>
      <section className="space-y-6">
        <AnnouncementComposer
          ecdId={ecdId}
          centreName={centre?.name ?? 'Your crèche'}
          defaultTitle={selectedTemplate?.title ?? ''}
          defaultMessage={selectedTemplate?.message ?? ''}
          sendSimilarHref={sendSimilarHref}
          createAnnouncementAction={createAnnouncement}
        />

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Announcement List</CardTitle>
          </CardHeader>
          <CardContent>
            <form method="get" action="/ecd/announcements" className="mb-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant={publishedFilter === 'all' ? 'default' : 'outline'}>
                <Link href="/ecd/announcements">All</Link>
              </Button>
              <Button asChild size="sm" variant={publishedFilter === 'false' ? 'default' : 'outline'}>
                <Link href="/ecd/announcements?published=false">Drafts</Link>
              </Button>
            </form>

            {announcements.length === 0 ? (
              <EmptyState
                title="No announcements yet"
                description="Use Quick Publish above for the fastest flow."
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Published</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell>
                          {item.pending_admin_approval ? (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              Pending Admin Approval
                            </span>
                          ) : item.is_published ? (
                            'Published'
                          ) : (
                            'Draft'
                          )}
                        </TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
                        <TableCell>{item.published_at ? formatDate(item.published_at) : '--'}</TableCell>
                        <TableCell className="text-right">
                          {item.pending_admin_approval && role !== 'ecd_admin' ? (
                            <span className="text-xs text-slate-500">Awaiting admin</span>
                          ) : (
                            <form action={toggleAnnouncementStatus}>
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="next_published" value={item.is_published ? 'false' : 'true'} />
                              <Button size="sm" variant="outline" type="submit">
                                {item.is_published ? 'Unpublish' : 'Publish'}
                              </Button>
                            </form>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  )
}






