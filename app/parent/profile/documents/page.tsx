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
      <div className="space-y-8 overflow-x-hidden pb-12">
        <header>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-cyan-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Security Vault</p>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900">Documents Vault</h1>
          <p className="mt-2 text-sm text-slate-500 font-medium max-w-xl">
            Securely store and manage your official identity documents. Authorised centres only receive access during active enrolment protocols.
          </p>
        </header>

        <SurfaceCard className="p-6 bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-cyan-500/20 transition-colors" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <p className="font-black text-white leading-tight">POPIA Compliant Storage</p>
              <p className="text-xs text-slate-400 font-medium mt-1">End-to-end encrypted - Private - Controlled Access</p>
            </div>
          </div>
        </SurfaceCard>

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
