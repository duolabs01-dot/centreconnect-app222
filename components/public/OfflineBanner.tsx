'use client'

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils'; // Assuming cn utility is available

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-20 left-4 right-4 bg-amber-600 text-white text-center py-2 rounded-xl text-sm z-50",
      "md:bottom-4 md:left-auto md:right-4 md:max-w-xs md:text-left md:px-4 md:py-3 md:rounded-lg md:shadow-lg" // Optional: desktop styling
    )}>
      You are offline. Some features limited.
    </div>
  );
}
