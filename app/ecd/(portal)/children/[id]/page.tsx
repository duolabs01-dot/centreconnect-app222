import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, HeartPulse, ShieldCheck, UserRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ParentDossierCards } from '@/components/ecd/parent-dossier-cards'
import { ParentLinkRequestCard } from '@/components/ecd/parent-link-request-card'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { buildParentDossierForChild } from '@/lib/ecd/parent-dossier'
import { getLatestParentLinkRequestsByChildIds } from '@/lib/ecd/parent-link-requests'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Child Record | CentreConnect',
  description: 'View the child profile, primary parent, co-parent links, and relevant shared documents.',
}

type ChildDetailPageProps = {
  params: Promise<{
    id: string
  }>
}

function parseTextArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[]
  return value.map((entry) => String(entry).trim()).filter(Boolean)
}

function getPrimaryGuardian(raw: unknown) {
  if (!Array.isArray(raw)) return { parent_name: '', parent_phone: '', parent_email: '' }

  const match = raw.find((entry) => {
    if (!entry || typeof entry !== 'object') return false
    const record = entry as Record<string, unknown>
    return typeof record.phone === 'string' || typeof record.email === 'string' || typeof record.full_name === 'string'
  })

  if (!match || typeof match !== 'object') {
    return { parent_name: '', parent_phone: '', parent_email: '' }
  }

  const record = match as Record<string, unknown>
  return {
    parent_name: typeof record.full_name === 'string' ? record.full_name : '',
    parent_phone: typeof record.phone === 'string' ? record.phone : '',
    parent_email: typeof record.email === 'string' ? record.email : '',
  }
}

