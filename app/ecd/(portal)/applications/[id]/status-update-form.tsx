'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ecd/Button'
import { Textarea } from '@/components/ui/textarea'
import { buildWarmApplicationUpdateMessage } from '@/lib/communications/templates'
import { applicationStatusEmail } from '@/lib/email/templates'

type StatusUpdateFormProps = {
  applicationId: string
  ecdId: string
  role: 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor'
  parentId: string
  centreName: string
  childName: string
  parentName: string
  parentEmail: string | null
  applicationNumber: string
  currentStatus: string
  currentNotes: string | null
  currentOfferAcceptedAt: string | null
}

const FINAL_STATUSES = new Set(['approved', 'waitlisted', 'rejected', 'withdrawn'])

export function StatusUpdateForm({
  applicationId,
  ecdId,
  role,
  parentId,
  centreName,
  childName,
  parentName,
  parentEmail,
  applicationNumber,
  currentStatus,
  currentNotes,
  currentOfferAcceptedAt,
}: StatusUpdateFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState(currentStatus)
  const [notes, setNotes] = useState(currentNotes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (currentStatus === 'enrolled' && status !== 'enrolled') {
        throw new Error('Enrolled applications cannot be moved back to another status.')
      }
      if (currentOfferAcceptedAt && status !== 'enrolled') {
        throw new Error('This offer has already been accepted by the parent and cannot be changed.')
      }
      if (role === 'ecd_supervisor' && status !== currentStatus) {
        const blockedStatus = new Set(['approved', 'enrolled', 'rejected'])
        if (blockedStatus.has(status)) {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user) {
            throw new Error('Session expired. Please sign in again.')
          }

          const { data: membership, error: membershipError } = await supabase
            .from('ecd_admins')
            .select('can_approve_applications')
            .eq('ecd_id', ecdId)
            .eq('user_id', user.id)
            .maybeSingle()

          if (membershipError || !membership?.can_approve_applications) {
            throw new Error('Contact the centre admin to grant approval rights before making final decisions.')
          }
        }
      }

      const now = new Date().toISOString()
      const payload: Record<string, string | null> = {
        status,
        admin_notes: notes.trim() || null,
      }

      if (status !== currentStatus) {
        payload.reviewed_at = now
        if (FINAL_STATUSES.has(status)) {
          payload.decided_at = now
        }
        if (status === 'approved') {
          payload.offer_made_at = now
          payload.offer_sent_at = now
          payload.withdrawn_at = null
          payload.withdraw_reason = null
        }
        if (status === 'withdrawn') {
          payload.withdrawn_at = now
          payload.withdraw_reason = 'centre_closed'
        }
      }

      const { error: updateError } = await supabase
        .from('applications')
        .update(payload)
        .eq('id', applicationId)
        .eq('ecd_id', ecdId)

      if (updateError) throw updateError

      if (status !== currentStatus) {
        const warnings: string[] = []
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const { error: historyError } = await supabase.from('application_status_history').insert({
          application_id: applicationId,
          old_status: currentStatus,
          new_status: status,
          changed_by: user?.id ?? null,
          notes: notes.trim() || null,
          ecd_id: ecdId,
        })
        if (historyError) {
          warnings.push('history log')
        }

        if (parentId) {
          const message = buildWarmApplicationUpdateMessage({
            centreName,
            childName,
            parentName,
            applicationNumber,
            status,
          })

          const { error: notificationError } = await supabase.from('parent_notifications').insert({
            parent_id: parentId,
            ecd_id: ecdId,
            application_id: applicationId,
            template_key: null,
            title: status === 'approved' ? 'Great news from your centre' : 'A quick update on your application',
            message,
          })
          if (notificationError) {
            warnings.push('parent notification')
          }

          const appUrl = `${window.location.origin}/parent/applications/${applicationId}`
          const { subject, html } = applicationStatusEmail({
            parentName,
            childName,
            centreName,
            newStatus: status,
            appUrl,
          })
          const recipient = parentEmail?.trim() || `user:${parentId}`

          const { error: emailQueueError } = await supabase.from('email_queue').insert({
            recipient,
            subject,
            body: html,
            status: 'pending',
          })
          if (emailQueueError) {
            warnings.push('email queue')
          }
        }

        if (warnings.length > 0) {
          toast('Application updated, but follow-up actions failed: ' + warnings.join(', '))
        }
      }

      toast.success(status === 'approved' && status !== currentStatus ? 'Approval sent. Parent must confirm to finalize.' : 'Application updated')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update application')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="status" className="text-sm font-medium text-slate-700">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="cc-native-field"
          disabled={Boolean(currentOfferAcceptedAt)}
        >
          <option value="submitted">Submitted</option>
          <option value="in_review">In Review</option>
          <option value="approved">Approved</option>
          <option value="enrolled">Enrolled</option>
          <option value="waitlisted">Waitlisted</option>
          <option value="rejected">Rejected</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
        {currentOfferAcceptedAt ? (
          <p className="text-xs text-slate-600">
            Parent has accepted this offer. Status changes are locked.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium text-slate-700">
          Notes
        </label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add internal notes for this application"
        />
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Update Application'}
      </Button>
    </form>
  )
}
