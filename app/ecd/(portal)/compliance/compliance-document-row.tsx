'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ChevronDown, CheckCircle2, XCircle, Clock, AlertCircle, Sparkles, Upload } from 'lucide-react'
import { AiSuggestedBadge } from '@/components/ui/ai-suggested-badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  extractComplianceDocumentFromPhotoAction,
  markDocumentUploadedAction,
  type ComplianceExtractionResult,
} from './actions'

type ComplianceDocumentRowProps = {
  doc: {
    id: string
    document_type: string
    label: string
    expires_at: string | null
    status: 'missing' | 'uploaded' | 'verified' | 'expired'
    notes: string | null
    file_url?: string | null
  }
  canEdit: boolean
  statusClassName?: string
  priority?: 'critical' | 'important' | 'standard'
}

function aiFieldClass(confidence: number | undefined) {
  return confidence ? 'border-teal-300 ring-2 ring-teal-100' : ''
}

function formatExpiry(expiresAt: string | null) {
  if (!expiresAt) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const expiry = new Date(expiresAt)
  expiry.setHours(0, 0, 0, 0)
  const days = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  if (days < 0) return { label: 'Expired', color: 'text-rose-600' }
  if (days <= 30) return { label: `Expires in ${days}d`, color: 'text-amber-600' }
  return { label: new Date(expiresAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }), color: 'text-emerald-600' }
}

