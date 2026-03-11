import Link from 'next/link'
import { Download, FileText, MessageSquare, Phone, ShieldCheck, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import type { ParentDossier } from '@/lib/ecd/parent-dossier'

function formatEventDate(value: string | null | undefined) {
  return value ? formatDate(value) : 'Not yet'
}

function verificationLabel(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return null
  if (normalized === 'verified') return 'Verified'
  return normalized.replaceAll('_', ' ')
}

type ParentDossierCardsProps = {
  dossier: ParentDossier
  communicationsHref?: string | null
}

export function ParentDossierCards({ dossier, communicationsHref = null }: ParentDossierCardsProps) {
  const verification = verificationLabel(dossier.primaryParent.verificationStatus)
  const canCall = Boolean(dossier.primaryParent.phone || dossier.primaryParent.alternatePhone)
  const primaryPhone = dossier.primaryParent.phone || dossier.primaryParent.alternatePhone || null

  return (
    <div className="space-y-5">
      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base text-slate-900">
              <Phone className="h-4 w-4 text-teal-600" />
              Primary parent
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-cyan-700">
                {dossier.sourceLabel}
              </span>
              {verification ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  {verification}
                </span>
              ) : null}
            </div>
          </div>
          <p className="text-sm leading-6 text-slate-600">{dossier.sourceDescription}</p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <div className="grid gap-2 sm:grid-cols-2">
            <p><span className="font-semibold text-slate-900">Name:</span> {dossier.primaryParent.fullName}</p>
            <p><span className="font-semibold text-slate-900">Phone:</span> {primaryPhone || 'Not shared yet'}</p>
            <p><span className="font-semibold text-slate-900">Billing email:</span> {dossier.primaryParent.billingEmail || 'Not shared yet'}</p>
            <p><span className="font-semibold text-slate-900">Relationship:</span> {dossier.primaryParent.relationship || 'Not shared yet'}</p>
            <p className="sm:col-span-2"><span className="font-semibold text-slate-900">Address:</span> {dossier.primaryParent.address || 'Not shared yet'}</p>
            <p><span className="font-semibold text-slate-900">Emergency contact:</span> {dossier.primaryParent.emergencyContactName || 'Not shared yet'}</p>
            <p><span className="font-semibold text-slate-900">Emergency phone:</span> {dossier.primaryParent.emergencyContactPhone || 'Not shared yet'}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canCall ? (
              <Button asChild variant="outline" className="h-10 rounded-2xl">
                <a href={`tel:${primaryPhone}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call parent
                </a>
              </Button>
            ) : (
              <Button variant="outline" className="h-10 rounded-2xl" disabled>
                <Phone className="mr-2 h-4 w-4" />
                Call parent
              </Button>
            )}
            {communicationsHref ? (
              <Button asChild variant="outline" className="h-10 rounded-2xl">
                <Link href={communicationsHref} prefetch={false}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send message
                </Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-slate-900">
            <Users className="h-4 w-4 text-teal-600" />
            Co-parent and caregiver links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dossier.coParents.length === 0 ? (
            <p className="text-sm text-slate-600">No co-parent records linked to this child yet.</p>
          ) : (
            <ul className="space-y-3">
              {dossier.coParents.map((guardian) => (
                <li key={guardian.id} className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{guardian.fullName}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {(guardian.relationship || 'Co-parent') + (guardian.phone ? ` | ${guardian.phone}` : '')}
                      </p>
                      {guardian.email ? (
                        <p className="mt-1 text-xs text-slate-500">{guardian.email}</p>
                      ) : null}
                    </div>
                    <span className={guardian.status === 'linked'
                      ? 'rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700'
                      : 'rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700'}>
                      {guardian.status === 'linked' ? 'Linked' : 'Pending'}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <p><span className="font-semibold text-slate-800">Sent:</span> {formatEventDate(guardian.timeline.sentAt)}</p>
                    <p><span className="font-semibold text-slate-800">Viewed:</span> {formatEventDate(guardian.timeline.viewedAt)}</p>
                    <p><span className="font-semibold text-slate-800">Clicked:</span> {formatEventDate(guardian.timeline.clickedAt)}</p>
                    <p><span className="font-semibold text-slate-800">Registered:</span> {formatEventDate(guardian.timeline.registeredAt)}</p>
                    <p><span className="font-semibold text-slate-800">Claimed:</span> {formatEventDate(guardian.timeline.claimedAt)}</p>
                    <p><span className="font-semibold text-slate-800">Expires:</span> {formatEventDate(guardian.timeline.expiresAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-slate-900">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            Relevant shared documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dossier.warnings.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              {dossier.warnings.join(' ')}
            </div>
          ) : null}

          {dossier.documents.length === 0 ? (
            <p className="text-sm text-slate-600">No admissions or enrolment documents have been shared from the parent profile yet.</p>
          ) : (
            <ul className="space-y-2">
              {dossier.documents.map((document) => (
                <li key={document.id} className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{document.label}</p>
                      <p className="mt-1 text-xs text-slate-600">{document.fileName}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>{formatDate(document.createdAt)}</span>
                        {document.verificationStatus ? <span>• {document.verificationStatus.replaceAll('_', ' ')}</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" className="h-9 rounded-2xl px-3 text-xs">
                        <a href={document.href} target="_blank" rel="noreferrer">
                          <FileText className="mr-2 h-3.5 w-3.5" />
                          Open
                        </a>
                      </Button>
                      <Button asChild variant="outline" className="h-9 rounded-2xl px-3 text-xs">
                        <a href={`${document.href}?download=1`}>
                          <Download className="mr-2 h-3.5 w-3.5" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
