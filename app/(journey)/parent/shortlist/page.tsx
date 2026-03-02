import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Heart, Compass } from 'lucide-react'
import { SurfaceCard } from '@/components/ui/surface-card'

export const metadata: Metadata = {
  title: 'Saved Crèches | CentreConnect',
  description: 'Your shortlisted ECD crèches.',
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
    <div className="bg-surface-secondary px-4 pt-4 pb-28 min-h-screen">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Saved Crèches
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Crèches you have saved for later. Apply when ready.
        </p>
      </header>

      <div className="space-y-6">
        {centres.length === 0 ? (
          <SurfaceCard className="flex flex-col items-center justify-center gap-5 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-secondary shadow-card">
              <Heart className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800">
                No saved crèches yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Tap the heart icon on any crèche to save it here.
              </p>
            </div>
            <Button asChild className="min-h-[44px] px-8">
              <Link href="/directory">
                <Compass className="mr-2 h-4 w-4" />
                Browse Crèches
              </Link>
            </Button>
          </SurfaceCard>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2">
            {centres.map((centre: any) => (
              <Link
                key={centre.id}
                href={`/c/${centre.slug}`}
                className="group block"
              >
                <SurfaceCard className="p-4 transition-all duration-200 hover:ring-1 hover:ring-cyan-500/30 h-full">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900">
                      {centre.name}
                    </p>
                    {centre.is_registered && (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        Registered
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 font-medium">
                    {[centre.suburb, centre.city].filter(Boolean).join(', ')}
                  </p>
                  {centre.tagline && (
                    <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {centre.tagline}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-700 group-hover:text-cyan-800 uppercase tracking-widest">
                      View Crèche
                    </span>
                    <Link
                      href={`/apply/${centre.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-xs font-bold text-cyan-700 hover:bg-cyan-100 min-h-[32px] flex items-center"
                    >
                      Apply
                    </Link>
                  </div>
                </SurfaceCard>
              </Link>
            ))}
          </section>
        )}

        <section className="flex flex-wrap gap-3 pt-2">
          <Button variant="outline" className="min-h-[44px] rounded-xl flex-1 sm:flex-none" asChild>
            <Link href="/directory">Find more crèches</Link>
          </Button>
          <Button variant="outline" className="min-h-[44px] rounded-xl flex-1 sm:flex-none" asChild>
            <Link href="/parent/compare">Compare selected</Link>
          </Button>
        </section>
      </div>
    </div>
  )
}




