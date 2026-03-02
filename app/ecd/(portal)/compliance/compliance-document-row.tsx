'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
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
  statusClassName: string
}

function aiFieldClass(confidence: number | undefined) {
  return confidence ? 'border-teal-300 ring-2 ring-teal-100' : ''
}

export function ComplianceDocumentRow({ doc, canEdit, statusClassName }: ComplianceDocumentRowProps) {
  const [expiresAt, setExpiresAt] = useState(doc.expires_at ?? '')
  const [notes, setNotes] = useState(doc.notes ?? '')
  const [issuingAuthority, setIssuingAuthority] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [recordDate, setRecordDate] = useState('')
  const [fileUrl, setFileUrl] = useState(doc.file_url ?? '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [aiConfidence, setAiConfidence] = useState<ComplianceExtractionResult['confidence']>()
  const [isExtracting, startExtractTransition] = useTransition()

  function runExtractFromPhoto() {
    if (!photoFile) {
      toast.error('Select a photo first.')
      return
    }

    startExtractTransition(async () => {
      const formData = new FormData()
      formData.set('id', doc.id)
      formData.set('document_type', doc.document_type)
      formData.set('file', photoFile)

      const result = await extractComplianceDocumentFromPhotoAction(formData)
      if (result.fileUrl) setFileUrl(result.fileUrl)
      if (!result.success) {
        toast.error(result.message)
        return
      }

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
    <form action={markDocumentUploadedAction} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
      <input type="hidden" name="id" value={doc.id} />
      <input type="hidden" name="current_status" value={doc.status} />
      <input type="hidden" name="file_url" value={fileUrl} />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{doc.label}</p>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassName}`}>
          {doc.status}
        </span>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-[200px_1fr_auto]">
        <div className="space-y-1">
          <label className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Expiry Date
            <AiSuggestedBadge confidence={aiConfidence?.expires_at} />
          </label>
          <input
            type="date"
            name="expires_at"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            className={cn('cc-native-field', aiFieldClass(aiConfidence?.expires_at))}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notes</label>
          <input
            type="text"
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={cn('cc-native-field', aiFieldClass(aiConfidence?.notes))}
            placeholder="Notes"
          />
        </div>

        <Button type="submit" disabled={!canEdit} className="w-full self-end lg:w-auto">
          Mark as Uploaded
        </Button>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <div className="space-y-1">
          <label className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Issuing Authority
            <AiSuggestedBadge confidence={aiConfidence?.issuing_authority} />
          </label>
          <input
            name="ai_issuing_authority"
            value={issuingAuthority}
            onChange={(event) => setIssuingAuthority(event.target.value)}
            className={cn('cc-native-field', aiFieldClass(aiConfidence?.issuing_authority))}
            placeholder="Municipality / Authority"
          />
        </div>
        <div className="space-y-1">
          <label className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Document Number
            <AiSuggestedBadge confidence={aiConfidence?.document_number} />
          </label>
          <input
            name="ai_document_number"
            value={documentNumber}
            onChange={(event) => setDocumentNumber(event.target.value)}
            className={cn('cc-native-field', aiFieldClass(aiConfidence?.document_number))}
            placeholder="Reference number"
          />
        </div>
        <div className="space-y-1">
          <label className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Record Date
            <AiSuggestedBadge confidence={aiConfidence?.record_date} />
          </label>
          <input
            type="date"
            name="ai_record_date"
            value={recordDate}
            onChange={(event) => setRecordDate(event.target.value)}
            className={cn('cc-native-field', aiFieldClass(aiConfidence?.record_date))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Photo</label>
          <input
            type="file"
            accept="image/*,.pdf"
            className="cc-native-field"
            onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="h-10 rounded-3xl bg-teal-600 px-4 text-white hover:bg-teal-700"
          onClick={runExtractFromPhoto}
          disabled={!canEdit || isExtracting || !photoFile}
        >
          {isExtracting ? 'Extracting...' : 'Extract from Photo'}
        </Button>
        {fileUrl ? <p className="text-xs font-semibold text-teal-700">Photo uploaded to storage</p> : null}
      </div>
      <p className="mt-2 text-[11px] font-semibold text-slate-500">
        AI-suggested fields are highlighted. You can manually override every value before saving.
      </p>
    </form>
  )
}
