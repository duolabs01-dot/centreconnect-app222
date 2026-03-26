'use client'

import { useState, useTransition } from 'react'
import { SharedCentreCard } from '@/components/shared/CentreCard'
import { toggleShortlist } from '@/lib/actions/parent/shortlist'
import type { CentreCardData } from '@/types/centre-card'

export function ShortlistCardGrid({ centres }: { centres: CentreCardData[] }) {
  const [savedIds, setSavedIds] = useState(() => new Set(centres.map((c) => c.id)))
  const [, startTransition] = useTransition()

  const visibleCentres = centres.filter((c) => savedIds.has(c.id))

  function handleSave(centreId: string) {
    // Optimistically remove from local list
    setSavedIds((prev) => {
      const next = new Set(prev)
      next.delete(centreId)
      return next
    })
    startTransition(async () => {
      await toggleShortlist(centreId)
    })
  }

  if (visibleCentres.length === 0) return null

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visibleCentres.map((centre) => (
        <SharedCentreCard
          key={centre.id}
          centre={centre}
          variant="full"
          isSaved
          onSave={handleSave}
        />
      ))}
    </section>
  )
}
