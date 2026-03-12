import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, CheckCircle2, FileWarning, ClipboardCheck } from 'lucide-react'
import {
  ATTENDANCE_IMPORT_GUIDANCE,
  ATTENDANCE_IMPORT_LIMITATIONS,
  ATTENDANCE_IMPORT_METHODS,
} from '@/lib/attendance/imports'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { RegisterImportClient } from './register-import-client'

export const metadata: Metadata = {
  title: 'Attendance Import - CentreConnect',
  description: 'Backfill attendance carefully with photo review, CSV import, and a clear manual fallback.',
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
              Beta Attendance Import
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Attendance Import</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Backfill old attendance carefully. Use one clear page photo at a time for paper registers, or upload a
              CSV when the names are already typed. If anything looks wrong, finish the day in the attendance register
              instead.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Review every suggestion before saving
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Step 1</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Choose photo or CSV</p>
              <p className="mt-1 text-xs text-slate-600">Use one clear page photo, or one CSV file with typed attendance rows.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Step 2</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Preview and review</p>
              <p className="mt-1 text-xs text-slate-600">Check spelling, dates, statuses, and child links before saving.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Step 3</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Recover cleanly</p>
              <p className="mt-1 text-xs text-slate-600">If AI fails, switch to CSV or mark it manually in the register view.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Manual fallback</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">Keep the real work moving</p>
            <p className="mt-1 text-xs text-slate-600">
              Mama Bajabulile should never get stuck because a photo is messy. CSV and the attendance register are the
              reliable backup paths.
            </p>
            <Link
              href="/ecd/attendance"
              className="mt-3 inline-flex h-10 items-center rounded-3xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Open attendance register
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
              <ClipboardCheck className="h-4 w-4 text-teal-600" />
              Best Results
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {ATTENDANCE_IMPORT_GUIDANCE.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-amber-800">
              <FileWarning className="h-4 w-4" />
              Not Supported Yet
            </div>
            <ul className="mt-3 space-y-2 text-sm text-amber-900">
              {ATTENDANCE_IMPORT_LIMITATIONS.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {ATTENDANCE_IMPORT_METHODS.map((method) => (
            <div key={method.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">{method.label}</p>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                    method.availability === 'beta'
                      ? 'bg-teal-50 text-teal-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {method.availability}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">{method.description}</p>
            </div>
          ))}
        </div>
      </header>

      <RegisterImportClient
        initialImports={imports}
        childOptions={childOptions}
      />
    </div>
  )
}
