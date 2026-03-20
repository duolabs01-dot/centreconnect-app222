'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'

type MonthYearSelectorProps = {
  months: string[]
  years: number[]
  initialMonth: number
  initialYear: number
}

export function MonthYearSelector({ months, years, initialMonth, initialYear }: MonthYearSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const formRef = useRef<HTMLFormElement>(null)

  // Sync selects with URL params when they change (e.g., back/forward navigation)
  useEffect(() => {
    const urlMonth = searchParams.get('month')
    const urlYear = searchParams.get('year')
    const monthSelect = formRef.current?.querySelector<HTMLSelectElement>('[name="month"]')
    const yearSelect = formRef.current?.querySelector<HTMLSelectElement>('[name="year"]')
    if (monthSelect && urlMonth) monthSelect.value = urlMonth
    if (yearSelect && urlYear) yearSelect.value = urlYear
  }, [searchParams])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const month = (form.elements.namedItem('month') as HTMLSelectElement)?.value
    const year = (form.elements.namedItem('year') as HTMLSelectElement)?.value
    const params = new URLSearchParams()
    if (month) params.set('month', month)
    if (year) params.set('year', year)
    router.push(`/ecd/dsd-export?${params.toString()}`)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <select
        name="month"
        defaultValue={String(initialMonth)}
        className="cc-native-field h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
      >
        {months.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        name="year"
        defaultValue={String(initialYear)}
        className="cc-native-field h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="outline" className="rounded-2xl font-bold">
        Update
      </Button>
    </form>
  )
}
