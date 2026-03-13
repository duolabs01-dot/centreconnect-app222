import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Compass, Scale } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { SurfaceCard } from '@/components/ui/surface-card'
import { GovernmentRegisteredBadge, PremiumVerifiedBadge } from '@/components/ui/premium-verified-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const metadata: Metadata = {
  title: 'Creche Compare | Parent Portal | CentreConnect',
  description: 'Compare your saved creches side by side and choose with confidence.',
}

type ComparePageProps = {
  searchParams?: {
    centres?: string | string[]
  }
}

type CompareCentreRow = {
  id: string
  slug: string | null
  name: string | null
  suburb: string | null
  city: string | null
  age_groups: string[] | null
  is_registered: boolean | null
  fees_display_mode: 'exact' | 'range' | 'contact' | null
  monthly_fee_min: number | null
  monthly_fee_max: number | null
  registration_fee: number | null
}

type CentreOwnerRow = {
  id: string
  owner_id: string | null
}

function normalizeCentresParam(input?: string | string[]): string[] {
  const raw = Array.isArray(input) ? input.join(',') : input ?? ''
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function formatFeeLabel(centre: CompareCentreRow) {
  if (centre.fees_display_mode === 'exact' && centre.monthly_fee_min) return `R${centre.monthly_fee_min}`
  if (centre.fees_display_mode === 'range' && centre.monthly_fee_min && centre.monthly_fee_max) {
    return `R${centre.monthly_fee_min} - R${centre.monthly_fee_max}`
  }
  if (centre.fees_display_mode === 'contact') return 'Ask the creche'
  return 'Not shared yet'
}

function formatRegistrationFee(value: number | null) {
  return value ? `R${value} once-off` : 'Ask the creche'
}

function formatAgeLabel(value: string[] | null) {
  if (!value || value.length === 0) return 'Ask the creche'
  return value.join(', ')
}

function formatLocation(centre: CompareCentreRow) {
  return [centre.suburb, centre.city].filter(Boolean).join(', ') || 'Johannesburg'
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const requestedIds = normalizeCentresParam(searchParams?.centres)
  let centreIds = requestedIds
  let savedCount = 0

  if (user) {
    const shortlistResult = await supabase
      .from('parent_shortlists')
      .select('centre_id')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12)

    const shortlistIds = ((shortlistResult.data ?? []) as Array<{ centre_id: string }>).map((row) => row.centre_id)
    savedCount = shortlistIds.length

    if (centreIds.length === 0) {
      centreIds = shortlistIds.slice(0, 4)
    }
  }

  let orderedCentres: CompareCentreRow[] = []
  const claimedCentreIds = new Set<string>()

  if (centreIds.length > 0) {
    const [centresResult, ownerRowsResult] = await Promise.all([
      supabase
        .from('public_ecd_centres')
        .select('id,slug,name,suburb,city,age_groups,is_registered,fees_display_mode,monthly_fee_min,monthly_fee_max,registration_fee')
        .in('id', centreIds),
      supabase.from('ecd_centres').select('id,owner_id').in('id', centreIds),
    ])

    ;((ownerRowsResult.data ?? []) as CentreOwnerRow[]).forEach((row) => {
      if (row.owner_id?.trim()) claimedCentreIds.add(row.id)
    })

    const byId = new Map((((centresResult.data ?? []) as CompareCentreRow[])).map((centre) => [centre.id, centre]))
    orderedCentres = centreIds
      .map((centreId) => byId.get(centreId))
      .filter((centre): centre is CompareCentreRow => Boolean(centre))
  }

  return (
    <main className="min-h-screen bg-surface-secondary px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4">
      <div className="cc-stack">
        <SurfaceCard className="border border-[#D9ECE7] bg-[linear-gradient(180deg,#F6FCFA_0%,#FFFFFF_100%)] p-6 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">Compare</p>
              <h1
                className="mt-2 text-[1.8rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-slate-900 sm:text-[2.3rem]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                See your top creches side by side.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Compare the basics that matter most: location, ages, fees, and whether the creche is fully live on CentreConnect.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="min-h-[48px] rounded-2xl px-5 text-sm font-semibold">
                <Link href="/parent/shortlist">Back to saved creches</Link>
              </Button>
              <Button asChild className="min-h-[48px] rounded-2xl bg-cyan-600 px-5 text-sm font-semibold hover:bg-cyan-700">
                <Link href="/directory">
                  <Compass className="mr-2 h-4 w-4" />
                  Find more creches
                </Link>
              </Button>
            </div>
          </div>
        </SurfaceCard>

        {orderedCentres.length === 0 ? (
          <SurfaceCard className="flex flex-col items-center justify-center gap-5 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-secondary shadow-card">
              <Scale className="h-8 w-8 text-cyan-500" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800">No saved creches to compare yet</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Save a few creches first, then come back and we will line them up for you automatically.
              </p>
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
            <SurfaceCard className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">Comparison set</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Showing {orderedCentres.length} {orderedCentres.length === 1 ? 'creche' : 'creches'} from your shortlist{savedCount > orderedCentres.length ? ` out of ${savedCount} saved` : ''}.
                  </p>
                </div>
                {savedCount > orderedCentres.length ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">We show the most recently saved first.</p>
                ) : null}
              </div>
            </SurfaceCard>

            <section className="grid gap-4 lg:hidden">
              {orderedCentres.map((centre) => {
                const isClaimed = claimedCentreIds.has(centre.id)
                const isRegistered = isClaimed && Boolean(centre.is_registered)
                return (
                  <SurfaceCard key={centre.id} className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {isClaimed ? <PremiumVerifiedBadge compact /> : null}
                      {isRegistered ? <GovernmentRegisteredBadge compact /> : null}
                    </div>
                    <h2 className="mt-3 text-xl font-bold text-slate-900">{centre.name ?? 'Creche'}</h2>
                    <p className="mt-1 text-sm text-slate-600">{formatLocation(centre)}</p>

                    <div className="mt-4 grid gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Monthly fees</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatFeeLabel(centre)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Registration fee</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatRegistrationFee(centre.registration_fee)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Ages</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatAgeLabel(centre.age_groups)}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Button asChild className="min-h-[44px] flex-1 rounded-2xl bg-cyan-600 text-sm font-semibold hover:bg-cyan-700">
                        <Link href={centre.slug ? `/c/${centre.slug}` : '/directory'}>
                          View profile
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      {isClaimed ? (
                        <Button asChild variant="outline" className="min-h-[44px] flex-1 rounded-2xl text-sm font-semibold">
                          <Link href={`/apply/${centre.slug ?? centre.id}`}>Apply</Link>
                        </Button>
                      ) : null}
                    </div>
                  </SurfaceCard>
                )
              })}
            </section>

            <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white lg:block">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[180px] px-5 py-4">Feature</TableHead>
                    {orderedCentres.map((centre) => (
                      <TableHead key={centre.id} className="px-5 py-4 align-top text-slate-900">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {claimedCentreIds.has(centre.id) ? <PremiumVerifiedBadge compact /> : null}
                            {claimedCentreIds.has(centre.id) && centre.is_registered ? <GovernmentRegisteredBadge compact /> : null}
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-900">{centre.name ?? 'Creche'}</p>
                            <p className="text-xs text-slate-500">{formatLocation(centre)}</p>
                          </div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="px-5 py-4 font-medium text-slate-700">CentreConnect status</TableCell>
                    {orderedCentres.map((centre) => (
                      <TableCell key={centre.id} className="px-5 py-4 text-slate-700">
                        {claimedCentreIds.has(centre.id) ? 'Verified profile on CentreConnect' : 'Public listing only'}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="px-5 py-4 font-medium text-slate-700">Monthly fees</TableCell>
                    {orderedCentres.map((centre) => (
                      <TableCell key={centre.id} className="px-5 py-4 text-slate-700">{formatFeeLabel(centre)}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="px-5 py-4 font-medium text-slate-700">Registration fee</TableCell>
                    {orderedCentres.map((centre) => (
                      <TableCell key={centre.id} className="px-5 py-4 text-slate-700">{formatRegistrationFee(centre.registration_fee)}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="px-5 py-4 font-medium text-slate-700">Ages</TableCell>
                    {orderedCentres.map((centre) => (
                      <TableCell key={centre.id} className="px-5 py-4 text-slate-700">{formatAgeLabel(centre.age_groups)}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="px-5 py-4 font-medium text-slate-700">Profile</TableCell>
                    {orderedCentres.map((centre) => (
                      <TableCell key={centre.id} className="px-5 py-4 text-slate-700">
                        <Link href={centre.slug ? `/c/${centre.slug}` : '/directory'} className="font-semibold text-cyan-700 hover:text-cyan-800">
                          Open profile
                        </Link>
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="px-5 py-4 font-medium text-slate-700">Apply</TableCell>
                    {orderedCentres.map((centre) => {
                      const isClaimed = claimedCentreIds.has(centre.id)
                      return (
                        <TableCell key={centre.id} className="px-5 py-4">
                          {isClaimed ? (
                            <Button asChild className="h-10 w-full rounded-xl bg-cyan-600 text-sm font-semibold text-white hover:bg-cyan-700">
                              <Link href={`/apply/${centre.slug ?? centre.id}`}>Apply</Link>
                            </Button>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">Not available</span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
