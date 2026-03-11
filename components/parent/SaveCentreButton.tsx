'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, Check } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { toggleShortlist } from '@/lib/actions/parent/shortlist'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useBottomNav } from '@/lib/context/BottomNavProvider'

type SaveCentreButtonProps = {
  centreId: string
  initialSaved?: boolean
}

function syncSavedCount(savedCount: number, centreId: string, saved: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('cc:saved-count', String(savedCount))
  window.dispatchEvent(new CustomEvent('cc:saved-count-change', { detail: savedCount }))
  window.dispatchEvent(new CustomEvent('cc:shortlist-updated', { detail: { savedCount, centreId, saved } }))
}

export function SaveCentreButton({ centreId, initialSaved = false }: SaveCentreButtonProps) {
  const router = useRouter()
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()
  const [showAuthSheet, setShowAuthSheet] = useState(false)
  const { setVisible } = useBottomNav()

  useEffect(() => {
    setSaved(initialSaved)
  }, [initialSaved])

  useEffect(() => {
    setVisible(!showAuthSheet)
    return () => setVisible(true)
  }, [showAuthSheet, setVisible])

  const handleClick = () => {
    startTransition(async () => {
      const result = await toggleShortlist(centreId)

      if ('error' in result) {
        setShowAuthSheet(true)
        return
      }

      setSaved(result.saved)
      syncSavedCount(result.savedCount, centreId, result.saved)
      toast.success(result.saved ? 'Saved to your creche shortlist' : 'Removed from your shortlist')
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          handleClick()
        }}
        disabled={isPending}
        aria-label={saved ? 'Remove from saved' : 'Save creche'}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full border transition-all active:scale-90 disabled:cursor-wait',
          saved
            ? 'border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100'
            : 'border-slate-200 bg-white text-slate-400 shadow-sm hover:border-rose-200 hover:text-rose-400'
        )}
      >
        <Heart className={cn('h-4 w-4', saved && 'fill-rose-500')} />
      </button>

      <Sheet open={showAuthSheet} onOpenChange={setShowAuthSheet}>
        <SheetContent side="bottom" className="rounded-t-[2.5rem] px-6 pb-12 pt-10">
          <SheetHeader className="mb-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
              <Heart className="h-7 w-7 fill-rose-500 text-rose-500" />
            </div>
            <SheetTitle className="text-center text-2xl font-black tracking-tight text-slate-900">
              Save the creches you love.
            </SheetTitle>
            <p className="text-center font-medium text-slate-500">
              Create your free parent account to keep a shortlist, compare options faster, and move into the easiest creche journey you have used yet.
            </p>
          </SheetHeader>

          <div className="cc-stack mb-8 gap-3">
            {[
              'Save your favourite creches in one place',
              'Apply faster when you are ready',
              'Keep updates, replies, and daily reports together',
            ].map((text) => (
              <div key={text} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                  <Check className="h-3 w-3 stroke-[4] text-white" />
                </div>
                <span className="text-sm font-bold text-slate-700">{text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild className="h-14 rounded-2xl bg-cyan-600 text-lg font-bold shadow-xl shadow-cyan-900/20 hover:bg-cyan-700">
              <Link href="/register?next=%2Fdirectory">Create free account</Link>
            </Button>
            <Button asChild variant="ghost" className="h-12 rounded-2xl font-bold text-slate-500">
              <Link href="/login?next=%2Fdirectory">I already have an account</Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

