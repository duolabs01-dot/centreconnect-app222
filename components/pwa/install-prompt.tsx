'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ModernCard } from '@/components/ui/modern-card'
import { Download, X } from 'lucide-react'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Show after first successful action (simulated via localStorage)
      const hasActed = localStorage.getItem('cc_first_action_complete')
      const dismissed = localStorage.getItem('cc_install_dismissed')
      
      if (hasActed && !dismissed) {
        setShow(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!show) return null

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShow(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('cc_install_dismissed', 'true')
    setShow(false)
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[60] animate-in slide-in-from-bottom-8 duration-500 md:left-auto md:right-8 md:w-96">
      <ModernCard className="border-t-4 border-t-[#065A82] shadow-float relative">
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-[#065A82]/10 flex items-center justify-center text-[#065A82]">
            <Download className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 leading-tight">Install App</h3>
            <p className="text-xs text-slate-500 font-medium">Add CentreConnect to your home screen</p>
          </div>
        </div>

        <Button onClick={handleInstall} className="w-full h-11 rounded-xl bg-[#065A82] font-bold text-white shadow-lg">
          Install Now
        </Button>
      </ModernCard>
    </div>
  )
}
