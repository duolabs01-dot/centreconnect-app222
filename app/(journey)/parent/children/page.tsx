import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { calculateAge } from '@/lib/utils'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import { SurfaceCard } from '@/components/ui/surface-card'
import { UserPlus, ArrowLeft, Users, Baby } from 'lucide-react'

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
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/parent/profile" className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-cyan-600 hover:border-cyan-100 transition-all shadow-sm">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Child Profiles</h1>
                <p className="text-sm text-slate-500 font-medium">Manage your children&apos;s enrolment identities.</p>
              </div>
            </div>
            <Button size="lg" asChild className="h-14 rounded-2xl font-black px-8 shadow-float bg-slate-900 text-white hover:bg-slate-800">
              <Link href="/parent/children/new">
                <UserPlus className="w-5 h-5 mr-2" />
                Register Child
              </Link>
            </Button>
          </header>

          <SurfaceCard className="p-6 bg-cyan-600 text-white border-none shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-black text-white leading-tight">{children.length} Registered Profiles</p>
                <p className="text-xs text-cyan-100 font-medium mt-1">One profile works for all crèche applications.</p>
              </div>
            </div>
          </SurfaceCard>

          {children.length === 0 ? (
            <SurfaceCard className="py-20 text-center bg-white/50 border-dashed border-2">
              <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-[2rem] bg-slate-50 text-slate-300 mb-6">
                <Baby className="h-10 w-10" />
              </div>
              <p className="text-lg font-black text-slate-900">
                No children registered yet
              </p>
              <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto mb-8 font-medium">
                Add your first child to start applying to trusted crèches in your area.
              </p>
              <Button size="lg" asChild className="h-14 px-10 rounded-2xl font-black bg-cyan-600">
                <Link href="/parent/children/new">Register First Child</Link>
              </Button>
            </SurfaceCard>
          ) : (
            <section className="grid gap-6 sm:grid-cols-2">
              {children.map((child) => {
                const fullName = `${child.first_name} ${child.last_name}`
                const age = calculateAge(child.date_of_birth)
                return (
                  <SurfaceCard key={child.id} className="p-6 flex flex-col items-center text-center group hover:border-cyan-200 transition-all">
                    <div className="mb-6 h-28 w-28 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-50 to-slate-100 p-1 ring-4 ring-white shadow-float relative">
                      {child.photo_url ? (
                        <Image src={child.photo_url} alt={fullName} fill className="h-full w-full object-cover rounded-[2.2rem]" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-3xl font-black text-slate-300">
                          {child.first_name[0]}{child.last_name[0]}
                        </div>
                      )}
                    </div>
                    <p className="text-xl font-black text-slate-900 tracking-tight">{fullName}</p>
                    <div className="mt-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {age} years old
                    </div>
                    
                    <div className="mt-8 w-full grid grid-cols-1 gap-2 pt-6 border-t border-slate-50">
                      <Button variant="outline" className="w-full h-12 rounded-xl text-slate-600 font-bold hover:bg-slate-50" asChild>
                        <Link href={`/parent/children/${child.id}/edit`}>Edit Identity</Link>
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

