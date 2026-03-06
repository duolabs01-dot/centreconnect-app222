'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/cc-admin/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea' // Assuming a textarea component exists
import { adminTheme } from '@/lib/admin-theme'
import { cn } from '@/lib/utils'

interface CreateSupportTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableCentres: Array<{ id: string; name: string }>
  availableAssignees: Array<{ id: string; name: string }>
}

const PRIORITY_OPTIONS = [
  { value: '1', label: 'Low' },
  { value: '2', label: 'Medium' },
  { value: '3', label: 'High' },
  { value: '4', label: 'Critical' },
]

const UNASSIGNED_VALUE = '__unassigned__'

export function CreateSupportTicketDialog({ open, onOpenChange, availableCentres, availableAssignees }: CreateSupportTicketDialogProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, startTransition] = useTransition()
  const [form, setForm] = useState({
    subject: '',
    priority: '2', // Default to Medium
    ecdId: '',
    description: '',
    assignee: UNASSIGNED_VALUE,
  })

  const premiumInputClass =
    'border-slate-500/80 bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100 placeholder:text-slate-400/95 shadow-[var(--shadow-elevation-1)] focus-visible:ring-cyan-400/70 focus-visible:border-cyan-400'

  async function handleSubmit() {
    if (isSubmitting) return

    if (!form.subject.trim() || !form.description.trim()) {
      toast.error('Subject and Description are required.')
      return
    }
    if (!form.ecdId) {
      toast.error('A related centre is required.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/internal/platform-admin/support-tickets', { // New API route
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: form.subject.trim(),
          priority: parseInt(form.priority),
          ecdId: form.ecdId,
          description: form.description.trim(),
          assigneeId: form.assignee !== UNASSIGNED_VALUE ? form.assignee : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to create ticket.')
      }

      toast.success('Support ticket created successfully!')
      setForm({
        subject: '',
        priority: '2',
        ecdId: '',
        description: '',
        assignee: UNASSIGNED_VALUE,
      })
      onOpenChange(false)
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error.message || 'Error creating ticket.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(adminTheme.card, "bg-slate-900/90")}>
        <DialogHeader>
          <DialogTitle className={adminTheme.cardTitle}>New Support Ticket</DialogTitle>
          <DialogDescription className="text-slate-300">
            Create a new support ticket for a tenant.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          <div className="space-y-1">
            <Label htmlFor="ticket-subject" className={adminTheme.body}>Subject</Label>
            <Input
              id="ticket-subject"
              className={premiumInputClass}
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="ticket-priority" className={adminTheme.body}>Priority</Label>
            <Select value={form.priority} onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}>
              <SelectTrigger id="ticket-priority" className={cn(premiumInputClass, "[&_span]:text-slate-100")}>
                <SelectValue placeholder="Select Priority" />
              </SelectTrigger>
              <SelectContent className={cn("border-slate-500/80 bg-slate-900 text-slate-100 shadow-[var(--shadow-elevation-4)] [&_*]:text-slate-100")}>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="focus:bg-cyan-500/20 focus:text-cyan-100">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ticket-centre" className={adminTheme.body}>Related Centre</Label>
            <Select value={form.ecdId} onValueChange={(value) => setForm((prev) => ({ ...prev, ecdId: value }))}>
              <SelectTrigger id="ticket-centre" className={cn(premiumInputClass, "[&_span]:text-slate-100")}>
                <SelectValue placeholder="Select Centre" />
              </SelectTrigger>
              <SelectContent className={cn("border-slate-500/80 bg-slate-900 text-slate-100 shadow-[var(--shadow-elevation-4)] [&_*]:text-slate-100")}>
                {availableCentres.length === 0 ? (
                  <SelectItem value="" disabled>No centres available</SelectItem>
                ) : (
                  availableCentres.map((centre) => (
                    <SelectItem key={centre.id} value={centre.id} className="focus:bg-cyan-500/20 focus:text-cyan-100">
                      {centre.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ticket-description" className={adminTheme.body}>Description</Label>
            <Textarea
              id="ticket-description"
              className={cn(premiumInputClass, "min-h-[100px]")}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="ticket-assignee" className={adminTheme.body}>Assignee</Label>
            <Select value={form.assignee} onValueChange={(value) => setForm((prev) => ({ ...prev, assignee: value }))}>
              <SelectTrigger id="ticket-assignee" className={cn(premiumInputClass, "[&_span]:text-slate-100")}>
                <SelectValue placeholder="Assign ticket (optional)" />
              </SelectTrigger>
              <SelectContent className={cn("border-slate-500/80 bg-slate-900 text-slate-100 shadow-[var(--shadow-elevation-4)] [&_*]:text-slate-100")}>
                <SelectItem value={UNASSIGNED_VALUE} className="focus:bg-cyan-500/20 focus:text-cyan-100">
                  Unassigned
                </SelectItem>
                {availableAssignees.length === 0 ? (
                  <SelectItem value="__no_assignees__" disabled>No assignees available</SelectItem>
                ) : (
                  availableAssignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id} className="focus:bg-cyan-500/20 focus:text-cyan-100">
                      {assignee.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className={adminTheme.buttonSecondary}
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button className={adminTheme.buttonPrimary} onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


