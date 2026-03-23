'use client'

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';
import { useLiteMode } from '@/lib/context/LiteModeProvider';

interface LiteImageProps extends ImageProps {
  fallbackSrc?: string;
}

export function LiteImage({ fallbackSrc, ...props }: LiteImageProps) {
  const { isLiteMode } = useLiteMode();
  const [error, setError] = useState(false);

  const effectiveQuality = props.priority
    ? props.quality 
    : isLiteMode
      ? 30 
      : props.quality ?? 75;

  // If there's an error and no fallback, we return a transparent pixel to avoid "broken image" icon
  // or a provided fallbackSrc
  const src = error ? (fallbackSrc ?? "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7") : props.src;

  return (
    <Image 
      {...props} 
      src={src}
      alt={props.alt || ''} 
      quality={effectiveQuality} 
      onError={() => setError(true)}
    />
  );
}
