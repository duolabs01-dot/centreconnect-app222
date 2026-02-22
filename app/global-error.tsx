'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

type GlobalErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  console.error('Global error boundary caught:', error)

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
          <p className="mt-3 text-sm text-slate-600">
            We hit an unexpected app error. Try again, or return to home.
          </p>
          {error.digest ? <p className="mt-2 text-xs text-slate-500">Error ID: {error.digest}</p> : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={reset}>Try Again</Button>
            <Button variant="outline" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
