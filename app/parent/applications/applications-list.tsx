'use client'

import Link from 'next/link'
import { ChevronRight, Compass, Map } from 'lucide-react'
import { ApprovalActions } from './approval-actions'
import { ApprovalReceivedToast } from './approval-received-toast'
import { cn, formatDate } from '@/lib/utils'

type ApplicationItem = {
  id: string
  application_number: string
  status: string
  offer_made_at: string | null
  offer_accepted_at: string | null
  priority: number | null
  submitted_at: string
  centreName: string
  centreSlug: string | null
  childName: string
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    submitted: {
      label: 'Submitted',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    in_review: {
      label: 'In Review',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    pending_review: {
      label: 'In Review',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    approved: {
      label: 'Approved',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    enrolled: {
      label: 'Enrolled',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    provisioned: {
      label: 'Enrolled',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    waitlisted: {
      label: 'Waitlisted',
      className: 'bg-slate-50 text-slate-600 border-slate-200',
    },
    rejected: {
      label: 'Unsuccessful',
      className: 'bg-red-50 text-red-600 border-red-200',
    },
    withdrawn: {
      label: 'Withdrawn',
      className: 'bg-slate-50 text-slate-400 border-slate-200',
    },
  }

  const c = config[status] ?? {
    label: status,
    className: 'bg-slate-50 text-slate-500 border-slate-200',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1',
        'border text-xs font-semibold',
        c.className
      )}
    >
      {c.label}
    </span>
  )
}

export function ApplicationsList({ applications }: { applications: ApplicationItem[] }) {
  const pendingApprovalIds = applications
    .filter((application) => application.status === 'approved' && !application.offer_accepted_at)
    .map((application) => application.id)

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-50">
          <Map className="h-8 w-8 text-cyan-400" />
        </div>
        <p className="mb-1 font-semibold text-slate-700">
          No applications yet
        </p>
        <p className="mb-6 max-w-xs text-sm text-slate-400">
          Browse centres and submit your first application.
          It only takes a few minutes.
        </p>
        <Link
          href="/directory"
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-cyan-700"
        >
          <Compass className="h-4 w-4" />
          Find a Centre
        </Link>
      </div>
    )
  }

  return (
    <>
      <ApprovalReceivedToast approvalIds={pendingApprovalIds} />
      <div className="space-y-3">
        {applications.map((application) => (
          <div key={application.id} className="space-y-2">
            <Link
              href={`/parent/applications/${application.id}`}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-cyan-300 hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                  {application.centreName}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {application.childName}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Applied {formatDate(application.submitted_at)}
                </p>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <StatusPill status={application.status} />
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </Link>

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
          </div>
        ))}
      </div>
    </>
  )
}

