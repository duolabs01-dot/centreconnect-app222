// ⚠️ ECD ADMIN ONLY
// Allowed imports: components/ecd/* + components/ui/*
// NEVER import from components/cc-admin/*

import { redirect } from 'next/navigation'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { EcdPortalSidebar } from '@/components/layout/ecd-portal-sidebar'
import '../ecd-theme.css'

type EcdLayoutProps = {
  children: React.ReactNode
}

export default async function EcdLayout({ children }: EcdLayoutProps) {
  const { supabase, user, ecdId } = await requireEcdPortalSession()

  const { data: centre } = await supabase
    .from('ecd_centres')
    .select('id')
    .eq('id', ecdId)
    .maybeSingle()

  if (!centre?.id) {
    redirect('/for-centres?status=pending')
  }

  return (
    <div className="ecd-premium-shell min-h-screen flex text-slate-900">
      <EcdPortalSidebar userEmail={user.email ?? null} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
