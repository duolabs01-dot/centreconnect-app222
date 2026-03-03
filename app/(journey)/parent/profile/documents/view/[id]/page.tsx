import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Download, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { SurfaceCard } from '@/components/ui/surface-card'

export const metadata: Metadata = {
  title: 'Secure Document Viewer | CentreConnect',
  description: 'View uploaded documents inside the secure CentreConnect viewer.',
}

type ViewerPageProps = {
  params: {
    id: string
  }
}

type ParentDocumentRow = {
  id: string
  file_name: string
  doc_type: string | null
  mime_type?: string | null
  created_at: string
}

function includesMissingMimeTypeError(message: string | null | undefined) {
  const value = String(message ?? '').toLowerCase()
  return value.includes('mime_type') && value.includes('does not exist')
}

async function loadDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  documentId: string
) {
  const full = await supabase
    .from('parent_documents')
    .select('id,file_name,doc_type,mime_type,created_at')
    .eq('id', documentId)
    .eq('parent_id', ownerId)
    .maybeSingle()

  if (!full.error && full.data) return full.data as ParentDocumentRow
  if (!includesMissingMimeTypeError(full.error?.message)) return null

  const fallback = await supabase
    .from('parent_documents')
    .select('id,file_name,doc_type,created_at')
    .eq('id', documentId)
    .eq('parent_id', ownerId)
    .maybeSingle()

  return (fallback.data as ParentDocumentRow | null) ?? null
}

function looksInlineFriendly(mimeType: string | null | undefined, fileName: string) {
  const mime = String(mimeType ?? '').toLowerCase()
  if (mime.startsWith('image/')) return true
  if (mime === 'application/pdf') return true
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp'
}

export default async function ParentDocumentViewerPage({ params }: ViewerPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const document = await loadDocument(supabase, user.id, params.id)
  if (!document) notFound()

  const inlineUrl = `/api/parent/documents/${encodeURIComponent(document.id)}/file`
  const downloadUrl = `${inlineUrl}?download=1`
  const canPreviewInline = looksInlineFriendly(document.mime_type ?? null, document.file_name)

  return (
    <div className="min-h-screen space-y-5 bg-surface-secondary px-4 pb-20 pt-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-cyan-600" />
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Secure Viewer</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-10 rounded-xl" asChild>
            <Link href="/parent/profile/documents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800" asChild>
            <a href={downloadUrl}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          </Button>
        </div>
      </header>

      <SurfaceCard className="space-y-4 p-4 sm:p-6">
        <div className="space-y-1">
          <h1 className="break-words text-xl font-black tracking-tight text-slate-900">{document.file_name}</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {document.doc_type?.replaceAll('_', ' ') || 'Document'} • Uploaded{' '}
            {new Date(document.created_at).toLocaleDateString('en-ZA')}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {canPreviewInline ? (
            <iframe
              title={document.file_name}
              src={inlineUrl}
              className="h-[72vh] w-full bg-white"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="max-w-sm text-sm text-slate-600">
                This file type is protected and not previewable inline. Use download to view it securely.
              </p>
              <Button className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800" asChild>
                <a href={downloadUrl}>
                  <Download className="mr-2 h-4 w-4" />
                  Download document
                </a>
              </Button>
            </div>
          )}
        </div>
      </SurfaceCard>
    </div>
  )
}

