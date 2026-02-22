'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DOCUMENT_BUCKET = 'parent-documents'
const MAX_DOC_SIZE = 8 * 1024 * 1024

type ParentDocument = {
  id: string
  doc_type: string
  file_name: string
  file_path: string
  expiry_date: string | null
  created_at: string
}

type Props = {
  initialDocuments: ParentDocument[]
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function DocumentsVaultManager({ initialDocuments }: Props) {
  const supabase = createClient()
  const [documents, setDocuments] = useState(initialDocuments)
  const [saving, setSaving] = useState(false)
  const [docType, setDocType] = useState('parent_id')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)

  async function uploadDocument(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      toast.error('Select a file')
      return
    }
    if (file.size > MAX_DOC_SIZE) {
      toast.error('File must be under 8MB')
      return
    }
    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Please sign in again')

      const filePath = `${user.id}/${Date.now()}-${sanitizeFileName(file.name)}`
      const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(filePath, file, {
        upsert: false,
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
      })
      if (uploadError) throw uploadError

      const { data, error } = await supabase
        .from('parent_documents')
        .insert({
          parent_id: user.id,
          doc_type: docType,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type || null,
          expiry_date: expiryDate || null,
        })
        .select('id,doc_type,file_name,file_path,expiry_date,created_at')
        .single()

      if (error) throw error
      setDocuments((prev) => [data as ParentDocument, ...prev])
      setFile(null)
      setExpiryDate('')
      toast.success('Document uploaded')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to upload')
    } finally {
      setSaving(false)
    }
  }

  async function openDocument(doc: ParentDocument) {
    try {
      const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(doc.file_path, 120)
      if (error) throw error
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to open document')
    }
  }

  async function removeDocument(doc: ParentDocument) {
    setSaving(true)
    try {
      const { error: deleteRowError } = await supabase.from('parent_documents').delete().eq('id', doc.id)
      if (deleteRowError) throw deleteRowError
      await supabase.storage.from(DOCUMENT_BUCKET).remove([doc.file_path])
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      toast.success('Document removed')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to remove')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={uploadDocument} className="grid gap-3 rounded-xl border border-slate-200 bg-white/80 p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Document Type</Label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="cc-native-field"
          >
            <option value="parent_id">Parent ID</option>
            <option value="proof_of_address">Proof of Address</option>
            <option value="birth_certificate">Birth Certificate</option>
            <option value="immunization_record">Immunization Record</option>
            <option value="medical_aid">Medical Aid Document</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Expiry Date (optional)</Label>
          <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>File</Label>
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <Button type="submit" disabled={saving} className="sm:col-span-2">
          {saving ? 'Uploading...' : 'Upload Document'}
        </Button>
      </form>

      <div className="space-y-2">
        {documents.length === 0 ? (
          <p className="text-sm text-slate-600">No documents uploaded yet.</p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{doc.file_name}</p>
                <p className="text-xs text-slate-600">
                  {doc.doc_type}
                  {doc.expiry_date ? ` - Expires ${doc.expiry_date}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" onClick={() => openDocument(doc)}>
                  Open
                </Button>
                <Button variant="outline" disabled={saving} onClick={() => removeDocument(doc)}>
                  Remove
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
