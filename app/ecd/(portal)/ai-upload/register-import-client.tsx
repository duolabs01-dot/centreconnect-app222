'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  ATTENDANCE_IMPORT_FALLBACK_STEPS,
  ATTENDANCE_IMPORT_MAX_FILE_MB,
  ATTENDANCE_IMPORT_SUPPORTED_EXTENSIONS,
  buildAttendanceBoardHref,
  buildAttendanceBoardLabel,
  validateAttendanceImportFile,
} from '@/lib/attendance/imports'
import { AttendanceCsvImportSection } from './attendance-csv-import-section'
import { extractRegisterPhotoAction, importRegisterEntryAction } from './actions'

type RegisterImportItem = {
  id: string
  source_file_url: string
  source_file_name: string | null
  extracted_names: string[]
  extracted_date: string | null
  status: 'extracted' | 'reviewed' | 'imported' | 'failed'
  selected_name: string | null
  imported_child_id: string | null
  imported_attendance_id: string | null
  notes: string | null
  created_at: string
}

type ChildOption = {
  id: string
  name: string
}

type ImportFormState = {
  selectedName: string
  selectedChildId: string
  attendanceDate: string
  notes: string
  createChildIfMissing: boolean
  duplicates: any[]
  bypassDuplicates: boolean
}

type InlineIssueState = {
  message: string
  guidance: string[]
  fallbackHref: string
}

const todayIso = () => new Date().toISOString().slice(0, 10)

function normalizeNameForMatch(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function dedupeGuidance(values: Array<string | null | undefined>) {
  const output: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const cleaned = value?.trim()
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(cleaned)
  }

  return output
}

function statusMeta(status: RegisterImportItem['status']) {
  if (status === 'failed') {
    return {
      label: 'Needs recovery',
      pillClassName: 'border-amber-200 bg-amber-50 text-amber-800',
      cardClassName: 'border-amber-200',
    }
  }

  if (status === 'imported') {
    return {
      label: 'Saved to register',
      pillClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      cardClassName: 'border-emerald-200',
    }
  }

  return {
    label: 'Review before saving',
    pillClassName: 'border-teal-200 bg-teal-50 text-teal-700',
    cardClassName: 'border-slate-200',
  }
}

