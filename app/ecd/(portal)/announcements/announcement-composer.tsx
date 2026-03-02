'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QuickPublishPanel } from '@/components/ecd/announcements/quick-publish-panel'

type AnnouncementComposerProps = {
  ecdId: string
  centreName: string
  defaultTitle?: string
  defaultMessage?: string
  sendSimilarHref?: string | null
  createAnnouncementAction: (formData: FormData) => void | Promise<void>
}

export function AnnouncementComposer({
  ecdId,
  centreName,
  defaultTitle = '',
  defaultMessage = '',
  sendSimilarHref,
  createAnnouncementAction,
}: AnnouncementComposerProps) {
  const [tab, setTab] = useState<'quick' | 'custom'>('quick')

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle>Announcement Composer</CardTitle>
        <div className="inline-flex w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setTab('quick')}
            className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold transition-colors ${
              tab === 'quick' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Quick Send
          </button>
          <button
            type="button"
            onClick={() => setTab('custom')}
            className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold transition-colors ${
              tab === 'custom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Write Custom
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tab === 'quick' ? (
          <QuickPublishPanel ecdId={ecdId} centreName={centreName} />
        ) : (
          <form action={createAnnouncementAction} className="grid gap-3">
            <input
              name="title"
              defaultValue={defaultTitle}
              className="cc-native-field"
              placeholder="Announcement title"
              required
            />
            <textarea
              name="content"
              defaultValue={defaultMessage}
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
              {sendSimilarHref ? (
                <Button type="button" variant="outline" asChild>
                  <Link href={sendSimilarHref}>Send Similar Message</Link>
                </Button>
              ) : null}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

