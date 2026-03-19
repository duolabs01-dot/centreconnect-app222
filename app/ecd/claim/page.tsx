import type { Metadata } from 'next'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeCentreSlug } from '@/lib/ecd/centre-slug'
import { Container } from '@/components/layout/container'
import { ClaimRequestForm } from '@/components/ecd/ClaimRequestForm'

export const metadata: Metadata = {
  title: 'Claim your CentreConnect listing',
  description: 'Let CentreConnect know you want to claim and manage this centre profile.',
}

type ClaimPageProps = {
  searchParams?: {
    slug?: string
  }
}

export default async function ClaimPage({ searchParams }: ClaimPageProps) {
  const normalizedSlug = normalizeCentreSlug(searchParams?.slug ?? '')
  if (!normalizedSlug) {
    return (
      <Container className="py-12">
        <p className="text-center text-sm text-slate-500">Centre slug missing. Provide ?slug=your-centre.</p>
      </Container>
    )
  }

  await createClient()
  const admin = createAdminClient()
  const { data: centre } = await admin
    .from('public_ecd_centres')
    .select('name')
    .eq('slug', normalizedSlug)
    .maybeSingle()

  const centreName = centre?.name ?? 'Your centre'

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-3xl space-y-6 rounded-[2.5rem] bg-white/90 p-8 shadow-2xl shadow-slate-900/10">
        <div className="space-y-2 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-slate-400">Claim your profile</p>
          <h1 className="text-3xl font-black text-slate-900">Claim {centreName} on CentreConnect</h1>
          <p className="text-sm text-slate-500">
            No login needed. Fill in the form below, and we’ll review your request within 24 hours.
          </p>
        </div>
        <ClaimRequestForm slug={normalizedSlug} centreName={centreName} />
      </div>
    </Container>
  )
}

