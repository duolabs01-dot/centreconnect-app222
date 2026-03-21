'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  ATTENDANCE_CSV_GUIDANCE,
  ATTENDANCE_CSV_LIMITATIONS,
  ATTENDANCE_CSV_MAX_FILE_MB,
  ATTENDANCE_CSV_SUPPORTED_EXTENSIONS,
  ATTENDANCE_CSV_TEMPLATE_HEADERS,
  buildAttendanceCsvFallbackHref,
  buildCsvStatusLabel,
  validateAttendanceCsvFile,
} from '@/lib/attendance/csv'
import { buildAttendanceBoardHref } from '@/lib/attendance/imports'
import type { AttendanceCsvPreviewRow } from './actions'
import { importAttendanceCsvAction, previewAttendanceCsvAction } from './actions'

type CsvIssueState = {
  message: string
  guidance: string[]
  fallbackHref: string
}

type CsvPreviewState = {
  fileName: string
  headers: string[]
  rows: AttendanceCsvPreviewRow[]
  warnings: string[]
  readyCount: number
  blockedCount: number
  fallbackHref: string
}

type CsvImportSummary = {
  importedCount: number
  blockedCount: number
  warnings: string[]
  attendanceHref: string
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function rowIsReady(row: AttendanceCsvPreviewRow) {
  return Boolean(row.matchedChildId) && Boolean(row.attendanceDate) && row.issues.length === 0
}

export function AttendanceCsvImportSection() {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [attendanceDate, setAttendanceDate] = useState(todayIso())
  const [notes, setNotes] = useState('')
  const [preview, setPreview] = useState<CsvPreviewState | null>(null)
  const [issue, setIssue] = useState<CsvIssueState | null>(null)
  const [importSummary, setImportSummary] = useState<CsvImportSummary | null>(null)
  const [hasImportedPreview, setHasImportedPreview] = useState(false)
  const [isPreviewing, startPreviewTransition] = useTransition()
  const [isImporting, startImportTransition] = useTransition()

  function onFileChange(nextFile: File | null) {
    setPreview(null)
    setImportSummary(null)
    setHasImportedPreview(false)

    if (!nextFile) {
      setCsvFile(null)
      return
    }

    const validation = validateAttendanceCsvFile(nextFile)
    if (!validation.ok) {
      setCsvFile(null)
      const fallbackHref = buildAttendanceBoardHref(attendanceDate)
      setIssue({
        message: validation.message,
        guidance: [validation.guidance, ...ATTENDANCE_CSV_LIMITATIONS],
        fallbackHref,
      })
      toast.error(validation.message)
      return
    }

    setCsvFile(nextFile)
    setIssue(null)
  }

  function runPreview() {
    if (!csvFile) {
      toast.error('Choose one CSV file before previewing it.')
      return
    }

    startPreviewTransition(async () => {
      const formData = new FormData()
      formData.set('file', csvFile)
      formData.set('attendance_date', attendanceDate)
      formData.set('notes', notes)

      const result = await previewAttendanceCsvAction(formData)
      if (!result.success || !result.rows) {
        setPreview(null)
        setImportSummary(null)
        setHasImportedPreview(false)
        setIssue({
          message: result.message,
          guidance: result.guidance ?? [...ATTENDANCE_CSV_GUIDANCE, ...ATTENDANCE_CSV_LIMITATIONS],
          fallbackHref: result.fallbackHref ?? buildAttendanceBoardHref(attendanceDate),
        })
        toast.error(result.message)
        return
      }

      setIssue(null)
      setImportSummary(null)
      setHasImportedPreview(false)
      setPreview({
        fileName: result.fileName ?? csvFile.name,
        headers: result.headers ?? [],
        rows: result.rows,
        warnings: result.warnings ?? [],
        readyCount: result.readyCount ?? 0,
        blockedCount: result.blockedCount ?? 0,
        fallbackHref: result.fallbackHref ?? buildAttendanceCsvFallbackHref(result.rows),
      })
      toast.success(result.message)
    })
  }

  function runImport() {
    if (!preview) {
      toast.error('Preview the CSV before importing it.')
      return
    }

    startImportTransition(async () => {
      const formData = new FormData()
      formData.set('source_file_name', preview.fileName)
      formData.set('rows', JSON.stringify(preview.rows))

      const result = await importAttendanceCsvAction(formData)
      if (!result.success) {
        setIssue({
          message: result.message,
          guidance: result.warnings ?? [...ATTENDANCE_CSV_LIMITATIONS],
          fallbackHref: result.attendanceHref ?? preview.fallbackHref,
        })
        toast.error(result.message)
        return
      }

      setIssue(null)
      setHasImportedPreview(true)
      setImportSummary({
        importedCount: result.importedCount ?? 0,
        blockedCount: result.blockedCount ?? 0,
        warnings: result.warnings ?? [],
        attendanceHref: result.attendanceHref ?? preview.fallbackHref,
      })
      toast.success(result.message)
    })
  }

  return (
    <section id="csv-import" className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-[var(--shadow-elevation-1)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-700">
            <Upload className="h-4 w-4" />
            CSV Attendance Import
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Upload a typed attendance sheet</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Use CSV when the names are already typed. This is the clean recovery path when a register photo is blurry,
            or when you already have a spreadsheet from admin work.
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-900">
          Preview first, then import only the ready rows
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">CSV file</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="cc-native-field"
                onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-slate-500">
                Supported now: {ATTENDANCE_CSV_SUPPORTED_EXTENSIONS.join(', ')} up to {ATTENDANCE_CSV_MAX_FILE_MB}MB.
              </p>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fallback date</span>
              <input
                type="date"
                value={attendanceDate}
                onChange={(event) => setAttendanceDate(event.target.value)}
                className="cc-native-field"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Import notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="cc-native-field h-auto min-h-20 py-2"
              placeholder="Optional note, e.g. March attendance export from admin spreadsheet."
            />
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Recommended headers</p>
            <code className="mt-2 block rounded-2xl bg-slate-900 px-3 py-3 text-xs font-semibold text-white">
              {ATTENDANCE_CSV_TEMPLATE_HEADERS.join(',')}
            </code>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {ATTENDANCE_CSV_GUIDANCE.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={runPreview}
              disabled={isPreviewing || !csvFile}
              className="h-11 rounded-3xl bg-cyan-700 px-5 text-white hover:bg-cyan-800"
            >
              {isPreviewing ? 'Previewing CSV...' : 'Preview CSV rows'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-3xl border-slate-200 bg-white text-slate-700"
              asChild
            >
              <Link href={preview?.fallbackHref ?? buildAttendanceBoardHref(attendanceDate)}>Open attendance register</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">What still needs human review</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {ATTENDANCE_CSV_LIMITATIONS.map((item) => (
              <li key={item} className="flex gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">When the CSV is not clean enough</p>
            <p className="mt-1 text-sm text-amber-900">
              Fix the spreadsheet and preview it again, or open the attendance register and finish the urgent rows
              manually.
            </p>
          </div>

          {csvFile ? (
            <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="text-sm font-semibold text-cyan-900">Selected file</p>
              <p className="mt-1 text-sm text-cyan-900">{csvFile.name}</p>
            </div>
          ) : null}
        </div>
      </div>

      {issue ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">{issue.message}</p>
          <ul className="mt-3 space-y-2 text-xs text-amber-900">
            {issue.guidance.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-700" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="h-10 rounded-3xl border-amber-300 bg-white text-amber-900" asChild>
              <Link href={issue.fallbackHref}>Open attendance register</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{preview.fileName}</p>
                <p className="mt-1 text-xs text-slate-500">Headers: {preview.headers.join(', ') || 'No headers detected'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700">
                  {preview.readyCount} ready
                </div>
                <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-800">
                  {preview.blockedCount} blocked
                </div>
              </div>
            </div>

            {preview.warnings.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {preview.warnings.map((warning) => (
                  <li key={warning} className="flex gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={runImport}
                disabled={isImporting || preview.readyCount === 0 || hasImportedPreview}
                className="h-11 rounded-3xl bg-cyan-700 px-5 text-white hover:bg-cyan-800"
              >
                {isImporting ? 'Importing ready rows...' : hasImportedPreview ? 'Imported' : `Import ${preview.readyCount} ready row${preview.readyCount === 1 ? '' : 's'}`}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-3xl border-slate-200 bg-white text-slate-700"
                asChild
              >
                <Link href={preview.fallbackHref}>Open attendance register</Link>
              </Button>
            </div>
          </div>

          {importSummary ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-900">
                Imported {importSummary.importedCount} row{importSummary.importedCount === 1 ? '' : 's'}.
              </p>
              <p className="mt-1 text-sm text-emerald-900">
                {importSummary.blockedCount > 0
                  ? `${importSummary.blockedCount} row${importSummary.blockedCount === 1 ? '' : 's'} were still blocked and were not imported.`
                  : 'All previewed rows that were ready have been written into the attendance register.'}
              </p>
              {importSummary.warnings.length > 0 ? (
                <ul className="mt-3 space-y-2 text-xs text-emerald-900">
                  {importSummary.warnings.map((warning) => (
                    <li key={warning} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-700" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-600">Line</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-600">CSV child</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-600">Matched child</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-600">Date</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-600">Status</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-600">Class</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-600">Review</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row: any) => {
                  const ready = rowIsReady(row)

                  return (
                    <tr key={`${row.lineNumber}-${row.childName}`} className={ready ? 'bg-white' : 'bg-amber-50/40'}>
                      <td className="border-b border-slate-200 px-3 py-3 text-slate-600">{row.lineNumber}</td>
                      <td className="border-b border-slate-200 px-3 py-3 font-semibold text-slate-900">{row.childName}</td>
                      <td className="border-b border-slate-200 px-3 py-3 text-slate-700">
                        {row.matchedChildName ?? <span className="text-amber-900">Needs exact match</span>}
                      </td>
                      <td className="border-b border-slate-200 px-3 py-3 text-slate-700">{row.attendanceDate || 'Missing date'}</td>
                      <td className="border-b border-slate-200 px-3 py-3 text-slate-700">{buildCsvStatusLabel(row.status)}</td>
                      <td className="border-b border-slate-200 px-3 py-3 text-slate-700">{row.className ?? 'No class in CSV'}</td>
                      <td className="border-b border-slate-200 px-3 py-3">
                        {ready ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700">
                            Ready
                          </span>
                        ) : (
                          <ul className="space-y-1 text-xs text-amber-900">
                            {row.issues.map((item) => (
                              <li key={item} className="flex gap-2">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-700" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  )
}
