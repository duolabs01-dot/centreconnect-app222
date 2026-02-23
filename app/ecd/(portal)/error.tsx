'use client'

import Link from 'next/link'
import { Button } from '@/components/ecd/Button'

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function EcdErrorPage({ error, reset }: ErrorPageProps) {
  console.error('ECD segment error:', error)

  return (
    <div className="ecd-light-shell min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card/80 p-8 text-center shadow-[var(--shadow-elevation-4)] backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-foreground">ECD page failed to load</h1>
        <p className="mt-3 text-sm text-muted-foreground">Try again or return to the ECD dashboard.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} className="bg-cyan-600 text-cyan-50 hover:bg-cyan-500">Try Again</Button>
          <Button variant="outline" className="border-border text-foreground hover:bg-white/10" asChild>
            <Link href="/ecd/dashboard">ECD Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}


