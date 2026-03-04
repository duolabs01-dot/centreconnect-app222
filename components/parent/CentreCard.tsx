'use client'

import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, MapPin, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { cn } from '@/lib/utils'

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
  rating: number
  fees?: string
  feesLabel?: string
  age_groups: string[]
  tagline?: string
  capacity?: number
  existingApplicationStatus?: string
  isSaved?: boolean
  onApply?: () => void
  onSave?: () => void
}

export function CentreCard({
  id,
  name,
  image,
  cover_image_url,
  logo_url,
  address,
  distance,
  distanceLabel,
  rating,
  fees,
  feesLabel,
  age_groups,
  tagline,
  capacity,
  existingApplicationStatus,
  isSaved = false,
  onApply,
  onSave,
}: CentreCardProps) {
  const [saved, setSaved] = useState(isSaved)
  const displayImage = cover_image_url || image || '/placeholder-centre.jpg'

  const handleSave = () => {
    setSaved(!saved)
    onSave?.()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white">
        {/* Premium Image Header */}
        <div className="relative h-56 overflow-hidden">
          <img
            src={displayImage}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />

          {/* Warm Badges */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {(distance || distanceLabel) && (
              <Badge variant="secondary" className="bg-white/90 text-xs font-medium">
                <MapPin className="w-3 h-3 mr-1" /> {distance || distanceLabel}
              </Badge>
            )}
            {(fees || feesLabel) && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                {fees || feesLabel}
              </Badge>
            )}
          </div>

          {/* Save Heart */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            className="absolute top-4 left-4 bg-white/90 hover:bg-white rounded-full shadow"
          >
            <Heart className={cn('w-5 h-5 transition-colors', saved ? 'fill-red-500 text-red-500' : 'text-gray-600')} />
          </Button>
        </div>

        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="font-orbitron text-2xl text-navy-950 font-bold tracking-tight">{name}</h3>
            {tagline && <p className="text-muted-foreground text-sm mt-1">{tagline}</p>}
            {address && (
              <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" /> {address}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-5 h-5 fill-current" />
              <span className="font-semibold text-lg">{rating}</span>
            </div>
            <div className="flex gap-1">
              {age_groups.slice(0, 2).map((age) => (
                <Badge key={age} variant="outline" className="text-xs border-teal-200 text-teal-700">
                  {age}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="px-6 pb-6 pt-0 gap-3">
          <Button
            onClick={onApply}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-6 rounded-2xl text-base shadow-md active:scale-95 transition-all"
          >
            Apply Now – It’s Free
          </Button>

          <Button
            variant="outline"
            onClick={() => window.open(`/centres/${id}`, '_blank')}
            className="flex-1 border-2 border-navy-200 hover:border-navy-400 py-6 rounded-2xl text-base"
          >
            View Details
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
