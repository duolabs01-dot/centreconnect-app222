'use client'

import { useState, useTransition } from 'react'
import { Heart, Sparkles, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toggleShortlist } from '@/lib/actions/parent/shortlist'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { useBottomNav } from '@/lib/context/BottomNavProvider'
import { useEffect } from 'react'

type SaveCentreButtonProps = {
  centreId: string
  initialSaved?: boolean
}

export function SaveCentreButton({ centreId, initialSaved = false }: SaveCentreButtonProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()
  const [showAuthSheet, setShowAuthSheet] = useState(false)
  const { setVisible } = useBottomNav()

  useEffect(() => {
    setVisible(!showAuthSheet)
    return () => setVisible(true)
  }, [showAuthSheet, setVisible])

  const handleClick = () => {
    startTransition(async () => {
      const result = await toggleShortlist(centreId)
      
      if ('error' in result) {
        // If not logged in, show the auth bottom sheet
        setShowAuthSheet(true)
        return
      }
      
      setSaved(result.saved)
      toast.success(result.saved ? 'Centre saved' : 'Removed from saved')
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleClick()
        }}
        disabled={isPending}
        aria-label={saved ? 'Remove from saved' : 'Save centre'}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full border transition-all active:scale-90',
          saved
            ? 'border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100'
            : 'border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:text-rose-400 shadow-sm'
        )}
      >
        <Heart className={cn('h-4 w-4', saved && 'fill-rose-500')} />
      </button>

      <Sheet open={showAuthSheet} onOpenChange={setShowAuthSheet}>
        <SheetContent side="bottom" className="rounded-t-[2.5rem] px-6 pb-12 pt-10">
          <SheetHeader className="mb-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
              <Heart className="h-7 w-7 text-rose-500 fill-rose-500" />
            </div>
            <SheetTitle className="text-2xl font-black text-center text-slate-900 tracking-tight">
              Save your favourites.
            </SheetTitle>
            <p className="text-center text-slate-500 font-medium">
              Create a free account to shortlist crèches, compare them side-by-side, and get notified about open spots.
            </p>
          </SheetHeader>

          <div className="cc-stack gap-3 mb-8">
            {[
              "Save unlimited crèches",
              "Track application status",
              "Get daily child reports"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-white stroke-[4]" />
                </div>
                <span className="text-sm font-bold text-slate-700">{text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild className="h-14 rounded-2xl bg-cyan-600 hover:bg-cyan-700 font-bold text-lg shadow-xl shadow-cyan-900/20">
              <Link href="/login?next=%2Fdirectory">Sign in/ Sign up</Link>
            </Button>
            <Button asChild variant="ghost" className="h-12 rounded-2xl font-bold text-slate-500">
              <Link href="/login">I already have an account — Sign In</Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
