'use client'

import Image from 'next/image'
import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type WebsiteMediaInputProps = {
  id: string
  name: string
  label: string
  accept: string
  description: string
  multiple?: boolean
  currentImages?: string[]
  emptyLabel: string
  previewClassName?: string
}

type PendingPreview = {
  id: string
  name: string
  url: string
  sizeLabel: string
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function WebsiteMediaInput({
  id,
  name,
  label,
  accept,
  description,
  multiple = false,
  currentImages = [],
  emptyLabel,
  previewClassName,
}: WebsiteMediaInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const pendingPreviews = useMemo<PendingPreview[]>(() => {
    return files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      url: URL.createObjectURL(file),
      sizeLabel: formatFileSize(file.size),
    }))
  }, [files])

  useEffect(() => {
    return () => {
      pendingPreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [pendingPreviews])

  const hasPendingFiles = files.length > 0

  function syncFiles(nextFiles: File[]) {
    setFiles(nextFiles)
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    syncFiles(Array.from(event.target.files ?? []))
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(event.dataTransfer.files ?? [])
    if (!inputRef.current || droppedFiles.length === 0) return

    const transfer = new DataTransfer()
    const filesToUse = multiple ? droppedFiles : droppedFiles.slice(0, 1)
    filesToUse.forEach((file) => transfer.items.add(file))
    inputRef.current.files = transfer.files
    syncFiles(Array.from(transfer.files))
  }

  function clearPendingFiles() {
    setFiles([])
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </label>
        {hasPendingFiles ? (
          <button
            type="button"
            onClick={clearPendingFiles}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        ) : null}
      </div>

      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-white px-4 py-5 text-center transition-colors',
          isDragging ? 'border-teal-400 bg-teal-50' : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50/40'
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          {hasPendingFiles ? <ImagePlus className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-900">
            {hasPendingFiles
              ? `${files.length} file${files.length === 1 ? '' : 's'} ready to save`
              : multiple
                ? 'Drop images here or choose files'
                : 'Drop an image here or choose a file'}
          </p>
          <p className="text-xs text-slate-500">PNG, JPG, WebP, GIF, or SVG up to 8MB each</p>
        </div>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
        <span className="inline-flex items-center rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white shadow-sm">
          Choose {multiple ? 'files' : 'file'}
        </span>
      </label>

      {hasPendingFiles ? (
        <div className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">Ready to save</p>
          <div className="space-y-2">
            {pendingPreviews.map((preview) => (
              <div key={preview.id} className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-3 py-2">
                <div className={cn('relative h-14 w-14 overflow-hidden rounded-xl border border-slate-200 bg-slate-50', previewClassName)}>
                  <Image src={preview.url} alt={preview.name} fill className="object-cover" unoptimized />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{preview.name}</p>
                  <p className="text-xs text-slate-500">{preview.sizeLabel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : currentImages.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Current images</p>
          <div className={cn('grid gap-2', multiple ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-1')}>
            {currentImages.map((url) => (
              <div key={url} className={cn('relative overflow-hidden rounded-2xl border border-slate-200 bg-white', previewClassName || (multiple ? 'h-20' : 'h-24 w-full'))}>
                <Image src={url} alt={`${label} preview`} fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">{emptyLabel}</p>
      )}

      <p className="text-xs text-slate-500">{description}</p>
    </div>
  )
}
