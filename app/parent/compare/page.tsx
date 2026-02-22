import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const metadata: Metadata = {
  title: 'Centre Comparison | Parent Portal | CentreConnect',
  description: 'Compare shortlisted ECD centres side by side to make confident decisions.',
}

type ComparePageProps = {
  searchParams?: {
    centres?: string | string[]
  }
}

type CentreRow = {
  id: string
  name: string
  suburb: string | null
  capacity: number | null
  age_groups: string[] | null
  is_registered: boolean | null
}

function normalizeCentresParam(input?: string | string[]): string[] {
  const raw = Array.isArray(input) ? input.join(',') : input ?? ''
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const centreIds = normalizeCentresParam(searchParams?.centres)
  const supabase = await createClient()

  let centres: CentreRow[] = []

  if (centreIds.length > 0) {
    const primary = await supabase
      .from('ecd_centres')
      .select('id,name,suburb,capacity,age_groups,is_registered')
      .in('id', centreIds)

    if (primary.error) {
      const fallback = await supabase
        .from('public_ecd_centres')
        .select('id,name,suburb,age_groups,is_registered')
        .in('id', centreIds)

      centres = (fallback.data ?? []).map((centre) => ({
        id: centre.id,
        name: centre.name,
        suburb: centre.suburb,
        capacity: null,
        age_groups: centre.age_groups,
        is_registered: centre.is_registered,
      }))
    } else {
      centres = (primary.data ?? []).map((centre) => ({
        id: centre.id,
        name: centre.name,
        suburb: centre.suburb,
        capacity: centre.capacity,
        age_groups: centre.age_groups,
        is_registered: centre.is_registered,
      }))
    }
  }

  const orderedCentres = centreIds
    .map((id) => centres.find((centre) => centre.id === id))
    .filter((centre): centre is CentreRow => Boolean(centre))

  return (
    <main className="cc-page py-2">
      <section className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">Centre Comparison Studio</h1>
        <p className="mt-2 text-sm text-slate-600">Review your selected centres side by side to make a confident final choice.</p>
      </section>

      {orderedCentres.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Select centres first by adding ids in the URL, for example: <code>/parent/compare?centres=id1,id2,id3</code>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <Table className="min-w-[720px]">
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="px-4 py-3">Feature</TableHead>
                {orderedCentres.map((centre) => (
                  <TableHead key={centre.id} className="px-4 py-3 text-slate-900">
                    {centre.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="px-4 py-3 font-medium text-slate-700">Location</TableCell>
                {orderedCentres.map((centre) => (
                  <TableCell key={centre.id} className="px-4 py-3 text-slate-700">
                    {centre.suburb ?? 'Not specified'}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="px-4 py-3 font-medium text-slate-700">Capacity</TableCell>
                {orderedCentres.map((centre) => (
                  <TableCell key={centre.id} className="px-4 py-3 text-slate-700">
                    {centre.capacity !== null ? `${centre.capacity} children` : 'Not specified'}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="px-4 py-3 font-medium text-slate-700">Age Groups</TableCell>
                {orderedCentres.map((centre) => (
                  <TableCell key={centre.id} className="px-4 py-3 text-slate-700">
                    {(centre.age_groups ?? []).length > 0 ? centre.age_groups?.join(', ') : 'Not specified'}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="px-4 py-3 font-medium text-slate-700">Registered</TableCell>
                {orderedCentres.map((centre) => (
                  <TableCell key={centre.id} className="px-4 py-3 text-slate-700">
                    {centre.is_registered ? 'Yes' : 'In Process'}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="px-4 py-3 font-medium text-slate-700">Monthly Fee</TableCell>
                {orderedCentres.map((centre) => (
                  <TableCell key={centre.id} className="px-4 py-3 text-slate-700">
                    R800-1200 (contact for exact)
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  )
}