export function RegisterImportClient({
  initialImports,
  childOptions,
}: {
  initialImports: RegisterImportItem[]
  childOptions: ChildOption[]
}) {
  const [imports, setImports] = useState<RegisterImportItem[]>(initialImports)
  const [files, setFiles] = useState<File[]>([])
  const [bulkDate, setBulkDate] = useState(todayIso())
  const [bulkNotes, setBulkNotes] = useState('')
  const [formState, setFormState] = useState<Record<string, ImportFormState>>({})
  const [lastIssue, setLastIssue] = useState<InlineIssueState | null>(null)
  const [isExtracting, startExtractTransition] = useTransition()
  const [isImporting, startImportTransition] = useTransition()

  const sortedImports = useMemo(
    () =>
      [...imports].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }),
    [imports]
  )

  const childNameIndex = useMemo(() => {
    const index = new Map<string, string[]>()
    for (const option of childOptions) {
      const key = normalizeNameForMatch(option.name)
      if (!key) continue
      index.set(key, [...(index.get(key) ?? []), option.id])
    }
    return index
  }, [childOptions])

  function findSuggestedChildId(name: string) {
    const matches = childNameIndex.get(normalizeNameForMatch(name)) ?? []
    return matches.length === 1 ? matches[0] : ''
  }

  function getState(item: RegisterImportItem): ImportFormState {
    const existing = formState[item.id]
    if (existing) return existing

    const initialName = item.selected_name ?? item.extracted_names[0] ?? ''
    return {
      selectedName: initialName,
      selectedChildId: item.imported_child_id ?? findSuggestedChildId(initialName),
      attendanceDate: item.extracted_date ?? bulkDate,
      notes: item.notes ?? '',
      createChildIfMissing: false,
      duplicates: [],
      bypassDuplicates: false,
    }
  }

  function setState(id: string, patch: Partial<ImportFormState>) {
    setFormState((current) => ({
      ...current,
      [id]: {
        ...getState(
          imports.find((item) => item.id === id) ?? {
            id,
            source_file_url: '',
            source_file_name: null,
            extracted_names: [],
            extracted_date: null,
            status: 'extracted',
            selected_name: null,
            imported_child_id: null,
            imported_attendance_id: null,
            notes: null,
            created_at: new Date().toISOString(),
          }
        ),
        ...patch,
      },
    }))
  }

  function mergeImportItems(nextItems: RegisterImportItem[]) {
    setImports((current) => {
      const merged = new Map(current.map((entry) => [entry.id, entry]))
      for (const entry of nextItems) {
        merged.set(entry.id, entry)
      }
      return Array.from(merged.values())
    })
  }

  function handleFileSelection(nextFiles: File[]) {
    const validFiles: File[] = []
    const rejected: Array<{ name: string; message: string; guidance: string }> = []

    for (const file of nextFiles) {
      const validation = validateAttendanceImportFile(file)
      if (validation.ok) {
        validFiles.push(file)
        continue
      }

      rejected.push({
        name: file.name,
        message: validation.message,
        guidance: validation.guidance,
      })
    }

    setFiles(validFiles)

    if (rejected.length > 0) {
      const firstRejected = rejected[0]
      const message = `${firstRejected.name}: ${firstRejected.message}`
      setLastIssue({
        message,
        guidance: dedupeGuidance([firstRejected.guidance, ...ATTENDANCE_IMPORT_FALLBACK_STEPS]),
        fallbackHref: buildAttendanceBoardHref(bulkDate),
      })
      toast.error(message)
      return
    }

    setLastIssue(null)
  }

  function runBulkExtract() {
    if (files.length === 0) {
      toast.error('Choose at least one clear register page photo.')
      return
    }

    startExtractTransition(async () => {
      let readyEntries = 0
      let pagesRead = 0
      let latestIssue: InlineIssueState | null = null

      for (const file of files) {
        try {
          const formData = new FormData()
          formData.set('file', file)
          formData.set('attendance_date', bulkDate)
          formData.set('notes', bulkNotes)

          const result = await extractRegisterPhotoAction(formData)
          const resultItems = result.items ?? (result.item ? [result.item] : [])

          if (resultItems.length > 0) {
            mergeImportItems(resultItems)
          }

          if (!result.success) {
            const message = `${file.name}: ${result.message}`
            latestIssue = {
              message,
              guidance: dedupeGuidance([...(result.guidance ?? []), ...ATTENDANCE_IMPORT_FALLBACK_STEPS]),
              fallbackHref: result.fallbackHref ?? buildAttendanceBoardHref(bulkDate),
            }
            toast.error(message)
            continue
          }

          pagesRead += 1
          readyEntries += resultItems.length
        } catch {
          const message = `${file.name}: Extraction failed unexpectedly. Use CSV import or mark attendance manually for now.`
          latestIssue = {
            message,
            guidance: [...ATTENDANCE_IMPORT_FALLBACK_STEPS],
            fallbackHref: buildAttendanceBoardHref(bulkDate),
          }
          toast.error(message)
        }
      }

      setFiles([])
      setLastIssue(latestIssue)

      if (pagesRead > 0) {
        toast.success(
          `Read ${pagesRead} page${pagesRead === 1 ? '' : 's'}. ${readyEntries} entr${readyEntries === 1 ? 'y' : 'ies'} now need review.`
        )
      }
    })
  }

  function runImport(item: RegisterImportItem) {
    const state = getState(item)
    const selectedName = state.selectedName.trim()
    const attendanceHref = buildAttendanceBoardHref(state.attendanceDate || item.extracted_date)

    if (!state.selectedChildId && !state.createChildIfMissing) {
      toast.error('Link this row to a child, or create a child profile first.')
      return
    }

    if (state.createChildIfMissing && !selectedName) {
      toast.error('Type the child name before creating a new child profile.')
      return
    }

    startImportTransition(async () => {
      const formData = new FormData()
      formData.set('import_id', item.id)
      formData.set('child_id', state.selectedChildId)
      formData.set('selected_name', selectedName)
      formData.set('attendance_date', state.attendanceDate)
      formData.set('notes', state.notes)
      if (state.createChildIfMissing) {
        formData.set('create_child_if_missing', 'on')
      }
      if (state.bypassDuplicates) {
        formData.set('check_duplicates', 'off')
      }

      const result = await importRegisterEntryAction(formData)
      if (!result.success || !result.item) {
        if (result.duplicates && result.duplicates.length > 0) {
          setState(item.id, { duplicates: result.duplicates })
          toast.warning(result.message)
          return
        }

        setLastIssue({
          message: result.message,
          guidance: [...ATTENDANCE_IMPORT_FALLBACK_STEPS],
          fallbackHref: result.attendanceHref ?? attendanceHref,
        })
        toast.error(result.message)
        return
      }

      mergeImportItems([result.item as RegisterImportItem])
      setLastIssue(null)
      toast.success(result.message)
    })
  }

  return (
    <section className="space-y-6 pb-[calc(8rem+env(safe-area-inset-bottom))]">
      <div className="rounded-3xl border border-teal-100 bg-white p-5 shadow-[var(--shadow-elevation-1)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">Register Photo Import</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Upload clear register page photos</h2>
        <p className="mt-1 text-sm text-slate-600">
          Use this only for page-by-page backfill. Each result still needs human review before it becomes attendance. If
          the photo is messy, switch to CSV below or finish the urgent rows in the register.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px]">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Register page photos</span>
            <input
              type="file"
              multiple
              accept="image/*"
              className="cc-native-field"
              onChange={(event) => {
                handleFileSelection(Array.from(event.target.files ?? []))
              }}
            />
            <p className="text-xs text-slate-500">
              Supported now: {ATTENDANCE_IMPORT_SUPPORTED_EXTENSIONS.join(', ')} up to {ATTENDANCE_IMPORT_MAX_FILE_MB}MB.
            </p>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Attendance date</span>
            <input
              type="date"
              value={bulkDate}
              onChange={(event) => setBulkDate(event.target.value)}
              className="cc-native-field"
            />
          </label>
        </div>

        <label className="mt-3 block space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Session notes</span>
          <textarea
            value={bulkNotes}
            onChange={(event) => setBulkNotes(event.target.value)}
            className="cc-native-field h-auto min-h-20 py-2"
            placeholder="Optional note, e.g. February register book, week 1."
          />
        </label>

        {files.length > 0 ? (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">
              {files.length} page{files.length === 1 ? '' : 's'} ready.
            </p>
            <p className="mt-1 text-xs text-slate-500">{files.map((file) => file.name).join(', ')}</p>
          </div>
        ) : null}

        {lastIssue ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">When the photo is not reliable, recover with CSV or the manual register.</p>
            <p className="mt-1 text-sm text-amber-900">{lastIssue.message}</p>
            <ul className="mt-3 space-y-2 text-xs text-amber-900">
              {lastIssue.guidance.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-700" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" className="h-10 rounded-3xl border-amber-300 bg-white text-amber-900" asChild>
                <Link href={lastIssue.fallbackHref}>Open attendance register</Link>
              </Button>
              <a
                href="#csv-import"
                className="inline-flex h-10 items-center rounded-3xl border border-amber-300 bg-white px-4 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                Use CSV import instead
              </a>
              <a
                href="#register-import-list"
                className="inline-flex h-10 items-center rounded-3xl px-3 text-xs font-semibold text-amber-900 underline-offset-4 hover:underline"
              >
                Review saved import cards
              </a>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={runBulkExtract}
            disabled={isExtracting || files.length === 0}
            className="h-11 rounded-3xl bg-teal-600 px-5 text-white hover:bg-teal-700"
          >
            {isExtracting ? 'Reading page photos...' : 'Read page photos'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-3xl border-slate-200 bg-white text-slate-700"
            asChild
          >
            <Link href={buildAttendanceBoardHref(bulkDate)}>Open attendance register</Link>
          </Button>
        </div>
      </div>

      <AttendanceCsvImportSection />

      <div id="register-import-list" className="space-y-3">
        {sortedImports.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">No register imports yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              Start with one clear page photo, upload a CSV above, or skip import and mark attendance directly in the register.
            </p>
          </div>
        ) : null}

        {sortedImports.map((item) => {
          const state = getState(item)
          const isImported = item.status === 'imported'
          const isFailed = item.status === 'failed'
          const meta = statusMeta(item.status)
          const attendanceHref = buildAttendanceBoardHref(state.attendanceDate || item.extracted_date)

          return (
            <article
              key={item.id}
              className={`rounded-3xl border bg-white p-4 shadow-[var(--shadow-elevation-1)] ${meta.cardClassName}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.source_file_name ?? 'Register photo'}</p>
                  <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString('en-ZA')}</p>
                </div>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${meta.pillClassName}`}>
                  {meta.label}
                </span>
              </div>

              {isFailed ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-semibold">This page was not reliable enough to import automatically.</p>
                  <p className="mt-1">{item.notes ?? 'Open the attendance register and continue manually.'}</p>
                  <ul className="mt-3 space-y-2 text-xs">
                    {ATTENDANCE_IMPORT_FALLBACK_STEPS.map((step) => (
                      <li key={step} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-700" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" className="h-10 rounded-3xl border-amber-300 bg-white text-amber-900" asChild>
                      <Link href={attendanceHref}>{buildAttendanceBoardLabel(state.attendanceDate || item.extracted_date)}</Link>
                    </Button>
                    <a
                      href="#csv-import"
                      className="inline-flex h-10 items-center rounded-3xl border border-amber-300 bg-white px-4 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      Try CSV import
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Child name from page</span>
                      <input
                        type="text"
                        value={state.selectedName}
                        onChange={(event) => setState(item.id, { selectedName: event.target.value })}
                        className="cc-native-field"
                        placeholder="Type or correct the child name"
                        disabled={isImported}
                      />
                      <p className="text-xs text-slate-500">Check spelling carefully before you save this attendance row.</p>
                    </label>

                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Attendance date</span>
                      <input
                        type="date"
                        value={state.attendanceDate}
                        onChange={(event) => setState(item.id, { attendanceDate: event.target.value })}
                        className="cc-native-field"
                        disabled={isImported}
                      />
                    </label>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Link to existing child</span>
                      <select
                        value={state.selectedChildId}
                        onChange={(event) => setState(item.id, { selectedChildId: event.target.value })}
                        className="cc-native-field"
                        disabled={isImported}
                      >
                        <option value="">Select child profile...</option>
                        {childOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notes</span>
                      <input
                        type="text"
                        value={state.notes}
                        onChange={(event) => setState(item.id, { notes: event.target.value })}
                        className="cc-native-field"
                        placeholder="Optional note for this row"
                        disabled={isImported}
                      />
                    </label>
                  </div>

                  <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={state.createChildIfMissing}
                      onChange={(event) => setState(item.id, { createChildIfMissing: event.target.checked })}
                      disabled={isImported}
                    />
                    Create a child profile if this child is not in CentreConnect yet
                  </label>

                  {state.duplicates.length > 0 && !isImported && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-bold text-amber-900">Possible duplicate children found</p>
                      <p className="mt-1 text-xs text-amber-800">
                        We found children with a similar name or details. If this is the same child, please link to them instead of creating a new profile.
                      </p>
                      <div className="mt-3 space-y-2">
                        {state.duplicates.map((dup: any) => (
                          <div key={dup.identity_id} className="flex items-center justify-between rounded-xl bg-white p-3 border border-amber-100 shadow-sm">
                            <div className="text-xs">
                              <p className="font-bold text-slate-900">{state.selectedName} (Match)</p>
                              <p className="text-slate-500">Matches on: {dup.match_fields.join(', ')}</p>
                            </div>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              className="h-8 rounded-2xl border-teal-200 text-teal-700 hover:bg-teal-50"
                              onClick={() => {
                                setState(item.id, { 
                                  selectedChildId: dup.original_child_id, 
                                  createChildIfMissing: false,
                                  duplicates: [] 
                                })
                              }}
                            >
                              Link to this child
                            </Button>
                          </div>
                        ))}
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-xs font-medium text-amber-900">
                        <input
                          type="checkbox"
                          checked={state.bypassDuplicates}
                          onChange={(event) => setState(item.id, { bypassDuplicates: event.target.checked })}
                        />
                        I&apos;ve reviewed these matches and want to create a new profile anyway
                      </label>
                    </div>
                  )}
                </>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!isFailed ? (
                  <Button
                    type="button"
                    onClick={() => runImport(item)}
                    disabled={isImporting || isImported}
                    className="h-10 rounded-3xl bg-teal-600 px-4 text-white hover:bg-teal-700"
                  >
                    {isImported ? 'Saved' : 'Save to attendance register'}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-3xl border-slate-200 bg-white text-slate-700"
                  asChild
                >
                  <Link href={attendanceHref}>{buildAttendanceBoardLabel(state.attendanceDate || item.extracted_date)}</Link>
                </Button>
                <a
                  href={item.source_file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center rounded-3xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View source photo
                </a>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
