'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function CentrePageError({ error, reset }: ErrorPageProps) {
  console.error('Centre profile page error:', error)

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-[var(--shadow-elevation-1)]">
        <h1 className="text-2xl font-semibold text-slate-900">Centre page failed to load</h1>
        <p className="mt-3 text-sm text-slate-600">Try again, or browse other centres.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" asChild>
            <Link href="/directory">Back to Directory</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}


