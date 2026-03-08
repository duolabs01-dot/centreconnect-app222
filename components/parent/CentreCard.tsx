'use client'

import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PremiumVerifiedBadge } from '@/components/ui/premium-verified-badge'
import { Heart, MapPin, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

interface CentreCardProps {
  id: string
  slug?: string
  name: string
  image?: string
  cover_image_url?: string
  logo_url?: string
  address?: string
  distance?: string
  distanceLabel?: string
  rating?: number
  fees?: string
  feesLabel?: string
  age_groups: string[]
  tagline?: string
  capacity?: number
  existingApplicationStatus?: string | null
  is_claimed?: boolean
  is_registered?: boolean | null
  isSaved?: boolean
  onApply?: () => void
  onSave?: () => void
}

export function CentreCard({
  id,
  slug,
  name,
  cover_image_url,
  logo_url,
  address,
  feesLabel,
  age_groups,
  rating = 4.8,
  tagline,
  is_claimed = true,
  is_registered = false,
  isSaved = false,
  onApply,
  onSave,
}: CentreCardProps) {
  const [saved, setSaved] = useState(isSaved)
  const router = useRouter()

  const handleSave = () => {
    setSaved(!saved)
    onSave?.()
  }

  const handleApply = () => {
    if (onApply) {
      onApply()
      return
    }

    if (id.startsWith('centre-')) {
      router.push('/directory')
      return
    }

    const identifier = slug ? encodeURIComponent(slug) : id
    router.push(`/apply/${identifier}`)
  }

  const handleViewDetails = () => {
    if (id.startsWith('centre-')) {
      router.push(`/directory?search=${encodeURIComponent(name)}`)
      return
    }

    if (slug) {
      router.push(`/centre/${encodeURIComponent(slug)}`)
      return
    }

    router.push('/directory')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group h-full"
    >
      <Card className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-[#E8DDD0] bg-[#FFFDF9] shadow-[0_10px_28px_rgba(31,44,39,0.05)] transition-all duration-300 hover:shadow-[0_18px_44px_rgba(31,44,39,0.08)]">
        <div className="relative h-52 overflow-hidden">
          <Image
            src={cover_image_url || 'https://thumbs.dreamstime.com/b/young-african-preschool-kids-playing-playground-kindergarten-school-soweto-south-africa-july-180790376.jpg'}
            alt={name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
            {Boolean(is_registered) && (
              <PremiumVerifiedBadge compact label="Verified ECD" className="border-white/60 shadow-[0_12px_28px_rgba(108,71,0,0.26)]" />
            )}
            {!is_claimed && (
              <Badge className="bg-slate-900/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md shadow-none">
                Public Listing
              </Badge>
            )}
            {feesLabel && (
              <Badge className="border border-[#E3D2BC] bg-[#FDF0E6] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B47642] shadow-none">
                {feesLabel}
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            className="absolute left-4 top-4 h-10 w-10 rounded-2xl bg-white/90 shadow-xl backdrop-blur-md transition-transform active:scale-90 hover:bg-white"
          >
            <Heart className={cn('h-5 w-5 transition-colors', saved ? 'fill-rose-500 text-rose-500' : 'text-slate-400')} />
          </Button>

          {logo_url ? (
            <div className="absolute -bottom-6 left-6 z-10 h-16 w-16 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-2xl">
              <Image
                src={logo_url}
                alt={`${name} logo`}
                width={64}
                height={64}
                className="h-full w-full object-cover"
                sizes="64px"
                unoptimized
              />
            </div>
          ) : (
            <div className="absolute -bottom-6 left-6 z-10 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-[#F5EFE6] shadow-2xl">
              <span className="text-xl font-black text-[#0D9488]">{name.charAt(0)}</span>
            </div>
          )}
        </div>

        <CardContent className="flex-1 space-y-4 p-6 pt-10">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3
                  className="line-clamp-2 text-[1.35rem] leading-tight tracking-[-0.02em] text-[#1F2D29]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {name}
                </h3>
                {tagline && <p className="mt-1 line-clamp-2 text-sm font-medium text-[#66736F]">{tagline}</p>}
              </div>
              <div className="shrink-0 rounded-full bg-[#FDF0E6] px-2 py-0.5 text-[#B47642]">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  <span className="text-xs font-semibold">{rating}</span>
                </div>
              </div>
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7B827E]">
              <MapPin className="h-3 w-3" />
              {address || 'Johannesburg'}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {age_groups.slice(0, 3).map((age) => (
              <Badge key={age} variant="secondary" className="border border-[#E7DDD1] bg-white px-2.5 py-1 text-[10px] font-medium text-[#5F6C68] shadow-none">
                {age.replace(/(\d+)([my])/g, '$1$2 old')}
              </Badge>
            ))}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 p-6 pt-0">
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleViewDetails}
              className="flex-1 rounded-2xl border-[#DDD5C8] bg-white py-6 text-sm font-semibold text-[#4E5D59] transition-all hover:bg-[#FAF8F4]"
            >
              View details
            </Button>
            {is_claimed ? (
              <Button
                type="button"
                onClick={handleApply}
                className="flex-1 rounded-2xl bg-[#0D9488] py-6 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(13,148,136,0.18)] transition-all hover:bg-[#0B857A] active:scale-95"
              >
                Apply now
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="flex-1 rounded-2xl border-[#DDD5C8] bg-white py-6 text-sm font-semibold text-[#4E5D59] transition-all hover:bg-[#FAF8F4] active:scale-95"
              >
                <Link href="/for-centres/intro">Learn More</Link>
              </Button>
            )}
          </div>

          {!is_claimed && (
            <p className="text-center text-[10px] font-medium leading-tight text-[#7B827E]">
              Own this centre?{' '}
              <Link href="/for-centres/intro" className="font-semibold text-[#0D9488] hover:underline">
                Claim it here →
              </Link>
            </p>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  )
}

export default CentreCard
