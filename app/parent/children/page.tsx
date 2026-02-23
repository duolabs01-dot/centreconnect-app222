import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { calculateAge } from '@/lib/utils'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'

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
      <div className="cc-page">
        <div className="max-w-2xl mx-auto space-y-4">
          <section>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Child Profiles</h1>
            <p className="mt-1 text-sm text-slate-600">Create and manage the child profiles used across applications and enrolment.</p>
          </section>

          <section className="mb-6 flex justify-end">
            <Button asChild>
              <Link href="/parent/children/new">Add Child</Link>
            </Button>
          </section>

          {children.length === 0 ? (
            <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
              Add your first child to start applying
            </section>
          ) : (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {children.map((child) => {
                const fullName = `${child.first_name} ${child.last_name}`
                const age = calculateAge(child.date_of_birth)
                return (
                  <Card key={child.id} className="border-slate-200">
                    <CardContent className="p-5">
                      <div className="mb-4 h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                        {child.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={child.photo_url} alt={`${fullName} photo`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                            {child.first_name[0]}
                            {child.last_name[0]}
                          </div>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-slate-900">{fullName}</p>
                      <p className="mt-1 text-sm text-slate-600">{age} years old</p>
                      <Button variant="outline" className="mt-4 w-full" asChild>
                        <Link href={`/parent/children/${child.id}/edit`}>Edit</Link>
                      </Button>
                    </CardContent>
                  </Card>
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
