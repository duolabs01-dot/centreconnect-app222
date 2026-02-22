import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Saved Centres | Parent Portal | CentreConnect',
  description: 'Keep and review your shortlisted centres before applying.',
}

export default async function ParentShortlistPage() {
  return (
    <div className="cc-page">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Saved Centres</h1>
        <p className="mt-1 text-sm text-slate-600">Keep preferred centres here for faster comparison and application decisions.</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-700">
          Your shortlist flow is almost ready. Use compare links from directory cards while we finalize persistent saved lists.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/directory">Browse Centres</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/parent/compare">Compare Selected</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/parent/preferences">Set Preferences</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
