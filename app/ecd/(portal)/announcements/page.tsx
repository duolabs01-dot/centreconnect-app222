import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ecd/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { QuickPublishPanel } from '@/components/ecd/announcements/quick-publish-panel'
import { formatDate } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

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
    title: '🚗 Pickup Reminder',
    message: 'Friendly reminder: please bring your pickup code and arrive before closing time today.',
    commsTemplate: 'application_update',
  },
  fee: {
    title: '💳 Fee Reminder',
    message: 'Monthly fees are due soon. Please check your billing tab for invoice status and support options.',
    commsTemplate: 'application_update',
  },
  event: {
    title: '📅 Event Update',
    message: 'Please note an upcoming centre event. Full details are available in the calendar section.',
    commsTemplate: 'open_day_invite',
  },
  health: {
    title: '🩺 Health Notice',
    message: 'Please keep children at home if unwell and notify the centre if symptoms start.',
    commsTemplate: 'application_update',
  },
}

export default async function EcdAnnouncementsPage({ searchParams }: AnnouncementsPageProps) {
  const { supabase, user, ecdId } = await requireEcdPortalSession()
  const { data: centre } = await supabase.from('ecd_centres').select('name').eq('id', ecdId).maybeSingle()
  const publishedFilter = searchParams?.published === 'false' ? 'false' : 'all'
  const selectedTemplate =
    searchParams?.template && announcementTemplates[searchParams.template]
      ? announcementTemplates[searchParams.template]
      : null

  async function createAnnouncement(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const title = String(formData.get('title') ?? '').trim()
    const content = String(formData.get('content') ?? '').trim()
    const publishNow = String(formData.get('publish_now') ?? '') === 'on'
    if (!title || !content) return

    await session.supabase.from('announcements').insert({
      ecd_id: session.ecdId,
      title,
      content,
      is_published: publishNow,
      published_at: publishNow ? new Date().toISOString() : null,
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

    await session.supabase
      .from('announcements')
      .update({
        is_published: nextPublished,
        published_at: nextPublished ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .eq('ecd_id', session.ecdId)

    revalidatePath('/ecd/announcements')
  }

  let query = supabase
    .from('announcements')
    .select('id,title,is_published,created_at,published_at')
    .eq('ecd_id', ecdId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (publishedFilter !== 'all') {
    query = query.eq('is_published', false)
  }
  const { data } = await query
  const announcements = data ?? []

  return (
    <EcdOsShell
      title="Announcements"
      description="This page is for creating and publishing announcements quickly."
      roleLabel="ECD Portal"
      userEmail={user.email ?? 'Unknown email'}
    >
      <section className="space-y-6">
        <Card className="border-emerald-200 bg-emerald-50/60">
          <CardHeader>
            <CardTitle>Quick Publish</CardTitle>
          </CardHeader>
          <CardContent>
            <QuickPublishPanel ecdId={ecdId} centreName={centre?.name ?? 'Your centre'} />
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/60">
          <CardHeader>
            <CardTitle>Create Broadcast Announcement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={createAnnouncement} className="grid gap-3">
              <input
                name="title"
                defaultValue={selectedTemplate?.title ?? ''}
                className="cc-native-field"
                placeholder="Announcement title"
                required
              />
              <textarea
                name="content"
                defaultValue={selectedTemplate?.message ?? ''}
                className="cc-native-field h-auto min-h-28 py-2"
                placeholder="Write your announcement message..."
                required
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="publish_now" />
                Publish immediately
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Save Announcement</Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/ecd/communications?mode=broadcast">Open Messages</Link>
                </Button>
                {searchParams?.template && announcementTemplates[searchParams.template]?.commsTemplate ? (
                  <Button type="button" variant="outline" asChild>
                    <Link
                      href={`/ecd/communications?mode=broadcast&template=${announcementTemplates[searchParams.template]?.commsTemplate}&audience=all`}
                    >
                      Send Similar Message
                    </Link>
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

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
              <div className="overflow-x-auto rounded-md border border-slate-200">
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
                        <TableCell>{item.is_published ? 'Published' : 'Draft'}</TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
                        <TableCell>{item.published_at ? formatDate(item.published_at) : '--'}</TableCell>
                        <TableCell className="text-right">
                          <form action={toggleAnnouncementStatus}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="next_published" value={item.is_published ? 'false' : 'true'} />
                            <Button size="sm" variant="outline" type="submit">
                              {item.is_published ? 'Unpublish' : 'Publish'}
                            </Button>
                          </form>
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
    </EcdOsShell>
  )
}
