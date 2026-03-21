import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type PublicTrustDocument = {
  documentType: string
  label: string
  status: string
  fileUrl: string | null
  expiresAt: string | null
  notes: string | null
}

export async function loadPublicTrustDocuments(centreId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('compliance_documents')
    .select('document_type,label,status,file_url,expires_at,notes')
    .eq('ecd_id', centreId)
    .in('document_type', ['health_clearance', 'dsd_registration', 'partial_care'])
    .order('status', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[public-trust-documents] Failed to load trust documents:', error)
    return [] as PublicTrustDocument[]
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row: any) => ({
    documentType: String(row.document_type ?? ''),
    label: String(row.label ?? 'Compliance document').trim(),
    status: String(row.status ?? 'missing').trim(),
    fileUrl: typeof row.file_url === 'string' && row.file_url.trim() ? row.file_url.trim() : null,
    expiresAt: typeof row.expires_at === 'string' && row.expires_at.trim() ? row.expires_at.trim() : null,
    notes: typeof row.notes === 'string' && row.notes.trim() ? row.notes.trim() : null,
  }))
}
