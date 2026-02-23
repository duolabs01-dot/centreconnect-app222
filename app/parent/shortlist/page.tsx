import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Heart, Compass } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Saved Centres | CentreConnect',
  description: 'Your shortlisted ECD centres.',
}

type ShortlistRow = {
  centre_id: string
  ecd_centres: {
    id: string
    name: string
    slug: string
    suburb: string | null
    city: string | null
    tagline: string | null
    is_registered: boolean | null
  } | null
}

export default async function ParentShortlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rows } = user
    ? await supabase
        .from('parent_shortlists')
        .select('centre_id, ecd_centres(id,name,slug,suburb,city,tagline,is_registered)')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] }

  const centres = (rows ?? [])
    .map((row: any) => row.ecd_centres)
    .filter(Boolean)

  return (
    <div className="cc-page">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
          Saved Centres
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Centres you have saved for later. Apply when ready.
        </p>
      </section>

      {centres.length === 0 ? (
        <section className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-50">
            <Heart className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">
              No saved centres yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Tap the heart icon on any centre to save it here.
            </p>
          </div>
          <Button asChild>
            <Link href="/directory">
              <Compass className="mr-2 h-4 w-4" />
              Browse Centres
            </Link>
          </Button>
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2">
          {centres.map((centre: any) => (
            <Link
              key={centre.id}
              href={`/centre/${centre.slug}`}
              className="group block rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-cyan-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {centre.name}
                </p>
                {centre.is_registered && (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    Registered
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {[centre.suburb, centre.city].filter(Boolean).join(', ')}
              </p>
              {centre.tagline && (
                <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                  {centre.tagline}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-700 group-hover:text-cyan-800">
                  View centre →
                </span>
                <Link
                  href={`/apply/${centre.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
                >
                  Apply
                </Link>
              </div>
            </Link>
          ))}
        </section>
      )}

      <section className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/directory">Find more centres</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/parent/compare">Compare selected</Link>
        </Button>
      </section>
    </div>
  )
}
