'use client'

import {
  CheckCircle2,
  Clock3,
  ListOrdered,
  PartyPopper,
  Search,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

export type AppStatus = 'submitted' | 'in_review' | 'approved' | 'enrolled' | 'waitlisted' | 'rejected' | 'withdrawn'

export interface TimelineEvent {
  status: AppStatus
  created_at: string
  notes?: string
}

interface ApplicationTimelineProps {
  currentStatus: AppStatus
  history: TimelineEvent[]
  centreName: string
  childName: string
  applicationNumber: string
}

type StatusConfig = {
  label: string
  description: string
  icon: LucideIcon
  iconTone: string
  surfaceTone: string
}

const STATUS_CONFIG: Record<AppStatus, StatusConfig> = {
  submitted: {
    label: 'Application submitted',
    description: 'Your application has been received by the centre.',
    icon: CheckCircle2,
    iconTone: 'text-blue-600',
    surfaceTone: 'border-blue-200 bg-blue-50',
  },
  in_review: {
    label: 'In review',
    description: 'The centre is currently reviewing your submission.',
    icon: Search,
    iconTone: 'text-amber-700',
    surfaceTone: 'border-amber-200 bg-amber-50',
  },
  approved: {
    label: 'Approved',
    description: 'Great news. Your child has been accepted.',
    icon: PartyPopper,
    iconTone: 'text-emerald-700',
    surfaceTone: 'border-emerald-200 bg-emerald-50',
  },
  enrolled: {
    label: 'Enrolled',
    description: 'Enrollment is confirmed for this centre.',
    icon: PartyPopper,
    iconTone: 'text-emerald-700',
    surfaceTone: 'border-emerald-200 bg-emerald-50',
  },
  waitlisted: {
    label: 'Waitlisted',
    description: 'The application is on a waitlist pending availability.',
    icon: ListOrdered,
    iconTone: 'text-violet-700',
    surfaceTone: 'border-violet-200 bg-violet-50',
  },
  rejected: {
    label: 'Unsuccessful',
    description: 'This application was not accepted by the centre.',
    icon: XCircle,
    iconTone: 'text-rose-700',
    surfaceTone: 'border-rose-200 bg-rose-50',
  },
  withdrawn: {
    label: 'Withdrawn',
    description: 'This application was withdrawn.',
    icon: XCircle,
    iconTone: 'text-slate-600',
    surfaceTone: 'border-slate-200 bg-slate-50',
  },
}

const FLOW: AppStatus[] = ['submitted', 'in_review', 'approved', 'enrolled']

function flowLabel(status: AppStatus) {
  if (status === 'submitted') return 'Sent'
  if (status === 'in_review') return 'Review'
  if (status === 'approved') return 'Approved'
  return 'Enrolled'
}

export default function ApplicationTimeline({
  currentStatus,
  history,
  centreName,
  childName,
  applicationNumber,
}: ApplicationTimelineProps) {
  const config = STATUS_CONFIG[currentStatus]
  const CurrentIcon = config.icon
  const isTerminal = currentStatus === 'rejected' || currentStatus === 'withdrawn'
  const isWaitlisted = currentStatus === 'waitlisted'
  const currentFlowIndex = FLOW.indexOf(currentStatus)

  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <section className={cn('rounded-2xl border p-4', config.surfaceTone)}>
        <div className="flex items-start gap-3">
          <div className={cn('mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white', config.iconTone)}>
            <CurrentIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className={cn('text-sm font-semibold', config.iconTone)}>{config.label}</p>
            <p className="mt-1 text-sm text-slate-600">{config.description}</p>
            <p className="mt-2 text-xs text-slate-500">
              {childName} - {centreName}
            </p>
          </div>
        </div>
      </section>

      {!isTerminal && !isWaitlisted ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-4 items-start gap-2">
            {FLOW.map((step, index) => {
              const reached = currentFlowIndex >= index
              const isCurrent = currentFlowIndex === index
              return (
                <div key={step} className="flex flex-col items-center gap-2 text-center">
                  <div className="relative flex w-full items-center justify-center">
                    {index > 0 ? (
                      <span
                        className={cn(
                          'absolute left-0 right-1/2 top-1/2 h-0.5 -translate-y-1/2',
                          reached ? 'bg-cyan-500' : 'bg-slate-200'
                        )}
                      />
                    ) : null}
                    <span
                      className={cn(
                        'relative z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold',
                        reached
                          ? 'border-cyan-500 bg-cyan-500 text-white'
                          : 'border-slate-300 bg-slate-100 text-slate-500',
                        isCurrent ? 'ring-2 ring-cyan-200 ring-offset-2 ring-offset-white' : ''
                      )}
                    >
                      {reached ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                  </div>
                  <p className={cn('text-[11px] font-medium', reached ? 'text-slate-800' : 'text-slate-400')}>
                    {flowLabel(step)}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Activity</p>
        <div className="mt-3 flex flex-col gap-3">
          {sortedHistory.map((event, index) => {
            const eventConfig = STATUS_CONFIG[event.status]
            return (
              <article key={`${event.created_at}-${event.status}-${index}`} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div className={cn('mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full', eventConfig.surfaceTone)}>
                  <Clock3 className={cn('h-3 w-3', eventConfig.iconTone)} />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold', eventConfig.iconTone)}>{eventConfig.label}</p>
                  <p className="text-xs text-slate-500">{formatDate(event.created_at)}</p>
                  {event.notes ? (
                    <p className="mt-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">{event.notes}</p>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <p className="text-center text-[11px] text-slate-400">Ref: {applicationNumber}</p>
    </div>
  )
}

