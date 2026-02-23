import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentsVaultManager } from '@/components/parent/DocumentsVaultManager'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import { ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Documents Vault | Parent Portal | CentreConnect',
  description: 'Securely upload and manage parent and child documents for faster applications.',
}

type ParentDocumentRow = {
  id: string
  doc_type: string
  file_name: string
  file_path: string
  expiry_date: string | null
  created_at: string
}

type DocumentAuditLogRow = {
  id: string
  document_id: string
  document_name: string
  owner_id: string
  actor_id: string | null
  action: 'upload' | 'view' | 'download' | 'delete'
  actor_hint: string | null
  created_at: string
}

export default async function ParentDocumentsPage() {
  const perf = startRoutePerf('/parent/profile/documents')
  const supabase = await createClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [{ data: documentsData }, { data: auditLogData }] = await Promise.all([
      supabase
        .from('parent_documents')
        .select('id,doc_type,file_name,file_path,expiry_date,created_at')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('document_audit_log')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold">Document Vault</p>
                <p className="text-slate-400 text-xs">
                  Encrypted - Private - POPIA compliant
                </p>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Only you control your documents. We log every
              view and download so you always know who accessed
              your files.
            </p>
          </div>
        </div>
        <DocumentsVaultManager
          initialDocuments={(documentsData ?? []) as ParentDocumentRow[]}
          initialAuditLog={(auditLogData ?? []) as DocumentAuditLogRow[]}
        />
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}
