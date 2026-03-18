'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Printer, Loader2 } from 'lucide-react'

type AttendanceStatus = 'present' | 'absent' | 'sick' | 'late' | null

type AttendanceRecord = {
  child_id: string
  date: string
  status: AttendanceStatus
}

type Child = {
  id: string
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
  class_id: string | null
}

type EcdClass = {
  id: string
  name: string
  practitioner_name: string | null
}

type AttendanceGridClientProps = {
  ecdId: string
  centreName: string
  registrationNumber: string
  classes: EcdClass[]
  enrolledChildren: Child[]
  initialAttendance: AttendanceRecord[]
  selectedClassId: string | null
  selectedMonth: number
  selectedYear: number
  staffId: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const STATUS_ORDER: AttendanceStatus[] = ['present', 'absent', 'sick', 'late', null]
const STATUS_LABELS: Record<string, string> = {
  present: 'P',
  absent: 'A',
  sick: 'S',
  late: 'L',
}

export function AttendanceGridClient({
  ecdId,
  centreName,
  registrationNumber,
  classes,
  enrolledChildren,
  initialAttendance,
  selectedClassId,
  selectedMonth,
  selectedYear,
  staffId,
}: AttendanceGridClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()
  
  // Local state for attendance to make it snappy
  const [localAttendance, setLocalAttendance] = useState<Record<string, Record<number, AttendanceStatus>>>(() => {
    const map: Record<string, Record<number, AttendanceStatus>> = {}
    initialAttendance.forEach(record => {
      const day = new Date(record.date).getDate()
      if (!map[record.child_id]) map[record.child_id] = {}
      map[record.child_id][day] = record.status
    })
    return map
  })

  const [saving, setSaving] = useState<string | null>(null)

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const today = new Date().getDate()
  const isCurrentMonth = new Date().getMonth() + 1 === selectedMonth && new Date().getFullYear() === selectedYear

  const selectedClass = classes.find(c => c.id === selectedClassId)

  // Handle month/year/class selection
  function updateParams(newClassId: string, newMonth: string, newYear: string) {
    startTransition(() => {
      const params = new URLSearchParams()
      if (newClassId !== 'all') params.set('classId', newClassId)
      params.set('month', newMonth)
      params.set('year', newYear)
      router.push(`/ecd/attendance?${params.toString()}`)
    })
  }

  async function toggleStatus(childId: string, day: number) {
    const currentStatus = localAttendance[childId]?.[day] ?? null
    const currentIndex = STATUS_ORDER.indexOf(currentStatus)
    const nextStatus = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length]
    
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const key = `${childId}-${day}`
    
    // Optimistic update
    setLocalAttendance(prev => ({
      ...prev,
      [childId]: {
        ...(prev[childId] || {}),
        [day]: nextStatus
      }
    }))

    setSaving(key)

    try {
      if (nextStatus === null) {
        await supabase
          .from('attendance_records')
          .delete()
          .eq('child_id', childId)
          .eq('date', dateStr)
      } else {
        await supabase
          .from('attendance_records')
          .upsert({
            centre_id: ecdId,
            child_id: childId,
            class_id: selectedClassId,
            date: dateStr,
            status: nextStatus,
            recorded_by: staffId,
            updated_at: new Date().toISOString()
          }, { onConflict: 'child_id,date' })
      }
    } catch (err) {
      toast.error('Failed to save attendance')
      // Revert on error
      setLocalAttendance(prev => ({
        ...prev,
        [childId]: {
          ...(prev[childId] || {}),
          [day]: currentStatus
        }
      }))
    } finally {
      setSaving(null)
    }
  }

  const totalsByChild = useMemo(() => {
    const totals: Record<string, number> = {}
    enrolledChildren.forEach(child => {
      let count = 0
      for (let d = 1; d <= daysInMonth; d++) {
        if (localAttendance[child.id]?.[d] === 'present') count++
      }
      totals[child.id] = count
    })
    return totals
  }, [enrolledChildren, localAttendance, daysInMonth])

  const totalsByDay = useMemo(() => {
    const totals: Record<number, number> = {}
    for (let d = 1; d <= daysInMonth; d++) {
      let count = 0
      enrolledChildren.forEach(child => {
        if (localAttendance[child.id]?.[d] === 'present') count++
      })
      totals[d] = count
    }
    return totals
  }, [enrolledChildren, localAttendance, daysInMonth])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm no-print">
        <div className="flex flex-wrap items-center gap-3">
          <Select 
            value={selectedClassId || 'all'} 
            onValueChange={(val) => updateParams(val, String(selectedMonth), String(selectedYear))}
          >
            <SelectTrigger className="w-[180px] rounded-xl font-bold">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl shadow-xl">
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={String(selectedMonth)} 
            onValueChange={(val) => updateParams(selectedClassId || 'all', val, String(selectedYear))}
          >
            <SelectTrigger className="w-[140px] rounded-xl font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl shadow-xl">
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={String(selectedYear)} 
            onValueChange={(val) => updateParams(selectedClassId || 'all', String(selectedMonth), val)}
          >
            <SelectTrigger className="w-[100px] rounded-xl font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl shadow-xl">
              {[2024, 2025, 2026].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

         <div className="flex items-center gap-2">
           {isPending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
           <Button 
             onClick={() => window.print()}
             variant="outline"
             className="rounded-xl font-black gap-2 border-2 border-slate-100"
           >
             <Printer className="h-4 w-4" />
             Export for DSD
           </Button>
           <Button asChild variant="outline" className="rounded-xl border-slate-200 bg-white font-black text-slate-700">
             <Link href="/ecd/pickup">Pickup codes →</Link>
           </Button>
         </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 no-print">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Reliable fallback</p>
            <h2 className="mt-1 text-sm font-bold text-slate-900">This attendance register is the dependable manual path</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              If a paper register photo is blurry, messy, or misses names, keep working here. You can also switch to
              the import tools for one clear photo or a typed CSV, then come back here to confirm the result.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl border-slate-200 bg-white font-black text-slate-700">
              <Link href="/ecd/children/new#bulk-existing-children">Bulk add children</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-slate-200 bg-white font-black text-slate-700">
              <Link href="/ecd/attendance">Use manual attendance</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[2rem] border border-slate-200 bg-white shadow-xl">
        <div className="min-w-max p-8 print:p-0">
          {/* DSD Header */}
          <div className="mb-8 text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Official Attendance Register</p>
            <h2 className="text-2xl font-black text-slate-900">{centreName}</h2>
            <div className="flex justify-center gap-6 text-sm font-bold text-slate-500">
              <p>Month: <span className="text-slate-900">{MONTHS[selectedMonth - 1]}</span></p>
              <p>Year: <span className="text-slate-900">{selectedYear}</span></p>
              <p>Class: <span className="text-slate-900">{selectedClass?.name ?? 'All'}</span></p>
              <p>Practitioner: <span className="text-slate-900">{selectedClass?.practitioner_name ?? 'Not specified'}</span></p>
            </div>
            {registrationNumber && <p className="text-xs text-slate-400">Reg No: {registrationNumber}</p>}
          </div>

          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 p-2 text-left sticky left-0 bg-slate-50 z-10 w-48">Child Name</th>
                {[...Array(31)].map((_, i) => {
                  const day = i + 1
                  const isToday = isCurrentMonth && day === today
                  return (
                    <th 
                      key={day} 
                      className={cn(
                        "border border-slate-200 p-1 text-center w-8",
                        day > daysInMonth && "bg-slate-100",
                        isToday && "bg-cyan-50 text-cyan-700"
                      )}
                    >
                      {day}
                    </th>
                  )
                })}
                <th className="border border-slate-200 p-2 text-center bg-slate-100 font-black">Total</th>
              </tr>
            </thead>
            <tbody>
              {enrolledChildren.map(child => (
                <tr key={child.id} className="hover:bg-slate-50/50">
                  <td className="border border-slate-200 p-2 font-bold text-slate-900 sticky left-0 bg-white z-10">
                    {child.first_name} {child.last_name}
                    <p className="text-[9px] text-slate-400 font-normal">DOB: {child.date_of_birth}</p>
                  </td>
                  {[...Array(31)].map((_, i) => {
                    const day = i + 1
                    const isToday = isCurrentMonth && day === today
                    const status = localAttendance[child.id]?.[day]
                    const label = status ? STATUS_LABELS[status] : ''
                    const isSaving = saving === `${child.id}-${day}`
                    
                    if (day > daysInMonth) return <td key={day} className="border border-slate-200 bg-slate-100" />

                    return (
                      <td 
                        key={day} 
                        onClick={() => toggleStatus(child.id, day)}
                        className={cn(
                          "border border-slate-200 p-0 text-center cursor-pointer transition-colors select-none relative h-10",
                          isToday && "bg-cyan-50/30",
                          status === 'present' && "bg-emerald-50 text-emerald-700",
                          status === 'absent' && "bg-rose-50 text-rose-700",
                          status === 'sick' && "bg-amber-50 text-amber-700",
                          status === 'late' && "bg-primary/10 text-primary"
                        )}
                      >
                        {isSaving ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-slate-300 animate-ping" />
                          </div>
                        ) : (
                          <span className="font-black text-[12px]">{label}</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="border border-slate-200 p-2 text-center font-black bg-slate-50">
                    {totalsByChild[child.id]}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-black">
                <td className="border border-slate-200 p-2 sticky left-0 bg-slate-100 z-10">Daily Total Present</td>
                {[...Array(31)].map((_, i) => {
                  const day = i + 1
                  if (day > daysInMonth) return <td key={day} className="border border-slate-200" />
                  return (
                    <td key={day} className="border border-slate-200 p-1 text-center">
                      {totalsByDay[day] || ''}
                    </td>
                  )
                })}
                <td className="border border-slate-200 p-2 text-center">
                  {Object.values(totalsByDay).reduce((a, b) => a + b, 0)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* DSD Footer for Print */}
          <div className="mt-12 hidden print:block space-y-12">
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-2">
                <div className="border-b border-slate-900 h-8" />
                <p className="text-xs font-bold uppercase tracking-wider">Practitioner Signature</p>
                <p className="text-[10px] text-slate-400">Date: _________________</p>
              </div>
              <div className="space-y-2">
                <div className="border-b border-slate-900 h-8" />
                <p className="text-xs font-bold uppercase tracking-wider">Principal/Owner Signature</p>
                <p className="text-[10px] text-slate-400">Date: _________________</p>
              </div>
            </div>
            <p className="text-[10px] text-center text-slate-400 italic">
              Generated by CentreConnect on {new Date().toLocaleDateString('en-ZA')}
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; font-size: 10px !important; }
          .no-print { display: none !important; }
          .ecd-page-shell { padding: 0 !important; margin: 0 !important; }
          main { margin: 0 !important; padding: 0 !important; }
          aside { display: none !important; }
          nav { display: none !important; }
          .rounded-3xl, .rounded-[2rem] { border-radius: 0 !important; border: none !important; box-shadow: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; border: 1px solid black !important; }
          th, td { border: 1px solid black !important; padding: 4px !important; }
          @page { size: landscape; margin: 10mm; }
        }
      `}</style>
    </div>
  )
}
