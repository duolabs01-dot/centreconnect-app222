'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { buildWarmApplicationUpdateMessage } from '@/lib/communications/templates'

type PipelineStatus = 'submitted' | 'in_review' | 'waitlisted' | 'approved' | 'rejected'

type ApplicationRow = {
  id: string
  application_number: string
  status: PipelineStatus
  submitted_at: string
  offer_made_at: string | null
  parent_message: string | null
  admin_notes: string | null
  children:
    | { first_name: string; last_name: string }
    | Array<{ first_name: string; last_name: string }>
    | null
  parents:
    | {
        id: string
        alt_phone: string | null
        user_profiles:
          | { full_name: string | null; phone: string | null }
          | Array<{ full_name: string | null; phone: string | null }>
          | null
      }
    | Array<{
        id: string
        alt_phone: string | null
        user_profiles:
          | { full_name: string | null; phone: string | null }
          | Array<{ full_name: string | null; phone: string | null }>
          | null
      }>
    | null
}

type PipelineBoardProps = {
  ecdId: string
  centreName: string
  initialApplications: ApplicationRow[]
}

const COLUMNS: Array<{
  key: PipelineStatus
  label: string
  shortLabel: string
  helpText: string
  accentColor: string
  dropRing: string
  pipelineClass: string
}> = [
  {
    key: 'submitted',
    label: '1. New',
    shortLabel: 'New',
    helpText: 'Just arrived',
    accentColor: '#06b6d4',
    dropRing: 'ring-blue-400',
    pipelineClass: 'pipeline-col-new',
  },
  {
    key: 'in_review',
    label: '2. Checking',
    shortLabel: 'Checking',
    helpText: 'Reviewing docs',
    accentColor: '#22d3ee',
    dropRing: 'ring-cyan-400',
    pipelineClass: 'pipeline-col-review',
  },
  {
    key: 'waitlisted',
    label: '3. Waiting List',
    shortLabel: 'Waitlist',
    helpText: 'Queued for spot',
    accentColor: '#f97316',
    dropRing: 'ring-amber-400',
    pipelineClass: 'pipeline-col-waitlisted',
  },
  {
    key: 'approved',
    label: '4. Offer Sent',
    shortLabel: 'Offer Sent',
    helpText: 'Offer issued',
    accentColor: '#22c55e',
    dropRing: 'ring-emerald-400',
    pipelineClass: 'pipeline-col-approved',
  },
  {
    key: 'rejected',
    label: '5. Not Moving Forward',
    shortLabel: 'Closed',
    helpText: 'Application closed',
    accentColor: '#ef4444',
    dropRing: 'ring-rose-400',
    pipelineClass: 'pipeline-col-rejected',
  },
]

const TIPS = [
  'Tip: Drag cards one stage at a time for cleaner records.',
  'Tip: Add short notes before moving cards so staff see context.',
  'Tip: Use Offer Sent only after an offer is actually issued.',
  'Tip: Waitlist cards can still be moved fast when spaces open.',
  'Tip: Open the application first when details are unclear.',
]

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function routeToken(value: string | null | undefined) {
  const normalized = value?.trim()
  if (!normalized) return null
  if (normalized === 'undefined' || normalized === 'null') return null
  return encodeURIComponent(normalized)
}

function applicationDetailsHref(application: Pick<ApplicationRow, 'id' | 'application_number'>) {
  const idToken = routeToken(application.id)
  if (idToken) return `/ecd/applications/${idToken}`

  const numberToken = routeToken(application.application_number)
  if (numberToken) return `/ecd/applications/${numberToken}?lookup=number`

  return '/ecd/applications'
}