export default async function EcdChildDetailPage({ params }: ChildDetailPageProps) {
  const { id } = await params
  const { supabase, user, role, ecdId } = await requireEcdPortalSession()

  const childSelect =
    'id,first_name,last_name,date_of_birth,class_id,enrollment_start_date,enrollment_status,parent_id,guardian_contacts,emergency_contacts,allergies,medical_conditions,special_needs,dietary_restrictions,doctor_name,medical_aid_number,created_at,ecd_classes(name,age_group)'

  const childResult = await supabase
    .from('children')
    .select(childSelect)
    .eq('ecd_id', ecdId)
    .eq('id', id)
    .maybeSingle()

  const admin = createAdminClient()
  const adminFallback = !childResult.data
    ? await admin
        .from('children')
        .select(childSelect)
        .eq('ecd_id', ecdId)
        .eq('id', id)
        .maybeSingle()
    : { data: null }

  const child = childResult.data ?? adminFallback.data

  if (!child) {
    return (
      <>
        <div className="mx-auto max-w-2xl py-8">
          <Card className="rounded-3xl border-amber-200 bg-amber-50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-amber-900">We couldn&apos;t load this child record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-amber-900">
              <p>This record may have moved, the family link may still be syncing, or the child belongs to another creche.</p>
              <Link href="/ecd/children" prefetch={false} className="inline-flex min-h-[44px] items-center rounded-2xl bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700">
                Back to children
              </Link>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const childName = `${child.first_name ?? ''} ${child.last_name ?? ''}`.trim() || 'Child'
  const classMeta = Array.isArray(child.ecd_classes) ? child.ecd_classes[0] : child.ecd_classes
  const primaryGuardian = getPrimaryGuardian(child.guardian_contacts)

  const dossier = await buildParentDossierForChild({
    supabase,
    ecdId,
    childId: String(child.id),
    childName,
    parentId: child.parent_id ? String(child.parent_id) : null,
    guardianContacts: child.guardian_contacts,
  })

  const parentLinkRequests = await getLatestParentLinkRequestsByChildIds([String(child.id)])
  const latestParentLinkRequest = parentLinkRequests.get(String(child.id)) ?? null

  const communicationsHref = dossier.primaryParent.userId
    ? `/ecd/communications?recipient=${encodeURIComponent(dossier.primaryParent.userId)}&contextType=child&contextId=${encodeURIComponent(String(child.id))}`
    : null

  return (
    <>
      <div className="space-y-5 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/ecd/children" prefetch={false} className="text-sm font-semibold text-teal-700 hover:text-teal-800">
            Back to children
          </Link>
          <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700">
            {String(child.enrollment_status ?? 'active').replaceAll('_', ' ')}
          </span>
        </div>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="space-y-3">
            <CardTitle className="text-xl text-slate-900">{childName}</CardTitle>
            <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <p><span className="font-bold text-slate-800">Class:</span> {classMeta?.name ?? 'Not assigned yet'}</p>
              <p><span className="font-bold text-slate-800">Age group:</span> {classMeta?.age_group ?? 'Not set'}</p>
              <p><span className="font-bold text-slate-800">Start date:</span> {child.enrollment_start_date ? formatDate(child.enrollment_start_date) : 'Not set'}</p>
              <p><span className="font-bold text-slate-800">Created:</span> {child.created_at ? formatDate(child.created_at) : 'Not recorded'}</p>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <UserRound className="h-4 w-4 text-teal-600" />
                  Child details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <p><span className="font-semibold text-slate-900">Date of birth:</span> {child.date_of_birth ? formatDate(child.date_of_birth) : 'Not added yet'}</p>
                <p><span className="font-semibold text-slate-900">Primary guardian saved:</span> {primaryGuardian.parent_name || 'Not saved yet'}</p>
                <p><span className="font-semibold text-slate-900">Allergies:</span> {parseTextArray(child.allergies).join(', ') || 'None listed'}</p>
                <p><span className="font-semibold text-slate-900">Medical conditions:</span> {parseTextArray(child.medical_conditions).join(', ') || 'None listed'}</p>
                <p><span className="font-semibold text-slate-900">Special needs:</span> {String(child.special_needs ?? '').trim() || 'None listed'}</p>
                <p><span className="font-semibold text-slate-900">Dietary restrictions:</span> {String(child.dietary_restrictions ?? '').trim() || 'None listed'}</p>
              </CardContent>
            </Card>

            <ParentDossierCards dossier={dossier} communicationsHref={communicationsHref} />
            <ParentLinkRequestCard
              childId={String(child.id)}
              parentId={child.parent_id ? String(child.parent_id) : null}
              defaultParentName={dossier.primaryParent.fullName !== 'Profile not shared yet' ? dossier.primaryParent.fullName : primaryGuardian.parent_name}
              defaultParentPhone={dossier.primaryParent.phone || dossier.primaryParent.alternatePhone || primaryGuardian.parent_phone}
              defaultParentEmail={dossier.primaryParent.billingEmail || primaryGuardian.parent_email}
              request={latestParentLinkRequest}
            />
          </div>

          <aside className="space-y-5">
            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <CalendarDays className="h-4 w-4 text-teal-600" />
                  Daily work
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <Link href={`/ecd/attendance${child.class_id ? `?classId=${encodeURIComponent(String(child.class_id))}` : ''}`} className="block rounded-2xl border border-slate-200 px-4 py-3 font-semibold transition-colors hover:border-teal-300 hover:text-teal-700">
                  Mark attendance
                </Link>
                <Link href="/ecd/daily-reports" className="block rounded-2xl border border-slate-200 px-4 py-3 font-semibold transition-colors hover:border-teal-300 hover:text-teal-700">
                  Open daily reports
                </Link>
                {communicationsHref ? (
                  <Link href={communicationsHref} className="block rounded-2xl border border-slate-200 px-4 py-3 font-semibold transition-colors hover:border-teal-300 hover:text-teal-700">
                    Message family
                  </Link>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  Family sync status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                <p>{dossier.sourceDescription}</p>
                <p><span className="font-semibold text-slate-900">Main contact:</span> {dossier.primaryParent.fullName}</p>
                <p><span className="font-semibold text-slate-900">Relevant documents:</span> {dossier.documents.length}</p>
                <p><span className="font-semibold text-slate-900">Co-parent links:</span> {dossier.coParents.length}</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                  <HeartPulse className="h-4 w-4 text-teal-600" />
                  Quick health view
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                <p><span className="font-semibold text-slate-900">Doctor:</span> {String(child.doctor_name ?? '').trim() || 'Not added yet'}</p>
                <p><span className="font-semibold text-slate-900">Medical aid:</span> {String(child.medical_aid_number ?? '').trim() || 'Not added yet'}</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </>
  )
}






