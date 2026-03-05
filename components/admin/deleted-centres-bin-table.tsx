'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export type DeletedCentre = {
  id: string
  name: string | null
  slug: string | null
  deleted_at: string | null
}

type DeletedCentresBinTableProps = {
  centres: DeletedCentre[]
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function DeletedCentresBinTable({ centres }: DeletedCentresBinTableProps) {
  const router = useRouter()
  const [restoring, setRestoring] = useState<Record<string, boolean>>({})

  const restoreCentre = useCallback(async (centreId: string) => {
    if (!confirm('Restore this centre from the bin?')) return
    setRestoring((prev) => ({ ...prev, [centreId]: true }))
    try {
      const response = await fetch(`/api/internal/platform-admin/centres/${centreId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Failed to restore centre.')
      toast.success('Centre restored from bin.')
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Restore failed.')
    } finally {
      setRestoring((prev) => {
        const next = { ...prev }
        delete next[centreId]
        return next
      })
    }
  }, [router])

  if (centres.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
        No centres in the bin yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/30">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Deleted At</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {centres.map((centre) => (
            <TableRow key={centre.id}>
              <TableCell className="font-semibold text-slate-100">{centre.name || 'Untitled centre'}</TableCell>
              <TableCell className="text-slate-300">{centre.slug || '-'}</TableCell>
              <TableCell className="text-slate-300">{formatDateTime(centre.deleted_at)}</TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800"
                  onClick={() => void restoreCentre(centre.id)}
                  disabled={Boolean(restoring[centre.id])}
                >
                  {restoring[centre.id] ? 'Restoring…' : 'Restore'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
