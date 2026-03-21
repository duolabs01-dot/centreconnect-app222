import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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

type OfficialStaffRecordsCardProps = {
  records: OfficialStaffRecord[]
  canManage: boolean
  saveAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
  syncAction: () => Promise<void>
}

export function OfficialStaffRecordsCard({
  records,
  canManage,
  saveAction,
  deleteAction,
  syncAction,
}: OfficialStaffRecordsCardProps) {
  return (
    <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white xl:col-span-2">
      <CardHeader className="bg-slate-50/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base font-bold">Official Employee Records</CardTitle>
            <CardDescription className="mt-1 text-sm text-slate-500">
              These names and roles feed the monthly report template for every centre and month.
            </CardDescription>
          </div>
          {canManage ? (
            <form action={syncAction}>
              <Button type="submit" variant="outline" className="h-10 rounded-2xl border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Sync portal team into report records
              </Button>
            </form>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {canManage ? (
          <form action={saveAction} className="space-y-4 rounded-2xl border border-teal-100 bg-teal-50/60 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input name="first_name" className="cc-native-field h-11 rounded-2xl" placeholder="First name" required />
              <input name="surname" className="cc-native-field h-11 rounded-2xl" placeholder="Surname" required />
              <select name="role" className="cc-native-field h-11 rounded-2xl" defaultValue="Practitioner">
                <option value="Practitioner">Practitioner</option>
                <option value="Assistant practitioner">Assistant practitioner</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Centre manager">Centre manager</option>
                <option value="Cook">Cook</option>
                <option value="Driver">Driver</option>
                <option value="Cleaner">Cleaner</option>
                <option value="Administrator">Administrator</option>
              </select>
              <input name="monthly_salary" type="number" min="0" step="0.01" className="cc-native-field h-11 rounded-2xl" placeholder="Monthly salary (optional)" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="training_description" className="cc-native-field h-11 rounded-2xl" placeholder="Training summary (optional)" />
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/80 bg-white px-4 py-3 text-xs font-semibold text-slate-600">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" name="is_trained" className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                  Trained
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" name="is_computer_literate" className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                  Excel literate
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" name="is_subsidized" className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                  Subsidised
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-teal-800">Add a staff member here if they must appear in the monthly report even without portal login access.</p>
              <Button type="submit" className="h-11 rounded-2xl bg-teal-600 px-5 font-bold text-white hover:bg-teal-700">
                Add employee
              </Button>
            </div>
          </form>
        ) : null}

        <div className="space-y-3">
          {records.length === 0 ? (
            <p className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-5 text-sm italic text-slate-500">
              No official employee records yet. Sync the portal team or add staff manually.
            </p>
          ) : (
            records.map((record) => (
              <form key={record.id} action={saveAction} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <input type="hidden" name="staff_id" value={record.id} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <input name="first_name" className="cc-native-field h-11 rounded-2xl" defaultValue={record.firstName} placeholder="First name" required disabled={!canManage} />
                  <input name="surname" className="cc-native-field h-11 rounded-2xl" defaultValue={record.surname} placeholder="Surname" required disabled={!canManage} />
                  <select name="role" className="cc-native-field h-11 rounded-2xl" defaultValue={record.role} disabled={!canManage}>
                    <option value="Practitioner">Practitioner</option>
                    <option value="Assistant practitioner">Assistant practitioner</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Centre manager">Centre manager</option>
                    <option value="Cook">Cook</option>
                    <option value="Driver">Driver</option>
                    <option value="Cleaner">Cleaner</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                  <input name="monthly_salary" type="number" min="0" step="0.01" className="cc-native-field h-11 rounded-2xl" defaultValue={record.monthlySalary ?? ''} placeholder="Monthly salary" disabled={!canManage} />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input name="training_description" className="cc-native-field h-11 rounded-2xl" defaultValue={record.trainingDescription ?? ''} placeholder="Training summary" disabled={!canManage} />
                  <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" name="is_trained" defaultChecked={record.isTrained} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" disabled={!canManage} />
                      Trained
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" name="is_computer_literate" defaultChecked={record.isComputerLiterate} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" disabled={!canManage} />
                      Excel literate
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" name="is_subsidized" defaultChecked={record.isSubsidized} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" disabled={!canManage} />
                      Subsidised
                    </label>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">This employee record appears in the official monthly report and stays aligned with the settings team view.</p>
                  <div className="flex flex-wrap gap-2">
                    {canManage ? (
                      <Button type="submit" variant="outline" className="h-10 rounded-2xl border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        Save employee
                      </Button>
                    ) : null}
                    {canManage ? (
                      <Button type="submit" formAction={deleteAction} variant="outline" className="h-10 rounded-2xl border-rose-100 px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </form>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
