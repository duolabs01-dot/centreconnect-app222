'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { triggerFirstTimeConfetti } from '@/lib/ui/confetti'

type Child = {
  id: string
  first_name: string
  last_name: string
}

type ApplyFormProps = {
  centreId: string
  centreSlug: string
  childProfiles: Child[]
  selectedChildId: string
  onChildSelect: (childId: string) => void
  autoSelectChildId?: string
}

export function ApplyForm({
  centreId,
  centreSlug,
  childProfiles,
  selectedChildId,
  onChildSelect,
  autoSelectChildId,
}: ApplyFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [message, setMessage] = useState('')
  const [shareMultipleFlag, setShareMultipleFlag] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (autoSelectChildId) {
      onChildSelect(autoSelectChildId)
    }
  }, [autoSelectChildId, onChildSelect])

  const activeChildId = selectedChildId || childProfiles[0]?.id || ''

  const applicationNumber = useMemo(() => {
    const now = new Date()
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}`
    const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase()
    return `APP-${datePart}-${randomPart}`
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeChildId) {
      toast.error('Please select a child profile.')
      return
    }

    setSubmitting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in again')
        router.push(`/login?next=${encodeURIComponent(`/apply/${centreSlug}`)}`)
        return
      }

      const { error } = await supabase.from('applications').insert({
        application_number: applicationNumber,
        ecd_id: centreId,
        parent_id: user.id,
        child_id: activeChildId,
        parent_message: message.trim() || null,
        share_multiple_flag: shareMultipleFlag,
      })

      if (error) throw error

      // Mark first successful application for smart install prompt
      localStorage.setItem('cc_first_action_complete', 'true')

      try {
        await fetch('/api/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ecdId: centreId,
            eventType: 'application_submitted',
            metadata: { source: 'apply_form' },
          }),
          keepalive: true,
        })
      } catch {
        // Non-blocking analytics event.
      }

      toast.success('Application submitted', {
        description: 'Your application is now with the centre for review.',
      })
      triggerFirstTimeConfetti('parent-first-application', 'application')
      toast.message('Privacy note', {
        description: 'You can apply to more than one centre. Your details remain private.',
      })
      router.push('/parent/dashboard')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="child">Select Child</Label>
        <select
          id="child"
          value={activeChildId}
          onChange={(e) => onChildSelect(e.target.value)}
          className="cc-native-field"
        >
          <option value="" disabled>
            Choose a child profile
          </option>
          {childProfiles.map((child) => (
            <option key={child.id} value={child.id}>
              {child.first_name} {child.last_name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message to Centre (optional)</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Share anything important about your child's application"
        />
      </div>

      <label
        htmlFor="share-multiple-flag"
        className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
      >
        <input
          id="share-multiple-flag"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300"
          checked={shareMultipleFlag}
          onChange={(e) => setShareMultipleFlag(e.target.checked)}
        />
        <span className="text-sm text-slate-700">
          Let the centre know I&apos;m applying to more than one centre to improve my chances.
        </span>
      </label>
      <p className="text-xs text-slate-500">You can apply to more than one centre. Your details remain private.</p>

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Application'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/c/${centreSlug}`)}>
          Back
        </Button>
      </div>
    </form>
  )
}
