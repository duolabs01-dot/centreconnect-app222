'use client'

import { useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Briefcase, Computer, GraduationCap, Heart, Trash2, UserPlus } from 'lucide-react'

type OfficialStaffRecord = {
  id: string
  firstName: string
  surname: string
  role: string
  isTrained: boolean
  isComputerLiterate: boolean
  isSubsidized: boolean
  trainingDescription: string | null
  monthlySalary: number | null
}

function SubmitButton({ children, variant = 'outline', className = '' }: { children: React.ReactNode; variant?: string; className?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className={`h-10 rounded-2xl font-bold shadow-sm ${className}`} variant={variant as any}>
      {pending ? 'Saving...' : children}
    </Button>
  )
}

type OfficialStaffRecordsCardProps = {
  records: OfficialStaffRecord[]
  canManage: boolean
  saveAction: (formData: FormData) => void
  deleteAction: (formData: FormData) => void
  syncAction: (formData: FormData) => void
}

export function OfficialStaffRecordsCard({
  records,
  canManage,
  saveAction,
  deleteAction,
  syncAction,
}: OfficialStaffRecordsCardProps) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <Card className="border-slate-100 bg-white shadow-sm rounded-3xl overflow-hidden xl:col-span-2">
      <CardHeader className="bg-slate-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">Official Staff Records (DOE/DSD Format)</CardTitle>
          {canManage && (
            <form action={syncAction}>
              <SubmitButton className="border-teal-200 text-teal-700 hover:bg-teal-50">
                <UserPlus className="mr-2 h-4 w-4" />
                Sync from Portal Staff
              </SubmitButton>
            </form>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          These records appear in your official DSD/DOE monthly submissions. Add your practitioners and staff here for compliance reporting.
        </p>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Records table */}
        {records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
            <p className="text-sm text-slate-500 italic">No official staff records yet.</p>
            <p className="mt-1 text-xs text-slate-400">Add your practitioners and staff below for DOE/DSD submissions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 font-black uppercase tracking-wider text-slate-500">Name</th>
                  <th className="text-left py-2 pr-4 font-black uppercase tracking-wider text-slate-500">Role</th>
                  <th className="text-center py-2 pr-3 font-black uppercase tracking-wider text-slate-500">Trained</th>
                  <th className="text-center py-2 pr-3 font-black uppercase tracking-wider text-slate-500">Computer</th>
                  <th className="text-center py-2 pr-3 font-black uppercase tracking-wider text-slate-500">Subsidised</th>
                  <th className="text-left py-2 pr-4 font-black uppercase tracking-wider text-slate-500">Training</th>
                  <th className="text-right py-2 pl-4 font-black uppercase tracking-wider text-slate-500">Salary</th>
                  {canManage && <th className="py-2 pl-4" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50">
                    <td className="py-3 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                      {record.firstName} {record.surname}
                    </td>
                    <td className="py-3 pr-4 text-slate-700 whitespace-nowrap">{record.role}</td>
                    <td className="py-3 pr-3 text-center">
                      {record.isTrained ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 font-semibold">
                          <GraduationCap className="h-3 w-3" /> Yes
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-center">
                      {record.isComputerLiterate ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 font-semibold">
                          <Computer className="h-3 w-3" /> Yes
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-center">
                      {record.isSubsidized ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 font-semibold">
                          <Heart className="h-3 w-3" /> Yes
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-600 max-w-[160px] truncate">
                      {record.trainingDescription || '—'}
                    </td>
                    <td className="py-3 pl-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {record.monthlySalary != null ? `R ${record.monthlySalary.toLocaleString()}` : '—'}
                    </td>
                    {canManage && (
                      <td className="py-3 pl-4">
                        <form action={deleteAction}>
                          <input type="hidden" name="staff_id" value={record.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add new record form */}
        {canManage && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Add new staff record</p>
            <form
              ref={formRef}
              action={(fd) => {
                saveAction(fd)
                formRef.current?.reset()
              }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">First name *</label>
                <input
                  name="first_name"
                  required
                  placeholder="e.g. Amahle"
                  className="cc-native-field h-10 rounded-2xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Surname *</label>
                <input
                  name="surname"
                  required
                  placeholder="e.g. Ndlovu"
                  className="cc-native-field h-10 rounded-2xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Role / Title</label>
                <input
                  name="role"
                  placeholder="e.g. ECD Practitioner"
                  className="cc-native-field h-10 rounded-2xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Training description</label>
                <input
                  name="training_description"
                  placeholder="e.g. Level 4 ECD Qualification"
                  className="cc-native-field h-10 rounded-2xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Monthly salary (R)</label>
                <input
                  name="monthly_salary"
                  type="number"
                  min="0"
                  placeholder="e.g. 4500"
                  className="cc-native-field h-10 rounded-2xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Flags</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <input type="checkbox" name="is_trained" value="true" className="rounded border-slate-300 text-teal-600" />
                    Trained
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <input type="checkbox" name="is_computer_literate" value="true" className="rounded border-slate-300 text-teal-600" />
                    Computer
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <input type="checkbox" name="is_subsidized" value="true" className="rounded border-slate-300 text-teal-600" />
                    Subsidised
                  </label>
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <SubmitButton className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Add Staff Record
                </SubmitButton>
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
