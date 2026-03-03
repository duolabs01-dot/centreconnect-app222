import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

async function loadDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  documentId: string
) {
  const full = await supabase
    .from('parent_documents')
    .select('id,parent_id,file_path,file_name,mime_type')
    .eq('id', documentId)
    .eq('parent_id', ownerId)
    .maybeSingle()

  if (!full.error && full.data) return full.data as ParentDocumentFileRow
  if (!includesMissingColumnError(full.error?.message)) return null

  const fallback = await supabase
    .from('parent_documents')
    .select('id,parent_id,file_path,file_name')
    .eq('id', documentId)
    .eq('parent_id', ownerId)
    .maybeSingle()

  return (fallback.data as ParentDocumentFileRow | null) ?? null
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const document = await loadDocument(supabase, user.id, id)
  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
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

