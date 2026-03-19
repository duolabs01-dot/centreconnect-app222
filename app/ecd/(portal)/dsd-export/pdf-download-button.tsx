'use client'

import { useState } from 'react'
import { Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PdfDownloadButtonProps {
  month: number
  year: number
}

export function PdfDownloadButton({ month, year }: PdfDownloadButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleDownload = async () => {
    setState('loading')
    setMessage('')

    try {
      const response = await fetch(`/api/ecd/dsd-export/pdf?month=${month}&year=${year}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error || 'Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      anchor.download = `Monthly-Report-${monthNames[month - 1]}-${year}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(url)

      setState('success')
      setMessage('PDF downloaded successfully!')

      const backNavigation = document.getElementById('back-navigation')
      if (backNavigation) {
        backNavigation.classList.remove('hidden')
      }

      window.setTimeout(() => {
        setState('idle')
        setMessage('')
      }, 3000)
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Failed to generate PDF')

      window.setTimeout(() => {
        setState('idle')
        setMessage('')
      }, 5000)
    }
  }

  const renderButtonContent = () => {
    switch (state) {
      case 'loading':
        return (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Generating...
          </>
        )
      case 'success':
        return (
          <>
            <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
            Downloaded
          </>
        )
      case 'error':
        return (
          <>
            <AlertCircle className="mr-1.5 h-3.5 w-3.5 text-rose-600" />
            Try again
          </>
        )
      default:
        return (
          <>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download PDF
          </>
        )
    }
  }

  const variant = state === 'error' ? 'destructive' : state === 'success' ? 'outline' : 'default'
  const className =
    state === 'success'
      ? 'rounded-2xl border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-50'
      : state === 'error'
        ? 'rounded-2xl text-xs font-bold'
        : 'rounded-2xl bg-cyan-600 text-xs font-bold text-white hover:bg-cyan-700'

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleDownload} disabled={state === 'loading'} variant={variant} className={className} size="sm">
        {renderButtonContent()}
      </Button>
      {message ? (
        <div className={`text-[11px] font-medium ${state === 'success' ? 'text-emerald-600' : state === 'error' ? 'text-rose-600' : 'text-slate-600'}`}>
          {message}
        </div>
      ) : null}
    </div>
  )
}
