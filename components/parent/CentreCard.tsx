'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PremiumVerifiedBadge } from '@/components/ui/premium-verified-badge';
import { Heart, MapPin, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

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
  is_registered?: boolean | null;
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
  const [saved, setSaved] = useState(isSaved);
  const router = useRouter();

  const handleSave = () => {
    setSaved(!saved);
    onSave?.();
  };

  const handleApply = () => {
    if (onApply) {
      onApply();
      return;
    }

    if (id.startsWith('centre-')) {
      router.push('/directory');
      return;
    }

    const identifier = slug ? encodeURIComponent(slug) : id;
    router.push(`/apply/${identifier}`);
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
      className="group h-full"
    >
      <Card className="flex h-full flex-col overflow-hidden rounded-[2rem] border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
        <div className="relative h-52 overflow-hidden">
          <Image
            src={cover_image_url || 'https://thumbs.dreamstime.com/b/young-african-preschool-kids-playing-playground-kindergarten-school-soweto-south-africa-july-180790376.jpg'}
            alt={name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
            {Boolean(is_registered) && (
              <PremiumVerifiedBadge
                compact
                label="Verified ECD"
                className="border-white/60 shadow-[0_12px_28px_rgba(108,71,0,0.26)]"
              />
            )}
            {!is_claimed && (
              <Badge className="bg-slate-900/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md shadow-none">
                Public Listing
              </Badge>
            )}
            {feesLabel && (
              <Badge className="bg-cyan-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
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
            <div className="absolute -bottom-6 left-6 z-10 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-cyan-50 shadow-2xl">
              <span className="text-xl font-black text-cyan-700">{name.charAt(0)}</span>
            </div>
          )}
        </div>

        <CardContent className="flex-1 space-y-4 p-6 pt-10">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="line-clamp-1 text-xl font-black tracking-tight text-slate-900">{name}</h3>
                {tagline && <p className="mt-1 line-clamp-1 text-sm font-medium text-slate-500">{tagline}</p>}
              </div>
              <div className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  <span className="text-xs font-black">{rating}</span>
                </div>
              </div>
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-400">
              <MapPin className="h-3 w-3" />
              {address || 'Johannesburg'}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {age_groups.slice(0, 3).map((age) => (
              <Badge key={age} variant="secondary" className="border-none bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600 shadow-none">
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
              className="flex-1 rounded-2xl border-2 border-slate-100 bg-white py-6 text-sm font-black text-slate-700 transition-all hover:border-slate-200 hover:bg-slate-50"
            >
              View Centre
            </Button>
            {is_claimed ? (
              <Button
                type="button"
                onClick={handleApply}
                className="flex-1 rounded-2xl bg-cyan-600 py-6 text-sm font-black text-white shadow-lg shadow-cyan-900/20 transition-all hover:bg-cyan-700 active:scale-95"
              >
                Enroll Now
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="flex-1 rounded-2xl border-2 border-slate-100 bg-white py-6 text-sm font-black text-slate-700 transition-all hover:border-slate-200 hover:bg-slate-50 active:scale-95"
              >
                <Link href="/for-centres/intro">Learn More</Link>
              </Button>
            )}
          </div>

          {!is_claimed && (
            <p className="text-center text-[10px] font-medium leading-tight text-slate-400">
              Own this centre?{' '}
              <Link href="/for-centres/intro" className="font-black text-cyan-600 hover:underline">
                Claim it here →
              </Link>
            </p>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default CentreCard;

