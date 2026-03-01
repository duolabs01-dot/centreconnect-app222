import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { calculateAge } from '@/lib/utils'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import { SurfaceCard } from '@/components/ui/surface-card'
import { UserPlus } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Child Profiles | Parent Portal | CentreConnect',
  description: 'Manage every child profile linked to your applications and enrolment journey.',
  openGraph: {
    images: ['/og-image.png'],
  },
}

type Child = {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  photo_url: string | null
}

export default async function ParentChildrenPage() {
  const perf = startRoutePerf('/parent/children')
  const supabase = await createClient()
  try {
    const { data: childrenData } = await supabase
      .from('children')
      .select('id,first_name,last_name,date_of_birth,photo_url')
      .order('created_at', { ascending: false })

    const children: Child[] = childrenData ?? []

    return (
      <div className="bg-surface-secondary px-4 pt-4 pb-28 min-h-screen">
        <div className="max-w-3xl mx-auto space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Child Profiles</h1>
              <p className="mt-1 text-sm text-slate-600">Create and manage the child profiles used across applications and enrolment.</p>
            </div>
            <Button asChild className="min-h-[44px] rounded-xl font-bold px-6 shadow-float bg-cyan-600">
              <Link href="/parent/children/new">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Child
              </Link>
            </Button>
          </header>

          {children.length === 0 ? (
            <SurfaceCard className="py-16 text-center">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-surface-secondary shadow-card mb-4">
                <UserPlus className="h-8 w-8 text-cyan-500" />
              </div>
              <p className="text-base font-bold text-slate-800">
                No child profiles yet
              </p>
              <p className="mt-1 text-sm text-slate-500 max-w-xs mx-auto mb-6">
                Add your first child to start applying to centres.
              </p>
              <Button asChild className="min-h-[44px] px-8 rounded-xl font-bold">
                <Link href="/parent/children/new">Create Profile</Link>
              </Button>
            </SurfaceCard>
          ) : (
            <section className="grid gap-4 sm:grid-cols-2">
              {children.map((child) => {
                const fullName = `${child.first_name} ${child.last_name}`
                const age = calculateAge(child.date_of_birth)
                return (
                  <SurfaceCard key={child.id} className="p-5 flex flex-col items-center text-center">
                    <div className="mb-4 h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-float bg-surface-secondary flex items-center justify-center text-2xl font-bold text-slate-400">
                      {child.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={child.photo_url} alt={fullName} className="h-full w-full object-cover" />
                      ) : (
                        `${child.first_name[0]}${child.last_name[0]}`.toUpperCase()
                      )}
                    </div>
                    <p className="text-lg font-bold text-slate-900">{fullName}</p>
                    <p className="mt-1 text-sm text-slate-500 font-medium">{age} years old</p>
                    <div className="mt-6 w-full pt-4 border-t border-slate-50">
                      <Button variant="ghost" className="w-full min-h-[44px] rounded-xl text-cyan-700 font-bold hover:bg-cyan-50" asChild>
                        <Link href={`/parent/children/${child.id}/edit`}>Edit Profile</Link>
                      </Button>
                    </div>
                  </SurfaceCard>
                )
              })}
            </section>
          )}
        </div>
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}
