'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { AiSuggestedBadge } from '@/components/ui/ai-suggested-badge'
import { Button } from '@/components/ui/button'
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
}

const todayIso = () => new Date().toISOString().slice(0, 10)

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
  const [isExtracting, startExtractTransition] = useTransition()
  const [isImporting, startImportTransition] = useTransition()

  const sortedImports = useMemo(
    () =>
      [...imports].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }),
    [imports]
  )

  function getState(item: RegisterImportItem): ImportFormState {
    const existing = formState[item.id]
    if (existing) return existing

    return {
      selectedName: item.selected_name ?? item.extracted_names[0] ?? '',
      selectedChildId: item.imported_child_id ?? '',
      attendanceDate: item.extracted_date ?? bulkDate,
      notes: item.notes ?? '',
      createChildIfMissing: false,
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

  function runBulkExtract() {
    if (files.length === 0) {
      toast.error('Choose at least one register photo.')
      return
    }

    startExtractTransition(async () => {
      let successCount = 0
      for (const file of files) {
        const formData = new FormData()
        formData.set('file', file)
        formData.set('attendance_date', bulkDate)
        formData.set('notes', bulkNotes)

        const result = await extractRegisterPhotoAction(formData)
        const resultItems = result.items ?? (result.item ? [result.item] : [])

        if (!result.success) {
          toast.error(`${file.name}: ${result.message}`)
          if (resultItems.length > 0) {
            setImports((current) => {
              const existingIds = new Set(current.map((entry) => entry.id))
              const fresh = resultItems.filter((entry) => !existingIds.has(entry.id)) as RegisterImportItem[]
              return [...fresh, ...current]
            })
          }
          continue
        }

        if (resultItems.length > 0) {
          successCount += resultItems.length
          setImports((current) => {
            const existingIds = new Set(current.map((entry) => entry.id))
            const fresh = resultItems.filter((entry) => !existingIds.has(entry.id)) as RegisterImportItem[]
            return [...fresh, ...current]
          })
        }
      }

      if (successCount > 0) {
        toast.success(`Extracted ${successCount} register photo${successCount === 1 ? '' : 's'}.`)
        setFiles([])
      }
    })
  }

  function runImport(item: RegisterImportItem) {
    const state = getState(item)

    startImportTransition(async () => {
      const formData = new FormData()
      formData.set('import_id', item.id)
      formData.set('child_id', state.selectedChildId)
      formData.set('selected_name', state.selectedName)
      formData.set('attendance_date', state.attendanceDate)
      formData.set('notes', state.notes)
      if (state.createChildIfMissing) {
        formData.set('create_child_if_missing', 'on')
      }

      const result = await importRegisterEntryAction(formData)
      if (!result.success || !result.item) {
        toast.error(result.message)
        return
      }

      setImports((current) =>
        current.map((entry) => {
          if (entry.id !== result.item?.id) return entry
          return result.item as RegisterImportItem
        })
      )
      toast.success(result.message)
    })
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-teal-100 bg-white p-5 shadow-[var(--shadow-elevation-1)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">Bulk Register Import</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Upload paper register photos</h2>
        <p className="mt-1 text-sm text-slate-600">
          We extract names and dates with AI, then you confirm and import to attendance in one tap.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px]">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Register photos</span>
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              className="cc-native-field"
              onChange={(event) => {
                setFiles(Array.from(event.target.files ?? []))
              }}
            />
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
            placeholder="Optional note, e.g. Register book week 1."
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={runBulkExtract}
            disabled={isExtracting || files.length === 0}
            className="h-11 rounded-3xl bg-teal-600 px-5 text-white hover:bg-teal-700"
          >
            {isExtracting ? 'Extracting...' : 'Extract from photos'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-3xl border-slate-200 bg-white text-slate-700"
            asChild
          >
            <Link href="/ecd/attendance">Open attendance board</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {sortedImports.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">No register imports yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              Upload your first paper register photo above to create a digital attendance history.
            </p>
          </div>
        ) : null}

        {sortedImports.map((item) => {
          const state = getState(item)
          const isImported = item.status === 'imported'

          return (
            <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-elevation-1)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.source_file_name ?? 'Register photo'}</p>
                  <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString('en-ZA')}</p>
                </div>
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">
                  {item.status}
                </span>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Extracted name</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={state.selectedName}
                      onChange={(event) => setState(item.id, { selectedName: event.target.value })}
                      className="cc-native-field"
                    >
                      {item.extracted_names.length === 0 ? <option value="">No names detected</option> : null}
                      {item.extracted_names.map((name) => (
                        <option key={`${item.id}-${name}`} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <AiSuggestedBadge confidence={item.extracted_names.length > 0 ? 72 : undefined} />
                  </div>
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Attendance date</span>
                  <input
                    type="date"
                    value={state.attendanceDate}
                    onChange={(event) => setState(item.id, { attendanceDate: event.target.value })}
                    className="cc-native-field"
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
                    placeholder="Optional notes"
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
                Create child profile if no match is found
              </label>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => runImport(item)}
                  disabled={isImporting || isImported}
                  className="h-10 rounded-3xl bg-teal-600 px-4 text-white hover:bg-teal-700"
                >
                  {isImported ? 'Imported' : 'Import attendance'}
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
