import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DocumentsVaultManager } from '@/components/parent/DocumentsVaultManager'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'

export const metadata: Metadata = {
  title: 'Documents Vault | Parent Portal | CentreConnect',
  description: 'Securely upload and manage parent and child documents for faster applications.',
}

export default async function ParentDocumentsPage() {
  const perf = startRoutePerf('/parent/profile/documents')
  const supabase = await createClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data } = await supabase
      .from('parent_documents')
      .select('id,doc_type,file_name,file_path,expiry_date,created_at')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false })

    return (
      <div className="space-y-6">
        <section className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Documents Vault</h1>
            <p className="mt-1 text-sm text-slate-600">Store family documents securely and stay ahead of expiry dates.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/parent/profile">Back</Link>
          </Button>
        </section>
        <DocumentsVaultManager initialDocuments={(data ?? []) as any} />
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}
