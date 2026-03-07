'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface CentreCardProps {
  id: string;
  slug?: string;
  name: string;
  image?: string;
  cover_image_url?: string;
  logo_url?: string;
  address?: string;
  distance?: string;
  distanceLabel?: string;
  rating?: number;
  fees?: string;
  feesLabel?: string;
  age_groups: string[];
  tagline?: string;
  capacity?: number;
  existingApplicationStatus?: string | null;
  is_claimed?: boolean;
  isSaved?: boolean;
  onApply?: () => void;
  onSave?: () => void;
}

export function CentreCard({
  id,
  slug,
  name,
  cover_image_url,
  logo_url,
  address,
  distanceLabel,
  feesLabel,
  age_groups,
  rating = 4.8,
  tagline,
  is_claimed = true,
  isSaved = false,
  onApply,
  onSave,
}: CentreCardProps) {
  const [saved, setSaved] = useState(isSaved);

  const handleSave = () => {
    setSaved(!saved);
    onSave?.();
  };

  const router = useRouter();

  const handleApply = () => {
    if (onApply) {
      onApply();
      return;
    }

    if (id.startsWith('centre-')) {
      router.push('/directory');
      return;
    }

    const identifier = slug ? encodeURIComponent(slug) : id
    router.push(`/apply/${identifier}`)
  };

  const handleViewDetails = () => {
    if (id.startsWith('centre-')) {
      router.push(`/directory?search=${encodeURIComponent(name)}`);
      return;
    }

    if (slug) {
      router.push(`/centre/${encodeURIComponent(slug)}`);
      return;
    }

    router.push('/directory');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white">
        <div className="relative h-56 overflow-hidden">
          <Image
            src={cover_image_url || 'https://thumbs.dreamstime.com/b/young-african-preschool-kids-playing-playground-kindergarten-school-soweto-south-africa-july-180790376.jpg'}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />

          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {!is_claimed && (
              <Badge variant="secondary" className="bg-slate-900/85 text-xs font-medium text-white">
                Listed only
              </Badge>
            )}
            {distanceLabel && (
              <Badge variant="secondary" className="bg-white/90 text-xs font-medium">
                <MapPin className="w-3 h-3 mr-1" /> {distanceLabel}
              </Badge>
            )}
            {feesLabel && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                {feesLabel}
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            className="absolute top-4 left-4 bg-white/90 hover:bg-white rounded-full shadow"
          >
            <Heart className={cn('w-5 h-5 transition-colors', saved ? 'fill-red-500 text-red-500' : 'text-gray-600')} />
          </Button>

          {logo_url ? (
            <div className="absolute -bottom-7 left-4 z-10 h-14 w-14 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg">
              <Image
                src={logo_url}
                alt={`${name} logo`}
                width={56}
                height={56}
                className="h-full w-full object-cover"
                sizes="56px"
                unoptimized
              />
            </div>
          ) : null}
        </div>

        <CardContent className={cn('p-6 space-y-4', logo_url ? 'pt-10' : undefined)}>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-navy-950">{name}</h3>
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
            type="button"
            onClick={is_claimed ? handleApply : undefined}
            disabled={!is_claimed}
            className={cn(
              'flex-1 py-6 rounded-2xl text-base font-semibold shadow-md transition-all',
              is_claimed
                ? 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95'
                : 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
            )}
          >
            {is_claimed ? 'Apply now - it is free' : 'Online applications not available'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleViewDetails}
            className="flex-1 border-2 border-slate-300 bg-white hover:border-slate-500 hover:bg-slate-50 py-6 rounded-2xl text-base text-slate-700"
          >
            View Details
          </Button>
        </CardFooter>
        {!is_claimed ? (
          <div className="px-6 pb-6 text-xs font-medium text-slate-500">
            This centre is listed in the directory, but it is not on CentreConnect yet.
          </div>
        ) : null}
      </Card>
    </motion.div>
  );
}

export default CentreCard;
