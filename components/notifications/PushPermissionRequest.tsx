'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushPermissionRequest() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window)
    setPermission(Notification.permission)
  }, [])

  async function subscribeToPush() {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicVapidKey) throw new Error('VAPID key not found')

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      })

      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      })

      if (!res.ok) throw new Error('Failed to save subscription')

      setPermission('granted')
      toast.success('Notifications enabled!')
    } catch (error: any) {
      console.error('Push subscription error:', error)
      toast.error('Could not enable notifications. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported || permission === 'granted') return null

  return (
    <div className="rounded-3xl bg-slate-900 p-6 text-white relative overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="absolute top-0 right-0 p-6 opacity-10">
        <Bell className="h-20 w-20" />
      </div>
      
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="h-12 w-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-500/30 text-cyan-400">
          <Bell className="h-6 w-6" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-black tracking-tight">Stay updated instantly.</h3>
          <p className="text-slate-400 text-sm font-medium mt-1 leading-relaxed">
            Get real-time alerts when your application status changes or when your child is checked in.
          </p>
        </div>

        <Button 
          onClick={subscribeToPush} 
          disabled={loading}
          className="h-12 rounded-xl bg-cyan-500 text-slate-900 font-black px-6 hover:bg-cyan-400 transition-all active:scale-95 shrink-0 shadow-lg shadow-cyan-500/20"
        >
          {loading ? 'Enabling...' : 'Enable Notifications'}
        </Button>
      </div>
    </div>
  )
}
