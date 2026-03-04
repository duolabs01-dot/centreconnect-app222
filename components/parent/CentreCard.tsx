'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LiteImage } from '@/components/ui/LiteImage'
import { Heart, MapPin, Star, Users } from 'lucide-react'

interface CentreCardProps {
  id: string
  slug?: string
  name: string
  tagline?: string
  city?: string
  suburb?: string
  cover_image_url?: string
  logo_url?: string
  distanceLabel?: string
  feesLabel?: string
  age_groups?: string[]
  rating?: number
  saved?: boolean
}

const cardMotion = {
  initial: { y: 0, boxShadow: '0 18px 35px rgba(15, 23, 42, 0.22)' },
  hover: { y: -6, boxShadow: '0 30px 60px rgba(15, 23, 42, 0.35)' },
}

const imageMotion = {
  rest: { scale: 1, rotate: 0 },
  hover: { scale: 1.05, rotate: 0.2 },
}

export default function CentreCard({
  slug = '',
  name,
  tagline,
  city,
  suburb,
  cover_image_url,
  logo_url,
  distanceLabel,
  feesLabel,
  age_groups = [],
  rating,
  saved: initialSaved = false,
}: CentreCardProps) {
  const [isSaved, setIsSaved] = useState(initialSaved)
  const safeSlug = slug.trim().length ? slug.trim() : 'directory'
  const encodedSlug = encodeURIComponent(safeSlug)
  const centreHref = `/c/${encodedSlug}`
  const applyHref = `/apply/${encodedSlug}`
  const locationLabel = [suburb?.trim(), city?.trim()].filter(Boolean).join(', ') || 'Location coming soon'

  const ageBadges = useMemo(() => {
    if (!age_groups.length) return ['Ages all'];
    return age_groups.slice(0, 3)
  }, [age_groups])

  function toggleSave(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    setIsSaved((prev) => !prev)
  }

  return (
    <motion.div
      initial="initial"
      whileHover="hover"
      animate="rest"
      variants={cardMotion}
      transition={{ type: 'spring', stiffness: 180, damping: 18 }}
      className="w-full"
    >
      <Card className="overflow-hidden rounded-2xl border-0 bg-slate-950 text-white">
        <CardHeader className="p-0">
          <motion.div
            variants={imageMotion}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            className="relative h-52 w-full overflow-hidden rounded-b-none rounded-2xl border-b border-white/10"
          >
            <LiteImage
              src={cover_image_url ?? 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'}
              alt={`View of ${name}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
            <motion.button
              type="button"
              onClick={toggleSave}
              aria-pressed={isSaved}
              aria-label={isSaved ? 'Remove from saved centres' : 'Save this centre for later'}
              className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-black/40 text-rose-400 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              whileTap={{ scale: 0.92 }}
            >
              <Heart className={isSaved ? 'fill-rose-500 text-rose-500' : 'text-white'} size={20} strokeWidth={2.1} />
            </motion.button>
            <div className="absolute left-4 bottom-4 rounded-2xl bg-amber-50/80 px-3 py-1 text-xs font-semibold text-amber-900 shadow-[0_12px_24px_rgba(15,23,42,0.45)]">
              Orbitron
            </div>
          </motion.div>
          <div className="absolute inset-0 pointer-events-none" />
        </CardHeader>

        <CardContent className="pt-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle style={{ fontFamily: 'Orbitron, sans-serif' }} className="text-2xl tracking-[0.2em]">
                {name}
              </CardTitle>
              {tagline ? (
                <CardDescription className="text-sm text-slate-300">{tagline}</CardDescription>
              ) : (
                <CardDescription className="text-sm text-slate-400">
                  Crafted for calm mornings and joyful late afternoons.
                </CardDescription>
              )}
            </div>
            {logo_url && (
              <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/30 bg-white/20 shadow-lg">
                <LiteImage src={logo_url} alt={`${name} logo`} width={48} height={48} className="object-cover" />
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-200">
            <span className="inline-flex items-center gap-1 text-cyan-200 font-semibold">
              <MapPin size={16} />
              {locationLabel}
            </span>
            {rating && (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                <Star size={16} />
                {rating.toFixed(1)}
              </span>
            )}
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-200">
              <Users size={16} />
              Warm community
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {distanceLabel && (
              <Badge variant="outline" className="border-amber-200 text-amber-200">
                {distanceLabel}
              </Badge>
            )}
            {feesLabel && (
              <Badge variant="outline" className="border-cyan-200 text-cyan-100">
                {feesLabel}
              </Badge>
            )}
            {ageBadges.map((group) => (
              <Badge key={group} variant="outline" className="border-white/30 text-white/90">
                {group} yrs
              </Badge>
            ))}
          </div>

          <p className="mt-4 text-sm text-slate-300 leading-relaxed">
            Drop a message, start a tour, and feel the calm. This centre is built for parents who value
            intentional care and joyful learning.
          </p>
        </CardContent>

        <CardFooter
          className="flex flex-col gap-3 border-t border-white/10 pt-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 1rem) + 1rem)' }}
        >
          <div className="flex flex-col gap-3">
            <Button
              asChild
              className="min-h-[52px] rounded-2xl bg-teal-600 px-6 font-semibold text-base text-white shadow-[0_16px_35px_rgba(16,185,129,0.35)] transition hover:bg-teal-500 focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              <Link href={applyHref} aria-label={`Apply now to ${name} – it is free`}>
                Apply Now – It’s Free
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-[48px] rounded-2xl border-white/30 bg-white/10 px-5 font-semibold text-sm tracking-wide text-white hover:border-white hover:bg-white/20"
            >
              <Link href={centreHref}>View Details</Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
            <span className="text-slate-500">Calm space meets premium care. We reply in less than 24 hours.</span>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
