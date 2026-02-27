'use client'

import Image, { ImageProps } from 'next/image';
import { useLiteMode } from '@/lib/context/LiteModeProvider'; // Adjust path as necessary

interface LiteImageProps extends ImageProps {
  // You can add custom props here if needed, or just extend ImageProps
}

export function LiteImage(props: LiteImageProps) {
  const { isLiteMode } = useLiteMode();

  // If priority is set, always use default quality or provided quality, not lite mode quality
  const effectiveQuality = props.priority
    ? props.quality // If priority is set, use provided quality or default Next.js quality
    : isLiteMode
      ? 30 // Lower quality for lite mode
      : props.quality ?? 75; // Default to 75 if not specified and not in lite mode

  return <Image {...props} quality={effectiveQuality} />;
}
