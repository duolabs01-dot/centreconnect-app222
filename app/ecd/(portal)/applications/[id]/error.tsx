'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

type ApplicationDetailsErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ApplicationDetailsError({ error, reset }: ApplicationDetailsErrorProps) {
  console.error('Application details page failed:', error)

  return (
    <div className="min-h-[60vh] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Unable to load this application right now</h1>
        <p className="mt-2 text-sm text-slate-600">Please retry, or go back to the applications inbox.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button type="button" onClick={reset} className="h-11 rounded-2xl bg-teal-600 text-white hover:bg-teal-700">
            Try Again
          </Button>
          <Button type="button" asChild variant="outline" className="h-11 rounded-2xl">
            <Link href="/ecd/applications">Back to Applications</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
