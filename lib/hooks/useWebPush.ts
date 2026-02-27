// lib/hooks/useWebPush.ts
'use client'

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client'; // Assuming you have a Supabase client configured
import { toast } from 'sonner';

// Helper function to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush(userId?: string, ecdId?: string) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const supabase = createClient();
  
  // VAPID Public Key from environment variables
  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !VAPID_PUBLIC_KEY) {
      console.warn('Service Worker or VAPID Public Key not available.');
      return;
    }

    setSubscriptionLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        setIsSubscribed(true);
      } else {
        const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
        setIsSubscribed(true);
      }

      // Send subscription to your Supabase Edge Function
      if (subscription) {
        const { error: edgeFunctionError } = await supabase.functions.invoke('web-push/subscribe', {
          body: {
            subscription,
            userId,
            ecdId,
          },
          // Assuming web-push endpoint is public or handled by RLS on table
          // or has internal auth. For now, assuming public access to subscribe endpoint.
        });

        if (edgeFunctionError) {
          console.error('Error sending push subscription to Edge Function:', edgeFunctionError);
          toast.error('Failed to enable notifications.');
          setIsSubscribed(false); // Mark as not subscribed if server save fails
        } else {
          toast.success('Notifications enabled!');
        }
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      toast.error('Failed to enable notifications. Please ensure you allow notifications in your browser settings.');
      setIsSubscribed(false);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [supabase.functions, userId, ecdId, VAPID_PUBLIC_KEY]);

  const unsubscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    setSubscriptionLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        setIsSubscribed(false);

        // Optionally, inform your Edge Function to remove this subscription from DB
        // For simplicity, we'll let the Edge Function handle "gone" subscriptions
        // when trying to send a notification.
        toast.info('Notifications disabled.');
      }
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      toast.error('Failed to disable notifications.');
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  const requestPermissionAndSubscribe = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support notifications.');
      return;
    }

    if (Notification.permission === 'denied') {
      toast.error('Notification permission denied. Please enable it in your browser settings.');
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await registerServiceWorker();
      } else {
        toast.error('Notification permission not granted.');
      }
    } else if (Notification.permission === 'granted') {
      await registerServiceWorker();
    }
  }, [registerServiceWorker]);

  useEffect(() => {
    // Check initial subscription status
    if ('serviceWorker' in navigator && VAPID_PUBLIC_KEY) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, [VAPID_PUBLIC_KEY]);

  return { isSubscribed, subscriptionLoading, requestPermissionAndSubscribe, unsubscribe };
}
