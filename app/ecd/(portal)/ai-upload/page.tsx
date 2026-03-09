import type { Metadata } from 'next'
import { Sparkles, Upload, CheckCircle2 } from 'lucide-react'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { RegisterImportClient } from './register-import-client'

export const metadata: Metadata = {
  title: 'AI Register Import - CentreConnect',
  description: 'Digitize paper attendance registers with AI extraction and quick attendance import.',
}

type RegisterImportRow = {
  id: string
  source_file_url: string
  source_file_name: string | null
  extracted_names: string[] | null
  extracted_date: string | null
  status: 'extracted' | 'reviewed' | 'imported' | 'failed'
  selected_name: string | null
  imported_child_id: string | null
  imported_attendance_id: string | null
  notes: string | null
  created_at: string
}

type ChildRow = {
  id: string
  first_name: string | null
  last_name: string | null
}

function normalizeImportRow(row: RegisterImportRow) {
  return {
    id: row.id,
    source_file_url: row.source_file_url,
    source_file_name: row.source_file_name,
    extracted_names: row.extracted_names ?? [],
    extracted_date: row.extracted_date,
    status: row.status,
    selected_name: row.selected_name,
    imported_child_id: row.imported_child_id,
    imported_attendance_id: row.imported_attendance_id,
    notes: row.notes,
    created_at: row.created_at,
  }
}

function displayChildName(child: ChildRow) {
  const value = `${child.first_name ?? ''} ${child.last_name ?? ''}`.trim()
  return value || 'Unnamed child'
}

export default async function AiUploadPage() {
  const { supabase, ecdId } = await requireEcdPortalSession()

  const [{ data: importsData }, { data: childrenData }] = await Promise.all([
    supabase
      .from('attendance_register_imports')
      .select(
        'id,source_file_url,source_file_name,extracted_names,extracted_date,status,selected_name,imported_child_id,imported_attendance_id,notes,created_at'
      )
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('children')
      .select('id,first_name,last_name')
      .eq('ecd_id', ecdId)
      .order('first_name', { ascending: true })
      .limit(400),
  ])

  const imports = ((importsData ?? []) as RegisterImportRow[]).map((row) => normalizeImportRow(row))
  const childOptions = ((childrenData ?? []) as ChildRow[]).map((child) => ({
    id: child.id,
    name: displayChildName(child),
  }))

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-teal-100 bg-white p-6 shadow-[var(--shadow-elevation-1)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">
              <Sparkles className="h-3 w-3" />
              Pilot Digitization
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">AI Register Import</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Move old paper attendance registers into CentreConnect quickly. Upload photos, review AI suggestions,
              then import into attendance.
            </p>
          </div>
          <div className="rounded-2xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700">
            Works with AI extraction
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Step 1</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">Upload register photos</p>
            <p className="mt-1 text-xs text-slate-600">Capture from phone or scan from paper books.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Step 2</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">Review extracted names</p>
            <p className="mt-1 text-xs text-slate-600">Map each result to an existing child or create draft.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Step 3</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">Import attendance</p>
            <p className="mt-1 text-xs text-slate-600">One-click save to attendance history.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5">
            <Upload className="h-3 w-3 text-teal-600" /> Photo upload
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5">
            <Sparkles className="h-3 w-3 text-teal-600" /> AI extraction
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5">
            <CheckCircle2 className="h-3 w-3 text-teal-600" /> Attendance import
          </span>
        </div>
      </header>

      <RegisterImportClient
        initialImports={imports}
        childOptions={childOptions}
      />
    </div>
  )
}
