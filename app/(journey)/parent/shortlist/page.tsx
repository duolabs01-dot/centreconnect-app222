import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Compass, Heart, Scale, Sparkles } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { SurfaceCard } from '@/components/ui/surface-card'
import CentreCard from '@/components/parent/CentreCard'

export const metadata: Metadata = {
  title: 'Saved Creches | CentreConnect',
  description: 'Your saved creches, ready to compare and revisit.',
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
  phone: string | null
}

type ApplicationRow = {
  id: string
  ecd_id: string
  status: string | null
}

type CentreOwnerRow = {
  id: string
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

  const centreIds = ((shortlistRows.data ?? []) as Array<{ centre_id: string }>).map((row) => row.centre_id)

  let centres: ShortlistCentreRow[] = []
  const existingApplications = new Map<string, { id: string; status: string | null }>()
  const claimedCentreIds = new Set<string>()

  if (centreIds.length > 0) {
    const [centresResult, applicationsResult, ownerRowsResult] = await Promise.all([
      admin
        .from('public_ecd_centres')
        .select('id,slug,name,tagline,suburb,city,age_groups,is_registered,logo_url,cover_image_url,fees_display_mode,monthly_fee_min,monthly_fee_max,registration_fee,subsidy_accepted,contact_whatsapp,contact_phone,phone')
        .in('id', centreIds),
      user
        ? supabase
            .from('applications')
            .select('id,ecd_id,status')
            .eq('parent_id', user.id)
            .in('ecd_id', centreIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      admin.from('public_ecd_centres').select('id,owner_id').in('id', centreIds),
    ])

    ;((applicationsResult.data ?? []) as ApplicationRow[]).forEach((row) => {
      if (!existingApplications.has(row.ecd_id)) {
        existingApplications.set(row.ecd_id, { id: row.id, status: row.status ?? null })
      }
    })

    ;((ownerRowsResult.data ?? []) as CentreOwnerRow[]).forEach((row) => {
      if (row.owner_id?.trim()) claimedCentreIds.add(row.id)
    })

    const centresById = new Map(
      (((centresResult.data ?? []) as ShortlistCentreRow[])).map((centre) => [centre.id, centre])
    )

    centres = centreIds
      .map((centreId) => centresById.get(centreId))
      .filter((centre): centre is ShortlistCentreRow => Boolean(centre))
  }

  const compareHref = '/parent/compare'
  const compareSavedHref = centres.length >= 2 ? `/parent/compare?centres=${centres.map((centre) => centre.id).join(',')}` : compareHref

  return (
    <div className="min-h-screen bg-surface-secondary px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-4">
      <div className="cc-stack">
        <SurfaceCard className="border border-emerald-100 bg-gradient-to-b from-emerald-50/40 to-background p-6 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">Saved creches</p>
              <h1
                className="mt-2 text-[1.8rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-slate-900 sm:text-[2.3rem]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Keep your favourite creches close.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Save first, compare when you are ready, and come back without starting your search from zero.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:w-[24rem]">
              <div className="rounded-[1.3rem] border border-cyan-100 bg-cyan-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700">Saved now</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{centres.length} {centres.length === 1 ? 'creche' : 'creches'}</p>
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
                Compare saved creches
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-[48px] rounded-2xl px-5 text-sm font-semibold">
              <Link href="/directory">
                <Compass className="mr-2 h-4 w-4" />
                Find more creches
              </Link>
            </Button>
          </div>
        </SurfaceCard>

        {centres.length === 0 ? (
          <SurfaceCard className="flex flex-col items-center justify-center gap-5 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-secondary shadow-card">
              <Heart className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800">No saved creches yet</p>
              <p className="mt-1 text-sm text-slate-500">Tap the heart on any creche you like, and we will keep it here for you.</p>
            </div>
            <Button asChild className="min-h-[44px] px-8">
              <Link href="/directory">
                <Compass className="mr-2 h-4 w-4" />
                Browse creches
              </Link>
            </Button>
          </SurfaceCard>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {centres.map((centre) => {
                const existingApplication = existingApplications.get(centre.id)
                const isClaimed = claimedCentreIds.has(centre.id)
                const applyHref = `/apply/${centre.slug ?? centre.id}`
                return (
                  <div key={centre.id} className="space-y-2">
                    <CentreCard
                      id={centre.id}
                      slug={centre.slug ?? undefined}
                      name={centre.name?.trim() || 'Creche'}
                      tagline={centre.tagline}
                      suburb={centre.suburb ?? undefined}
                      city={centre.city ?? undefined}
                      age_groups={centre.age_groups ?? []}
                      is_registered={Boolean(isClaimed && centre.is_registered)}
                      logo_url={centre.logo_url ?? undefined}
                      cover_image_url={centre.cover_image_url ?? undefined}
                      fees_display_mode={centre.fees_display_mode}
                      monthly_fee_min={centre.monthly_fee_min}
                      monthly_fee_max={centre.monthly_fee_max}
                      registration_fee={centre.registration_fee}
                      subsidy_accepted={Boolean(centre.subsidy_accepted)}
                      contact_whatsapp={centre.contact_whatsapp}
                      contact_phone={centre.contact_phone}
                      phone={centre.phone}
                      is_claimed={isClaimed}
                      existingApplicationId={existingApplication?.id ?? null}
                      existingApplicationStatus={existingApplication?.status ?? null}
                      viewerRole="parent_user"
                      isSaved
                    />
                    {isClaimed ? (
                      <Link href={applyHref} className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:text-cyan-800">
                        Apply to this centre
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </div>
                )
              })}
            </section>

            <SurfaceCard className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">Shortlist workflow</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Save the creches that feel right, compare them side by side, then apply when one feels like the best fit for your child.
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

      {centres.length >= 2 ? (
        <div className="fixed inset-x-0 z-40 px-4" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}>
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-2xl border border-cyan-100 bg-amber-50 px-4 py-3 shadow-lg">
            <p className="text-sm font-semibold text-slate-800">{centres.length} saved — ready to compare?</p>
            <Button asChild className="min-h-[40px] rounded-xl bg-cyan-600 px-4 text-sm font-semibold text-white hover:bg-cyan-700">
              <Link href={compareSavedHref}>Compare saved</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}


