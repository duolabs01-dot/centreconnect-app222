'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Camera, PencilLine } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type EcdLogoAvatarProps = {
  centreName: string
  logoUrl?: string | null
  updateHref: string
  className?: string
}

function getInitials(name: string) {
  const cleaned = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (cleaned.length === 0) return 'CC'
  if (cleaned.length === 1) return cleaned[0].slice(0, 2).toUpperCase()
  return `${cleaned[0][0] ?? ''}${cleaned[1][0] ?? ''}`.toUpperCase()
}

function isSafeLogoUrl(url?: string | null) {
  const value = (url ?? '').trim()
  if (!value) return false
  return /^https?:\/\//i.test(value)
}

export function EcdLogoAvatar({ centreName, logoUrl, updateHref, className }: EcdLogoAvatarProps) {
  const safeLogoUrl = isSafeLogoUrl(logoUrl) ? logoUrl!.trim() : null
  const initials = getInitials(centreName)

  return (
    <div className={cn('flex flex-col items-end gap-2', className)}>
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={`View and update ${centreName} logo`}
            className="group relative inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-[0_10px_28px_rgba(15,23,42,0.18)] ring-1 ring-slate-200 transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_14px_34px_rgba(15,23,42,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:h-24 sm:w-24"
          >
            {safeLogoUrl ? (
              <Image src={safeLogoUrl} alt={`${centreName} logo`} fill className="object-cover" />
            ) : (
              <span className="inline-flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50 text-lg font-black tracking-wide text-teal-700 sm:text-2xl">
                {initials}
              </span>
            )}
            <span className="absolute bottom-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white bg-teal-600 text-white shadow-sm transition-colors group-hover:bg-teal-500">
              <Camera className="h-3.5 w-3.5" />
            </span>
          </button>
        </DialogTrigger>

        <DialogContent className="max-w-md border-slate-200 bg-white p-6 sm:rounded-3xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-slate-900">Centre logo</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-600">
              {safeLogoUrl
                ? 'This logo appears on your dashboard, welcome pack, and parent-facing cards.'
                : 'No logo yet. Add one to make your centre instantly recognizable to families.'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex justify-center">
            <div className="relative h-40 w-40 overflow-hidden rounded-full border-4 border-slate-100 bg-slate-50 shadow-[0_12px_28px_rgba(15,23,42,0.14)]">
              {safeLogoUrl ? (
                <Image src={safeLogoUrl} alt={`${centreName} logo preview`} fill className="object-cover" />
              ) : (
                <span className="inline-flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50 text-4xl font-black tracking-wide text-teal-700">
                  {initials}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <Button asChild className="h-11 rounded-2xl bg-teal-600 px-6 font-bold text-white hover:bg-teal-700">
              <Link href={updateHref}>
                <PencilLine className="h-4 w-4" />
                Update logo
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">View or update logo</p>
    </div>
  )
}

export default EcdLogoAvatar
