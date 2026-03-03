'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronRight, Compass, Map } from 'lucide-react'
import { toast } from 'sonner'
import ApplicationTimeline, { type AppStatus, type TimelineEvent } from '@/components/parent/ApplicationTimeline'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ApprovalActions } from './approval-actions'
import { ApprovalReceivedToast } from './approval-received-toast'
import { cn, formatDate } from '@/lib/utils'
import { useBottomNav } from '@/lib/context/BottomNavProvider'
import { createClient } from '@/lib/supabase/client'

type ApplicationItem = {
  id: string
  application_number: string
  status: string
  offer_made_at: string | null
  offer_accepted_at: string | null
  priority: number | null
  submitted_at: string
  updated_at: string | null
  centreName: string
  centreSlug: string | null
  centreLogoUrl: string | null
  centreLocation: string
  childName: string
  missingDocuments: string[]
  history: Array<{
    status: string
    created_at: string
    notes?: string
  }>
}

function normalizeStatus(status: string): AppStatus {
  if (
    status === 'submitted' ||
    status === 'in_review' ||
    status === 'approved' ||
    status === 'enrolled' ||
    status === 'waitlisted' ||
    status === 'rejected' ||
    status === 'withdrawn'
  ) {
    return status
  }
  if (status === 'draft' || status === 'partial') return 'submitted'
  if (status === 'pending_review') return 'in_review'
  if (status === 'provisioned') return 'enrolled'
  return 'submitted'
}

function cardStatusConfig(status: string) {
  const normalized = normalizeStatus(status)
  if (normalized === 'approved' || normalized === 'enrolled') {
    return {
      label: 'Approved',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }
  }
  if (normalized === 'rejected' || normalized === 'withdrawn') {
    return {
      label: 'Rejected',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
    }
  }
  return {
    label: status === 'partial' ? 'Partial' : 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  }
}

function ApplicationCard({
  application,
  onOpen,
}: {
  application: ApplicationItem
  onOpen: (applicationId: string) => void
}) {
  const statusConfig = cardStatusConfig(application.status)
  const updatedAt = application.updated_at ?? application.submitted_at

  return (
    <button
      type="button"
      onClick={() => onOpen(application.id)}
      className="group glass-card w-full rounded-2xl border border-slate-200 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-[var(--shadow-elevation-3)] active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
            {application.centreLogoUrl ? (
              <Image
                src={application.centreLogoUrl}
                alt={`${application.centreName} logo`}
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold text-cyan-700">{application.centreName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{application.centreName}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {application.centreLocation} | {application.childName} - Applied {formatDate(application.submitted_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
            statusConfig.className
          )}
        >
          {statusConfig.label}
        </span>
        <p className="text-xs text-slate-500">Updated: {formatDate(updatedAt)}</p>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-slate-500 transition-colors group-hover:text-cyan-700">
        <span>View Timeline</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  )
}

function TimelinePanel({ application }: { application: ApplicationItem }) {
  const normalizedStatus = normalizeStatus(application.status)
  const timelineHistory: TimelineEvent[] =
    application.history.length > 0
      ? application.history.map((item) => ({
          status: normalizeStatus(item.status),
          created_at: item.created_at,
          notes: item.notes,
        }))
      : [{ status: normalizedStatus, created_at: application.submitted_at }]

  return (
    <div className="space-y-3">
      <div className="px-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">Application Timeline</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">{application.centreName}</h3>
        <p className="text-sm text-slate-600">{application.centreLocation}</p>
        <p className="text-sm text-slate-600">{application.childName}</p>
      </div>
      <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
        <ApplicationTimeline
          currentStatus={normalizedStatus}
          history={timelineHistory}
          centreName={application.centreName}
          childName={application.childName}
          applicationNumber={application.application_number}
        />
      </div>
    </div>
  )
}

