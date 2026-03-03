'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SurfaceCard } from '@/components/ui/surface-card'
import { FileUp, FileText, Trash2, Eye, History, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

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

type AuditAction = 'upload' | 'view' | 'download' | 'delete'

type DocumentAuditEntry = {
  id: string
  document_id: string
  document_name: string
  owner_id: string
  actor_id: string | null
  action: AuditAction
  actor_hint: string | null
  created_at: string
}

type Props = {
  initialDocuments: ParentDocument[]
  initialAuditLog: DocumentAuditEntry[]
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function DocumentsVaultManager({ initialDocuments, initialAuditLog }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [documents, setDocuments] = useState(initialDocuments)
  const [auditLog, setAuditLog] = useState(initialAuditLog)
  const [saving, setSaving] = useState(false)
  const [docType, setDocType] = useState('parent_id')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)

  async function createAuditEntry(
    action: AuditAction,
    ownerId: string,
    documentId: string,
    documentName: string
  ) {
    const { data, error } = await supabase
      .from('document_audit_log')
      .insert({
        document_id: documentId,
        document_name: documentName,
        owner_id: ownerId,
        actor_id: ownerId,
        action,
        actor_hint: 'parent_portal',
      })
      .select('*')
      .single()

    if (error || !data) return
    setAuditLog((prev) => [data as DocumentAuditEntry, ...prev].slice(0, 20))
  }

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
      await createAuditEntry('upload', user.id, data.id, data.file_name)
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await createAuditEntry('view', user.id, doc.id, doc.file_name)
      }
      router.push(`/parent/profile/documents/view/${doc.id}`)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to open document')
    }
  }

  async function removeDocument(doc: ParentDocument) {
    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { error: deleteRowError } = await supabase.from('parent_documents').delete().eq('id', doc.id)
      if (deleteRowError) throw deleteRowError
      await supabase.storage.from(DOCUMENT_BUCKET).remove([doc.file_path])
      if (user) {
        await createAuditEntry('delete', user.id, doc.id, doc.file_name)
      }
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      toast.success('Document removed')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to remove')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cc-stack space-y-10">
      {/* Upload Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <FileUp className="h-4 w-4 text-cyan-600" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Secure Upload</p>
        </div>
        <SurfaceCard className="p-6">
          <form onSubmit={uploadDocument} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-900 ml-1">Document Type</Label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="cc-native-field flex border bg-gradient-to-b from-white to-slate-50/90 py-2 shadow-[var(--shadow-elevation-1)] transition-[border-color,box-shadow,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 h-14 rounded-2xl border-slate-100 bg-slate-50 px-4 text-sm font-bold text-slate-900 focus:ring-cyan-500/20 w-full appearance-none"
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
                <Label className="text-xs font-bold text-slate-900 ml-1">Expiry Date (optional)</Label>
                <Input 
                  type="date" 
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-4"
                  value={expiryDate} 
                  onChange={(e) => setExpiryDate(e.target.value)} 
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-900 ml-1">File Selection</Label>
                <div className="relative group">
                  <Input 
                    type="file" 
                    className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-4 pt-3.5 file:hidden cursor-pointer"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)} 
                  />
                  {!file && (
                    <div className="absolute inset-0 pointer-events-none flex items-center px-4 text-slate-400 text-sm font-bold">
                      Tap to choose document...
                    </div>
                  )}
                  {file && (
                    <div className="absolute inset-0 pointer-events-none flex items-center px-4 text-cyan-600 text-sm font-bold">
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={saving} 
              className="w-full h-16 rounded-[2rem] font-black text-lg bg-slate-900 hover:bg-slate-800 text-white shadow-2xl transition-all active:scale-95"
            >
              {saving ? 'Encrypting...' : 'Upload & Vault'}
            </Button>
          </form>
        </SurfaceCard>
      </section>

      {/* Vault Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Shield className="h-4 w-4 text-emerald-600" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Personal Vault</p>
        </div>
        <div className="space-y-3">
          {documents.length === 0 ? (
            <SurfaceCard className="p-12 text-center border-dashed border-2 bg-slate-50/50">
              <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-500 italic">No documents vaulted yet.</p>
            </SurfaceCard>
          ) : (
            documents.map((doc) => (
              <SurfaceCard key={doc.id} className="p-5 border-l-4 border-l-cyan-500">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-900 tracking-tight">{doc.file_name}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                      {doc.doc_type.replace(/_/g, ' ')}
                      {doc.expiry_date ? ` · Expires ${new Date(doc.expiry_date).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openDocument(doc)}
                      className="h-11 px-5 rounded-xl bg-slate-100 text-slate-900 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => removeDocument(doc)} 
                      disabled={saving}
                      className="h-11 w-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors active:scale-90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </SurfaceCard>
            ))
          )}
        </div>
      </section>

      {/* Audit Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <History className="h-4 w-4 text-slate-400" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Access Protocols</p>
        </div>
        <SurfaceCard className="p-0 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {auditLog.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-bold text-slate-400 italic">No access recorded yet.</p>
              </div>
            ) : (
              auditLog.map((entry) => (
                <div key={entry.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700">
                      {entry.action === 'upload' ? 'Uploaded' :
                       entry.action === 'view' ? 'Viewed' :
                       entry.action === 'download' ? 'Downloaded' :
                       'Deleted'} <span className="text-slate-400 font-medium italic">{entry.document_name}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mt-0.5">
                      {new Date(entry.created_at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    entry.action === 'upload' ? 'bg-emerald-400' :
                    entry.action === 'delete' ? 'bg-rose-400' : 'bg-cyan-400'
                  )} />
                </div>
              ))
            )}
          </div>
        </SurfaceCard>
      </section>
    </div>
  )
}
