import type { Metadata } from 'next'
import Link from 'next/link'
import { Compass, Heart, Scale, Sparkles } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { SurfaceCard } from '@/components/ui/surface-card'
import { parseAgeGroupsToMonths } from '@/types/centre-card'
import type { CentreCardData } from '@/types/centre-card'
import { ShortlistCardGrid } from './ShortlistCardGrid'

export const metadata: Metadata = {
  title: 'Saved Cr\u00E8ches | CentreConnect',
  description: 'Your saved cr\u00E8ches, ready to compare and revisit.',
}

type ShortlistCentreRow = {
  id: string
  slug: string | null
  name: string | null
  tagline: string | null
  suburb: string | null
  city: string | null
  age_groups: string[] | null
  is_registered: boolean | null
  logo_url: string | null
  cover_image_url: string | null
  fees_display_mode: 'exact' | 'range' | 'contact' | null
  monthly_fee_min: number | null
  monthly_fee_max: number | null
  registration_fee: number | null
  subsidy_accepted: boolean | null
  contact_whatsapp: string | null
  contact_phone: string | null
  owner_id: string | null
}

export default async function ParentShortlistPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const shortlistRows = user
    ? await supabase
        .from('parent_shortlists')
        .select('centre_id, created_at')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false })
        .limit(24)
    : { data: [] }

  const centreIds = ((shortlistRows.data ?? []) as Array<{ centre_id: string }>).map(
    (row: { centre_id: string }) => row.centre_id
  )

  let cardData: CentreCardData[] = []

  if (centreIds.length > 0) {
    // Note: 'phone' is NOT in public_ecd_centres — use contact_phone only.
    // owner_id is included to derive is_claimed without a second query.
    const { data: centresRaw } = await admin
      .from('public_ecd_centres')
      .select(
        'id,slug,name,tagline,suburb,city,age_groups,is_registered,logo_url,cover_image_url,fees_display_mode,monthly_fee_min,monthly_fee_max,registration_fee,subsidy_accepted,contact_whatsapp,contact_phone,owner_id'
      )
      .in('id', centreIds)

    const centresById = new Map(
      ((centresRaw ?? []) as ShortlistCentreRow[]).map((c) => [c.id, c])
    )

    cardData = centreIds
      .map((centreId) => centresById.get(centreId))
      .filter((c): c is ShortlistCentreRow => Boolean(c))
      .map((c) => {
        const isClaimed = Boolean(c.owner_id?.trim())
        const { age_min_months, age_max_months } = parseAgeGroupsToMonths(c.age_groups)
        return {
          id: c.id,
          slug: c.slug ?? c.id,
          name: c.name?.trim() || 'Cr\u00E8che',
          suburb: c.suburb ?? null,
          area: c.city ?? null,
          fee_min: c.monthly_fee_min ?? null,
          fee_max: c.monthly_fee_max ?? null,
          age_min_months,
          age_max_months,
          hero_image_url: c.cover_image_url ?? null,
          is_verified: isClaimed && Boolean(c.is_registered),
          is_dsd_registered: isClaimed && Boolean(c.is_registered),
          vacancy_status: null,
          is_claimed: isClaimed,
          logo_url: c.logo_url ?? null,
          tagline: c.tagline ?? null,
          age_groups: c.age_groups ?? null,
          contact_whatsapp: c.contact_whatsapp ?? null,
          contact_phone: c.contact_phone ?? null,
          is_saved: true,
        } satisfies CentreCardData
      })
  }

  const compareSavedHref =
    cardData.length >= 2
      ? `/parent/compare?centres=${cardData.map((c) => c.id).join(',')}`
      : '/parent/compare'

  return (
    <div className="min-h-screen bg-surface-secondary px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-4">
      <div className="cc-stack">
        <SurfaceCard className="border border-emerald-100 bg-gradient-to-b from-emerald-50/40 to-background p-6 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">Saved cr\u00E8ches</p>
              <h1
                className="mt-2 text-[1.8rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-slate-900 sm:text-[2.3rem]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Keep your favourite cr\u00E8ches close.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Save first, compare when you are ready, and come back without starting your search from zero.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:w-[24rem]">
              <div className="rounded-[1.3rem] border border-cyan-100 bg-cyan-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700">Saved now</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {cardData.length} {cardData.length === 1 ? 'cr\u00E8che' : 'cr\u00E8ches'}
                </p>
              </div>
              <div className="rounded-[1.3rem] border border-border bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Best next move</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Compare your top options</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild className="min-h-[48px] rounded-2xl bg-cyan-600 px-5 text-sm font-semibold hover:bg-cyan-700">
              <Link href={compareSavedHref}>
                <Scale className="mr-2 h-4 w-4" />
                Compare saved cr\u00E8ches
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-[48px] rounded-2xl px-5 text-sm font-semibold">
              <Link href="/directory">
                <Compass className="mr-2 h-4 w-4" />
                Find more cr\u00E8ches
              </Link>
            </Button>
          </div>
        </SurfaceCard>

        {cardData.length === 0 ? (
          <SurfaceCard className="flex flex-col items-center justify-center gap-5 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-secondary shadow-card">
              <Heart className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800">No saved cr\u00E8ches yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Tap the heart on any cr\u00E8che you like, and we will keep it here for you.
              </p>
            </div>
            <Button asChild className="min-h-[44px] px-8">
              <Link href="/directory">
                <Compass className="mr-2 h-4 w-4" />
                Browse cr\u00E8ches
              </Link>
            </Button>
          </SurfaceCard>
        ) : (
          <>
            <ShortlistCardGrid centres={cardData} />

            <SurfaceCard className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">Shortlist workflow</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Save the cr\u00E8ches that feel right, compare them side by side, then apply when one feels like the best fit for your child.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-600" />
                    Save first
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                    <Scale className="h-3.5 w-3.5 text-cyan-600" />
                    Compare next
                  </span>
                </div>
              </div>
            </SurfaceCard>
          </>
        )}
      </div>

      {cardData.length >= 2 ? (
        <div className="fixed inset-x-0 z-40 px-4" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}>
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-2xl border border-cyan-100 bg-amber-50 px-4 py-3 shadow-lg">
            <p className="text-sm font-semibold text-slate-800">
              {cardData.length} saved \u2014 ready to compare?
            </p>
            <Button asChild className="min-h-[40px] rounded-xl bg-cyan-600 px-4 text-sm font-semibold text-white hover:bg-cyan-700">
              <Link href={compareSavedHref}>Compare saved</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