export function ApplicationsList({
  applications,
  parentId,
}: {
  applications: ApplicationItem[]
  parentId: string
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [activeApplicationId, setActiveApplicationId] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [applicationItems, setApplicationItems] = useState(applications)
  const { setVisible } = useBottomNav()
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const knownApplicationIdsRef = useRef<Set<string>>(new Set(applications.map((application) => application.id)))

  useEffect(() => {
    setApplicationItems(applications)
  }, [applications])

  useEffect(() => {
    knownApplicationIdsRef.current = new Set(applicationItems.map((application) => application.id))
  }, [applicationItems])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const sync = () => setIsDesktop(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (activeApplicationId && !isDesktop) {
      setVisible(false)
    } else {
      setVisible(true)
    }
    return () => setVisible(true)
  }, [activeApplicationId, isDesktop, setVisible])

  useEffect(() => {
    if (!parentId) return

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) return
      refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null
        router.refresh()
      }, 350)
    }

    const channel = supabase
      .channel(`parent-applications-live-${parentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications', filter: `parent_id=eq.${parentId}` },
        (payload) => {
          const nextRow = payload.new as {
            id?: string
            status?: string
            offer_accepted_at?: string | null
            missing_documents?: unknown
          }
          if (!nextRow.id || !knownApplicationIdsRef.current.has(nextRow.id)) return

          setApplicationItems((current) =>
            current.map((application) => {
              if (application.id !== nextRow.id) return application
              return {
                ...application,
                status: nextRow.status ?? application.status,
                offer_accepted_at:
                  nextRow.offer_accepted_at === undefined ? application.offer_accepted_at : nextRow.offer_accepted_at,
                missingDocuments: Array.isArray(nextRow.missing_documents)
                  ? nextRow.missing_documents.map((entry) => String(entry).trim()).filter(Boolean)
                  : application.missingDocuments,
              }
            })
          )
          scheduleRefresh()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'application_status_history' },
        (payload) => {
          const nextHistory = payload.new as { application_id?: string; new_status?: string }
          if (!nextHistory.application_id || !knownApplicationIdsRef.current.has(nextHistory.application_id)) return
          if (nextHistory.new_status) {
            toast.success(`✨ Update: your application is now "${String(nextHistory.new_status).replaceAll('_', ' ')}"`)
          }
          scheduleRefresh()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'parent_notifications', filter: `parent_id=eq.${parentId}` },
        (payload) => {
          const nextNotification = payload.new as {
            application_id?: string | null
            title?: string
            message?: string
          }
          if (!nextNotification.application_id) return
          if (!knownApplicationIdsRef.current.has(nextNotification.application_id)) return

          toast(nextNotification.title ?? 'New crèche update', {
            description: nextNotification.message ?? 'Tap into your Application Journey for details.',
          })
          scheduleRefresh()
        }
      )
      .subscribe()

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
      void supabase.removeChannel(channel)
    }
  }, [parentId, router, supabase])

  const pendingApprovalIds = applicationItems
    .filter((application) => application.status === 'approved' && !application.offer_accepted_at)
    .map((application) => application.id)
  const incompleteApplications = applicationItems.filter(
    (application) =>
      application.status === 'partial' ||
      (['submitted', 'in_review'].includes(application.status) && application.missingDocuments.length > 0)
  )

  const activeApplication = useMemo(
    () => applicationItems.find((application) => application.id === activeApplicationId) ?? null,
    [activeApplicationId, applicationItems]
  )

  if (applicationItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-50">
          <Map className="h-8 w-8 text-cyan-400" />
        </div>
        <p className="mb-1 font-semibold text-slate-700">
          No applications yet
        </p>
        <p className="mb-6 max-w-xs text-sm text-slate-400">
          Browse crèches and submit your first application.
          It only takes a few minutes.
        </p>
        <Link
          href="/directory"
          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-cyan-700"
        >
          <Compass className="h-4 w-4" />
          Find a Crèche
        </Link>
      </div>
    )
  }

  return (
    <>
      <ApprovalReceivedToast approvalIds={pendingApprovalIds} />

      {incompleteApplications.length > 0 ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">
            You&apos;re close! {incompleteApplications.length} application{incompleteApplications.length === 1 ? '' : 's'} still need a few documents 📄
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Upload now and we&apos;ll instantly notify the crèche team 🎉
          </p>
          <Link
            href="/parent/profile/documents"
            className="mt-3 inline-flex min-h-[40px] items-center rounded-2xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
          >
            Upload missing documents
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {applicationItems.map((application) => (
          <div key={application.id} className="space-y-2">
            <ApplicationCard application={application} onOpen={setActiveApplicationId} />

            {application.status === 'approved' && !application.offer_accepted_at ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                <ApprovalActions applicationId={application.id} />
              </div>
            ) : null}

            {application.status === 'waitlisted' ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Waitlist position: #{application.priority ?? '-'}
              </div>
            ) : null}

            {normalizeStatus(application.status) === 'enrolled' ? (
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2">
                <Link
                  href={`/parent/applications/${application.id}#pickup-code-section`}
                  className="inline-flex min-h-[36px] items-center rounded-2xl border border-cyan-300 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
                >
                  Open Pickup Code
                </Link>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {isDesktop ? (
        <Dialog open={Boolean(activeApplication)} onOpenChange={(open) => (!open ? setActiveApplicationId(null) : null)}>
          <DialogContent className="glass-modal max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
            <DialogHeader className="sr-only">
              <DialogTitle>Application timeline</DialogTitle>
              <DialogDescription>Detailed timeline for the selected application.</DialogDescription>
            </DialogHeader>
            {activeApplication ? <TimelinePanel application={activeApplication} /> : null}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={Boolean(activeApplication)} onOpenChange={(open) => (!open ? setActiveApplicationId(null) : null)}>
          <SheetContent
            side="bottom"
            className="glass-modal max-h-[88vh] overflow-y-auto rounded-t-[24px] border border-slate-200 bg-white px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-5"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Application timeline</SheetTitle>
              <SheetDescription>Detailed timeline for the selected application.</SheetDescription>
            </SheetHeader>
            {activeApplication ? <TimelinePanel application={activeApplication} /> : null}
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}



