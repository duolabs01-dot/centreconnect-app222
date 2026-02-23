'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SUPPORT_EMAIL } from '@/lib/config'

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  console.error('App error boundary caught:', error)

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-[var(--shadow-elevation-1)]">
        <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-3 text-sm text-slate-600">
          We could not complete that request. Please try again or contact support.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" asChild>
            <Link href={`mailto:${SUPPORT_EMAIL}`}>Contact Support</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}


