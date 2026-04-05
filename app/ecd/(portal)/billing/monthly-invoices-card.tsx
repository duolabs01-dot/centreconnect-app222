'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { FileText, TrendingUp, Users } from 'lucide-react'

type MonthlyInvoicesCardProps = {
  enrolledWithFeesCount: number
  totalExpectedMonthlyRevenue: number
  currentMonthName: string
  year: number
  month: number
}

export function MonthlyInvoicesCard({
  enrolledWithFeesCount,
  totalExpectedMonthlyRevenue,
  currentMonthName,
  year,
  month
}: MonthlyInvoicesCardProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()

  async function handleGenerate() {
    if (!confirm(`Generate invoices for ${currentMonthName} ${year}? This will notify parents.`)) {
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/internal/generate-monthly-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ year, month })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`Generated ${data.count} invoices successfully.`)
        // Soft refresh avoids a full shell reload while still revalidating server data.
        setTimeout(() => router.refresh(), 800)
      } else {
        toast.error(data.error || 'Failed to generate invoices')
      }
    } catch (err) {
      console.error('Error generating invoices:', err)
      toast.error('An unexpected error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="border-teal-100 bg-teal-50/20 shadow-sm rounded-3xl overflow-hidden">
      <CardHeader className="bg-teal-50/50">
        <CardTitle className="text-base font-bold text-teal-900 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Monthly Invoices
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-teal-100 bg-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-3.5 w-3.5 text-teal-600" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enrolled with Fee</p>
            </div>
            <p className="text-xl font-black text-slate-900">{enrolledWithFeesCount}</p>
          </div>
          <div className="rounded-2xl border border-teal-100 bg-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Revenue</p>
            </div>
            <p className="text-xl font-black text-emerald-900">R{totalExpectedMonthlyRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-600 leading-relaxed">
            Generate recurring invoices for all enrolled children with a fee agreement. This will create &apos;sent&apos; invoices and notify parents immediately.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || enrolledWithFeesCount === 0}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 rounded-2xl shadow-md transition-colors"
          >
            {isGenerating ? 'Generating...' : `Generate Invoices for ${currentMonthName}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

