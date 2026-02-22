'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ApprovalActions } from './approval-actions'
import { ApprovalReceivedToast } from './approval-received-toast'
import { StatusBadge } from '@/src/components/ui/StatusBadge'
import { Stepper } from '@/src/components/ui/Stepper'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'

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

export function ApplicationsList({ applications }: { applications: ApplicationItem[] }) {
  const pendingApprovalIds = applications
    .filter((application) => application.status === 'approved' && !application.offer_accepted_at)
    .map((application) => application.id)

  if (applications.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState
          title="No applications yet"
          description="Start by adding a child profile, then apply to 2-3 centres for faster placement options."
          actionLabel="Add Child Profile"
          actionHref="/parent/children/new"
        />
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Then do this next</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link href="/directory">Browse Centres</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/parent/preferences">Set Preferences</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <ApprovalReceivedToast approvalIds={pendingApprovalIds} />
      {applications.map((application) => (
        <div key={application.id}>
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{application.childName}</CardTitle>
              <p className="text-sm text-slate-600">
                {application.centreName} - {formatDate(application.submitted_at)}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <StatusBadge status={application.status} />
                  <Stepper status={application.status} />
                  {application.status === 'waitlisted' ? (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Waitlist position: #{application.priority ?? '-'}</span>
                      <p className="text-gray-600">Average wait time: 2-4 weeks</p>
                    </div>
                  ) : null}
                  {application.status === 'approved' && !application.offer_accepted_at ? (
                    <ApprovalActions applicationId={application.id} />
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" asChild>
                    <Link href={`/parent/applications/${application.id}`}>Open</Link>
                  </Button>
                  {application.centreSlug ? (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/centre/${application.centreSlug}`}>View Centre</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </>
  )
}
