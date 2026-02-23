'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toggleShortlist } from '@/lib/actions/parent/shortlist'
import { toast } from 'sonner'

type SaveCentreButtonProps = {
  centreId: string
  initialSaved?: boolean
}

export function SaveCentreButton({ centreId, initialSaved = false }: SaveCentreButtonProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      const result = await toggleShortlist(centreId)
      if ('error' in result) {
        toast.error('Sign in to save centres')
        return
      }
      setSaved(result.saved)
      toast.success(result.saved ? 'Centre saved' : 'Removed from saved')
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={saved ? 'Remove from saved' : 'Save centre'}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full border transition-all',
        saved
          ? 'border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100'
          : 'border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:text-rose-400'
      )}
    >
      <Heart className={cn('h-4 w-4', saved && 'fill-rose-500')} />
    </button>
  )
}
