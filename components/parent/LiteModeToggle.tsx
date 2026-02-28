'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Zap, ZapOff } from 'lucide-react'

export function LiteModeToggle() {
  const [liteMode, setLiteMode] = useState(false)

  useEffect(() => {
    const isLite = localStorage.getItem('cc_lite_mode') === 'true'
    setLiteMode(isLite)
    if (isLite) document.documentElement.classList.add('lite-mode')
  }, [])

  const toggleLiteMode = (checked: boolean) => {
    setLiteMode(checked)
    if (checked) {
      localStorage.setItem('cc_lite_mode', 'true')
      document.documentElement.classList.add('lite-mode')
    } else {
      localStorage.setItem('cc_lite_mode', 'false')
      document.documentElement.classList.remove('lite-mode')
    }
  }

  return (
    <div className="flex items-center justify-between p-1">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${liteMode ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
          {liteMode ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Lite Mode</p>
          <p className="text-xs text-slate-500 font-medium">Save data by disabling animations</p>
        </div>
      </div>
      <Switch 
        checked={liteMode}
        onCheckedChange={toggleLiteMode}
      />
    </div>
  )
}
