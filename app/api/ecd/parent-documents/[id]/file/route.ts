import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const DOCUMENT_BUCKET = 'parent-documents'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type ParentDocumentFileRow = {
  id: string
  parent_id: string
  file_path: string
  file_name: string
  mime_type?: string | null
}

function sanitizeFileName(name: string) {
  return name.replace(/["\r\n]/g, '_').trim() || 'document'
}

function includesMissingColumnError(message: string | null | undefined) {
  const value = String(message ?? '').toLowerCase()
  return value.includes('column') && value.includes('mime_type') && value.includes('does not exist')
}

async function loadDocument(documentId: string) {
  const admin = createAdminClient()
  const full = await admin
    .from('parent_documents')
    .select('id,parent_id,file_path,file_name,mime_type')
    .eq('id', documentId)
    .maybeSingle()

  if (!full.error && full.data) return full.data as ParentDocumentFileRow
  if (!includesMissingColumnError(full.error?.message)) return null

  const fallback = await admin
    .from('parent_documents')
    .select('id,parent_id,file_path,file_name')
    .eq('id', documentId)
    .maybeSingle()

  return (fallback.data as ParentDocumentFileRow | null) ?? null
}

async function ecdCanAccessParentDocument(
  supabase: Awaited<ReturnType<typeof requireEcdPortalSession>>['supabase'],
  ecdId: string,
  parentId: string
) {
  const [applicationAccess, childAccess] = await Promise.all([
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('ecd_id', ecdId)
      .eq('parent_id', parentId)
      .limit(1),
    supabase
      .from('children')
      .select('id', { count: 'exact', head: true })
      .eq('ecd_id', ecdId)
      .eq('parent_id', parentId)
      .limit(1),
  ])

  return (applicationAccess.count ?? 0) > 0 || (childAccess.count ?? 0) > 0
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const session = await requireEcdPortalSession()
  const document = await loadDocument(id)

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const hasAccess = await ecdCanAccessParentDocument(session.supabase, session.ecdId, document.parent_id)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Document not available for this creche' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: fileBlob, error: fileError } = await admin.storage
    .from(DOCUMENT_BUCKET)
    .download(document.file_path)

  if (fileError || !fileBlob) {
    return NextResponse.json({ error: fileError?.message ?? 'Document unavailable' }, { status: 404 })
  }

  const params = new URL(request.url).searchParams
  const shouldDownload = params.get('download') === '1'
  const contentType =
    (document.mime_type && document.mime_type.trim()) || fileBlob.type || 'application/octet-stream'

  return new NextResponse(fileBlob.stream(), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `${shouldDownload ? 'attachment' : 'inline'}; filename="${sanitizeFileName(document.file_name)}"`,
      'Cache-Control': 'private, max-age=60',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  })
}
