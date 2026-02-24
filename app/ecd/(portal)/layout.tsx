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
  const { supabase, user, role, ecdId } = await requireEcdPortalSession()

  const { data: centre } = await supabase
    .from('ecd_centres')
    .select('id')
    .eq('id', ecdId)
    .maybeSingle()

  if (!centre?.id) {
    redirect('/for-centres?status=pending')
  }

  return (
    <div className="ecd-premium-shell h-screen overflow-hidden flex">
      <EcdPortalSidebar userEmail={user.email ?? null} userRole={role} />
      <main className="flex-1 overflow-y-auto [scrollbar-width:none] hover:[scrollbar-width:thin] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 hover:[&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300/80">
        <div className="mx-auto max-w-[1600px] px-6 pb-6 pt-20 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  )
}