function buildWhatsAppLink(rawPhone: string | null | undefined, message: string) {
  if (!rawPhone) return null
  const digits = rawPhone.replace(/[^\d]/g, '')
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

function transitionHint(from: PipelineStatus, to: PipelineStatus) {
  if (from === 'submitted' && to === 'rejected') {
    return 'Were you trying to review first? You can move to "Checking" to keep the journey clearer.'
  }
  if (from === 'waitlisted' && to === 'rejected') {
    return 'Were you trying to keep this child on hold? You can leave them in "Waiting List".'
  }
  return null
}

export function PipelineBoard({ ecdId, centreName, initialApplications }: PipelineBoardProps) {
  const supabase = createClient()
  const router = useRouter()
  const [applications, setApplications] = useState(initialApplications)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<PipelineStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const [tip, setTip] = useState(TIPS[0])
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const previous = Number.parseInt(localStorage.getItem('ecd_pipeline_tip_idx') ?? '-1', 10)
    const next = Number.isFinite(previous) ? (previous + 1) % TIPS.length : Math.floor(Math.random() * TIPS.length)
    localStorage.setItem('ecd_pipeline_tip_idx', String(next))
    setTip(TIPS[next])
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel(`pipeline-live-${ecdId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'applications', filter: `ecd_id=eq.${ecdId}` },
        (payload) => {
          const next = payload.new as { id?: string; status?: PipelineStatus; offer_made_at?: string | null }
          if (!next?.id || !next.status) return
          const nextStatus = next.status
          setApplications((current) =>
            current.map((item) =>
              item.id === next.id
                ? { ...item, status: nextStatus, offer_made_at: next.offer_made_at ?? item.offer_made_at }
                : item
            )
          )
        }
      )
      .subscribe()

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'ecd_pipeline_refresh') {
        router.refresh()
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      void supabase.removeChannel(channel)
      window.removeEventListener('storage', onStorage)
    }
  }, [ecdId, router, supabase])

  const grouped = useMemo(
    () =>
      COLUMNS.map((column) => ({
        ...column,
        items: applications.filter((application) => application.status === column.key),
      })),
    [applications]
  )
  const totalItems = applications.length

  async function persistStatusChange(applicationId: string, toStatus: PipelineStatus, forceOfferStamp: boolean) {
    const application = applications.find((item) => item.id === applicationId)
    if (!application || application.status === toStatus) return

    const oldStatus = application.status
    const hint = transitionHint(oldStatus, toStatus)
    if (hint) toast(hint)

    setSaving(true)
    setApplications((current) =>
      current.map((item) =>
        item.id === applicationId
          ? {
              ...item,
              status: toStatus,
              offer_made_at: toStatus === 'approved' && forceOfferStamp ? new Date().toISOString() : item.offer_made_at,
            }
          : item
      )
    )

    try {
      const now = new Date().toISOString()
      const payload: Record<string, string | null> = { status: toStatus }

      if (toStatus !== oldStatus) {
        payload.reviewed_at = now
        if (['approved', 'waitlisted', 'rejected', 'withdrawn'].includes(toStatus)) payload.decided_at = now
        if (toStatus === 'approved') {
          if (forceOfferStamp || !application.offer_made_at) payload.offer_made_at = now
          payload.withdrawn_at = null
          payload.withdraw_reason = null
        }
      }

      const { error: updateError } = await supabase
        .from('applications')
        .update(payload)
        .eq('id', applicationId)
        .eq('ecd_id', ecdId)
      if (updateError) throw updateError

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error: historyError } = await supabase.from('application_status_history').insert({
        application_id: applicationId,
        old_status: oldStatus,
        new_status: toStatus,
        changed_by: user?.id ?? null,
        notes: application.admin_notes ?? null,
        ecd_id: ecdId,
      })
      if (historyError) throw historyError

      if (toStatus !== oldStatus) {
        const parent = normalizeOne(application.parents)
        const parentProfile = normalizeOne(parent?.user_profiles ?? null)
        const child = normalizeOne(application.children)
        const childName = child ? `${child.first_name} ${child.last_name}` : 'your child'
        const parentName = parentProfile?.full_name ?? 'Parent'

        if (parent?.id) {
          let title = 'Application Update'
          const message = buildWarmApplicationUpdateMessage({
            centreName,
            childName,
            parentName,
            applicationNumber: application.application_number,
            status: toStatus,
          })

          if (toStatus === 'approved') {
            title = 'Application approved 🎉'
          } else if (toStatus === 'waitlisted') {
            title = 'Joined the Waiting List'
          } else if (toStatus === 'rejected') {
            title = 'Application Status'
          }

          await supabase.from('parent_notifications').insert({
            parent_id: parent.id,
            ecd_id: ecdId,
            application_id: applicationId,
            title,
            message,
          })
        }
      }

      localStorage.setItem('ecd_pipeline_refresh', `${Date.now()}`)
      router.refresh()
      toast.success('Stage updated')
    } catch (error: any) {
      setApplications((current) =>
        current.map((item) => (item.id === applicationId ? { ...item, status: oldStatus } : item))
      )
      toast.error(error?.message || 'Failed to move application')
    } finally {
      setSaving(false)
      setDropTarget(null)
    }
  }

  async function handleDrop(applicationId: string, toStatus: PipelineStatus) {
    const application = applications.find((item) => item.id === applicationId)
    if (!application) return
    if (toStatus === 'approved' && !application.offer_made_at) {
      const confirm = window.confirm(
        'No offer has been sent for this child yet. Mark offer as sent now and move to "Offer Sent"?'
      )
      if (!confirm) {
        toast('Were you trying to send an offer first? Open the application to send details.')
        return
      }
      await persistStatusChange(applicationId, toStatus, true)
      return
    }
    await persistStatusChange(applicationId, toStatus, false)
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-gradient-to-r from-cyan-50/80 via-white/80 to-emerald-50/80 p-4 text-foreground">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Application Journey (Pipeline)</p>
          <p className="rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-semibold text-cyan-600">
            {tip}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {grouped.map((column) => {
            const count = column.items.length
            const pct = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0
            return (
              <div
                key={`summary-${column.key}`}
                className="glass-card rounded-2xl border border-border px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {column.shortLabel}
                  </p>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: column.accentColor }}
                  >
                    {column.label}
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black text-foreground">{count}</p>
                <p className="text-xs text-muted-foreground">{pct}% of pipeline</p>
                <div className="mt-3 h-1 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${column.accentColor}, ${column.accentColor} 70%, rgba(255,255,255,0))`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {!isMobile ? (
        <section className="overflow-x-auto" id="pipeline-board">
          <div className="grid min-w-[1200px] grid-cols-5 gap-4">
            {grouped.map((column) => (
              <Card
                key={column.key}
                className={`pipeline-card glass-card border border-border bg-card/90 ${column.pipelineClass} ${
                  dropTarget === column.key ? `ring-2 ${column.dropRing}` : ''
                }`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDropTarget(column.key)
                }}
                onDragLeave={() => setDropTarget((current) => (current === column.key ? null : current))}
                onDrop={(event) => {
                  event.preventDefault()
                  const appId = event.dataTransfer.getData('text/application-id') || draggingId
                  if (!appId || saving) return
                  setDraggingId(null)
                  void handleDrop(appId, column.key)
                }}
              >
                <CardHeader className="pipeline-column-header pb-3">
                  <CardTitle className="text-base font-bold text-foreground">
                    {column.label}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">({column.items.length})</span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{column.helpText}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {column.items.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border bg-card/80 p-3 text-xs text-muted-foreground">
                      No children in this stage.
                    </div>
                  ) : (
                    column.items.map((application) => {
                      const child = normalizeOne(application.children)
                      const parent = normalizeOne(application.parents)
                      const parentProfile = normalizeOne(parent?.user_profiles ?? null)
                      const parentPhone = parentProfile?.phone ?? parent?.alt_phone ?? null
                      const requestDocHref = buildWhatsAppLink(
                        parentPhone,
                        `Hello, please share outstanding documents for application ${application.application_number}.`
                      )

                      return (
                        <div
                          key={application.id}
                          className={`pipeline-item cursor-grab rounded-2xl border border-border bg-card/90 p-3 active:cursor-grabbing ${draggingId === application.id ? 'dragging' : ''}`}
                          draggable={!saving}
                          onDragStart={(event) => {
                            setDraggingId(application.id)
                            event.dataTransfer.setData('text/application-id', application.id)
                            event.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragEnd={() => {
                            setDraggingId(null)
                            setDropTarget(null)
                          }}
                        >
                          <p className="text-sm font-semibold text-foreground">
                            {child ? `${child.first_name} ${child.last_name}` : application.application_number}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {application.application_number} | {formatDate(application.submitted_at)}
                          </p>
                          {application.admin_notes ? (
                            <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                              Notes: {application.admin_notes}
                            </p>
                          ) : (
                            <p className="mt-2 text-xs text-muted-foreground">No notes yet.</p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={applicationDetailsHref(application)} prefetch={false}>Open</Link>
                            </Button>
                            {requestDocHref ? (
                              <Button size="sm" variant="outline" asChild>
                                <a href={requestDocHref} target="_blank" rel="noreferrer">
                                  Request document
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {applications.map((application) => {
            const child = normalizeOne(application.children)
            const parent = normalizeOne(application.parents)
            const parentProfile = normalizeOne(parent?.user_profiles ?? null)
            const parentPhone = parentProfile?.phone ?? parent?.alt_phone ?? null
            const requestDocHref = buildWhatsAppLink(
              parentPhone,
              `Hello, please share outstanding documents for application ${application.application_number}.`
            )
            const columnInfo = COLUMNS.find(col => col.key === application.status);

            return (
              <Card key={application.id} className="glass-card border border-border bg-card/90 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {child ? `${child.first_name} ${child.last_name}` : application.application_number}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {application.application_number} | {formatDate(application.submitted_at)}
                    </p>
                    {application.admin_notes ? (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        Notes: {application.admin_notes}
                      </p>
                    ) : null}
                  </div>
                  <div
                    className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ backgroundColor: `${columnInfo?.accentColor}20`, color: columnInfo?.accentColor }}
                  >
                    {columnInfo?.shortLabel}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={applicationDetailsHref(application)} prefetch={false}>Open</Link>
                  </Button>
                  {requestDocHref ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href={requestDocHref} target="_blank" rel="noreferrer">
                        Request document
                      </a>
                    </Button>
                  ) : null}
                  <Select
                    value={application.status}
                    onValueChange={(newStatus: PipelineStatus) => void handleDrop(application.id, newStatus)}
                    disabled={saving}
                  >
                    <SelectTrigger className="w-[120px] h-9 text-xs">
                      <SelectValue placeholder="Move to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMNS.map((col) => (
                        <SelectItem key={col.key} value={col.key}>
                          Move to {col.shortLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            )
          })}
        </section>
      )}
    </section>
  )
}
