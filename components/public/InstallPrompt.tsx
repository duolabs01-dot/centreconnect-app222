'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ecd/Button'; // Re-using existing Button component
import { XIcon } from 'lucide-react'; // Icon for dismiss

interface InstallPromptProps {
  // This prop would come from your application logic, e.g., a user's session data
  // to determine if they've submitted their first application.
  hasSubmittedFirstApplication: boolean;
}

const DISMISS_KEY = 'pwaInstallPromptDismissed';
const ALREADY_INSTALLED_KEY = 'pwaInstalled';

export function InstallPrompt({ hasSubmittedFirstApplication }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if dismissed or already installed
  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY) === 'true';
    const installed = localStorage.getItem(ALREADY_INSTALLED_KEY) === 'true';
    if (dismissed || installed) {
      setShowPrompt(false);
    } else {
      // Listen for the beforeinstallprompt event
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        // Only show if user meets criteria and hasn't dismissed/installed
        if (hasSubmittedFirstApplication) {
          setShowPrompt(true);
        }
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // Listen for appinstalled event
      const handleAppInstalled = () => {
        localStorage.setItem(ALREADY_INSTALLED_KEY, 'true');
        setShowPrompt(false);
      };
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, [hasSubmittedFirstApplication]);

  // If hasSubmittedFirstApplication changes, re-evaluate showing the prompt
  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY) === 'true';
    const installed = localStorage.getItem(ALREADY_INSTALLED_KEY) === 'true';
    if (deferredPrompt && hasSubmittedFirstApplication && !dismissed && !installed) {
      setShowPrompt(true);
    } else {
      setShowPrompt(false);
    }
  }, [hasSubmittedFirstApplication, deferredPrompt]);


  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      (deferredPrompt as any).prompt();
      const { outcome } = await (deferredPrompt as any).userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the PWA install prompt.');
        localStorage.setItem(ALREADY_INSTALLED_KEY, 'true');
      } else {
        console.log('User dismissed the PWA install prompt.');
        localStorage.setItem(DISMISS_KEY, 'true'); // Dismiss if not accepted
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  }, [deferredPrompt]);

  const handleDismissClick = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setShowPrompt(false);
  }, []);

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-primary-foreground text-primary rounded-xl p-4 shadow-lg md:max-w-md md:left-auto md:right-8">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">Install CentreConnect App</h3>
        <button onClick={handleDismissClick} className="text-gray-500 hover:text-gray-700">
          <XIcon size={20} />
        </button>
      </div>
      <p className="text-sm mb-4">
        Get offline access to your child&apos;s attendance and quick pickups by installing the app.
      </p>
      <Button onClick={handleInstallClick} className="w-full">
        Install App
      </Button>
    </div>
  );
}
