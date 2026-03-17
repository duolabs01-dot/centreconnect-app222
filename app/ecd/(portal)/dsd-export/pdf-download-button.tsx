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
      // Get auth token from localStorage (assuming it's stored there)
      const token = localStorage.getItem('supabase.auth.token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(
        `/api/ecd/dsd-export/pdf?month=${month}&year=${year}`,
        {
          headers: {
            'Authorization': `Bearer ${JSON.parse(token).access_token}`
          }
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate PDF')
      }

      // Get the PDF blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Generate filename
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December']
      const filename = `DOE-Monthly-Report-${monthNames[month - 1]}-${year}.pdf`
      a.download = filename
      
      // Trigger download
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      // Show success state
      setState('success')
      setMessage('PDF downloaded successfully!')
      
      // Show back navigation
      const backNav = document.getElementById('back-navigation')
      if (backNav) {
        backNav.classList.remove('hidden')
      }

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setState('idle')
        setMessage('')
      }, 3000)

    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Failed to generate PDF')
      
      // Reset to idle after 5 seconds
      setTimeout(() => {
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
            ✓ Downloaded
          </>
        )
      case 'error':
        return (
          <>
            <AlertCircle className="mr-1.5 h-3.5 w-3.5 text-rose-600" />
            Try Again
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

  const getButtonVariant = () => {
    switch (state) {
      case 'loading':
        return 'default' as const
      case 'success':
        return 'outline' as const
      case 'error':
        return 'destructive' as const
      default:
        return 'default' as const
    }
  }

  const getButtonClassName = () => {
    const base = 'rounded-2xl text-xs font-bold'
    switch (state) {
      case 'loading':
        return `${base} opacity-75 cursor-not-allowed`
      case 'success':
        return `${base} border-emerald-200 text-emerald-700 hover:bg-emerald-50`
      case 'error':
        return `${base} border-rose-200 text-rose-700 hover:bg-rose-50`
      default:
        return `${base} bg-cyan-600 text-white hover:bg-cyan-700`
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleDownload}
        disabled={state === 'loading'}
        variant={getButtonVariant()}
        className={getButtonClassName()}
        size="sm"
      >
        {renderButtonContent()}
      </Button>
      
      {message && (
        <div className={`text-[11px] font-medium ${
          state === 'success' ? 'text-emerald-600' : 
          state === 'error' ? 'text-rose-600' : 
          'text-slate-600'
        }`}>
          {message}
        </div>
      )}
    </div>
  )
}