const STATUS_CONFIG = {
  verified:  { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'Verified' },
  uploaded:  { icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',     label: 'Uploaded' },
  expired:   { icon: XCircle,      color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200',       label: 'Expired'  },
  missing:   { icon: AlertCircle,  color: 'text-slate-400',   bg: 'bg-slate-50 border-slate-200',     label: 'Missing'  },
}

export function ComplianceDocumentRow({ doc, canEdit, priority = 'standard' }: ComplianceDocumentRowProps) {
  // Auto-open cards that need attention
  const [open, setOpen] = useState(doc.status === 'missing' || doc.status === 'expired')
  const [expiresAt, setExpiresAt] = useState(doc.expires_at ?? '')
  const [notes, setNotes] = useState(doc.notes ?? '')
  const [issuingAuthority, setIssuingAuthority] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [recordDate, setRecordDate] = useState('')
  const [fileUrl, setFileUrl] = useState(doc.file_url ?? '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [aiConfidence, setAiConfidence] = useState<ComplianceExtractionResult['confidence']>()
  const [isExtracting, startExtractTransition] = useTransition()

  const cfg = STATUS_CONFIG[doc.status]
  const StatusIcon = cfg.icon
  const expiry = formatExpiry(doc.expires_at)

  function runExtractFromPhoto() {
    if (!photoFile) { toast.error('Select a photo first.'); return }
    startExtractTransition(async () => {
      const formData = new FormData()
      formData.set('id', doc.id)
      formData.set('document_type', doc.document_type)
      formData.set('file', photoFile)
      const result = await extractComplianceDocumentFromPhotoAction(formData)
      if (result.fileUrl) setFileUrl(result.fileUrl)
      if (!result.success) { toast.error(result.message); return }
      setAiConfidence(result.confidence)
      if (result.prefill?.expires_at) setExpiresAt(result.prefill.expires_at)
      if (result.prefill?.issuing_authority) setIssuingAuthority(result.prefill.issuing_authority)
      if (result.prefill?.document_number) setDocumentNumber(result.prefill.document_number)
      if (result.prefill?.record_date) setRecordDate(result.prefill.record_date)
      if (result.prefill?.notes) setNotes(result.prefill.notes)
      toast.success(result.message)
    })
  }

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden transition-all duration-200',
      doc.status === 'verified' ? 'border-emerald-200 bg-emerald-50/40' :
      doc.status === 'uploaded' ? 'border-amber-200 bg-amber-50/30' :
      doc.status === 'expired'  ? 'border-rose-200 bg-rose-50/30' :
      'border-slate-200 bg-white'
    )}>
      {/* ── Header row (always visible, click to expand) ── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {/* Priority dot */}
        {priority === 'critical' && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
        {priority === 'important' && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />}
        {priority === 'standard' && <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" />}

        {/* Status icon */}
        <StatusIcon className={cn('h-4 w-4 shrink-0', cfg.color)} />

        {/* Label */}
        <span className="flex-1 text-sm font-semibold text-slate-900 text-left leading-tight">
          {doc.label}
        </span>

        {/* Expiry pill */}
        {expiry && (
          <span className={cn('hidden sm:inline text-[11px] font-semibold shrink-0', expiry.color)}>
            {expiry.label}
          </span>
        )}

        {/* Status badge */}
        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize shrink-0', cfg.bg, cfg.color)}>
          {cfg.label}
        </span>

        {/* Chevron */}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {/* ── Expandable form body ── */}
      {open && (
        <form
          action={markDocumentUploadedAction}
          className="border-t border-slate-200/60 px-4 pb-4 pt-3 space-y-4"
        >
          <input type="hidden" name="id" value={doc.id} />
          <input type="hidden" name="current_status" value={doc.status} />
          <input type="hidden" name="file_url" value={fileUrl} />

          {/* Row 1: expiry + notes + save */}
          <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
            <div className="space-y-1">
              <label className="flex items-center justify-between gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Expiry Date
                <AiSuggestedBadge confidence={aiConfidence?.expires_at} />
              </label>
              <input
                type="date" name="expires_at" value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className={cn('cc-native-field', aiFieldClass(aiConfidence?.expires_at))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Notes</label>
              <input
                type="text" name="notes" value={notes}
                onChange={e => setNotes(e.target.value)}
                className={cn('cc-native-field', aiFieldClass(aiConfidence?.notes))}
                placeholder="Optional notes"
              />
            </div>
            <Button
              type="submit"
              disabled={!canEdit}
              className="self-end w-full sm:w-auto rounded-xl bg-teal-600 text-white hover:bg-teal-700"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Save
            </Button>
          </div>

          {/* Row 2: AI fields */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Issuing Authority
                <AiSuggestedBadge confidence={aiConfidence?.issuing_authority} />
              </label>
              <input
                name="ai_issuing_authority" value={issuingAuthority}
                onChange={e => setIssuingAuthority(e.target.value)}
                className={cn('cc-native-field', aiFieldClass(aiConfidence?.issuing_authority))}
                placeholder="e.g. City of Joburg"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Document No.
                <AiSuggestedBadge confidence={aiConfidence?.document_number} />
              </label>
              <input
                name="ai_document_number" value={documentNumber}
                onChange={e => setDocumentNumber(e.target.value)}
                className={cn('cc-native-field', aiFieldClass(aiConfidence?.document_number))}
                placeholder="Reference number"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Issue Date
                <AiSuggestedBadge confidence={aiConfidence?.record_date} />
              </label>
              <input
                type="date" name="ai_record_date" value={recordDate}
                onChange={e => setRecordDate(e.target.value)}
                className={cn('cc-native-field', aiFieldClass(aiConfidence?.record_date))}
              />
            </div>
          </div>

          {/* Row 3: Photo upload + AI extract */}
          <div className="rounded-xl border border-dashed border-teal-300/60 bg-teal-50/40 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-teal-700">
              <Sparkles className="inline h-3 w-3 mr-1" />
              AI Smart Scan — take a photo, we fill the details
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept="image/*,.pdf"
                className="flex-1 min-w-0 text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-teal-600 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-white"
                onChange={e => setPhotoFile(e.target.files?.[0] ?? null)}
                disabled={!canEdit}
              />
              <Button
                type="button"
                onClick={runExtractFromPhoto}
                disabled={!canEdit || isExtracting || !photoFile}
                className="shrink-0 rounded-xl bg-teal-600 px-4 text-white hover:bg-teal-700"
              >
                {isExtracting ? 'Scanning...' : 'Scan'}
              </Button>
            </div>
            {fileUrl && (
              <p className="mt-2 text-[11px] font-semibold text-teal-700">Photo saved to storage</p>
            )}
            {aiConfidence && (
              <p className="mt-1 text-[11px] text-teal-600">AI-suggested fields are highlighted — review before saving.</p>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
