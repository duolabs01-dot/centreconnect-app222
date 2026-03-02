import type { Metadata } from 'next'
import Link from 'next/link'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Button } from '@/components/ui/button'
import { PipelineBoard } from './pipeline-board'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateApplicationIntakeReadiness } from '@/lib/admissions/intake-readiness'

export const metadata: Metadata = {
  title: 'Children Journey (Pipeline) - CentreConnect',
  description: 'Visual journey of applications by stage, with simple status movement and actions.',
}

type PipelinePageProps = {
  searchParams?: {
    page?: string
  }
}

type PipelineStatus = 'submitted' | 'in_review' | 'waitlisted' | 'approved' | 'rejected'

type ApplicationRow = {
  id: string
  parent_id: string
  child_id: string
  application_number: string
  status: PipelineStatus
  submitted_at: string
  offer_made_at: string | null
  parent_message: string | null
  admin_notes: string | null
  children:
    | { first_name: string; last_name: string; date_of_birth: string | null; gender: string | null }
    | Array<{ first_name: string; last_name: string; date_of_birth: string | null; gender: string | null }>
    | null
  parents:
    | {
        id: string
        alt_phone: string | null
        guardian_relationship: string | null
        emergency_contact_name: string | null
        emergency_contact_phone: string | null
        id_verification_status: string | null
        user_profiles:
          | { full_name: string | null; phone: string | null }
          | Array<{ full_name: string | null; phone: string | null }>
          | null
      }
    | Array<{
        id: string
        alt_phone: string | null
        guardian_relationship: string | null
        emergency_contact_name: string | null
        emergency_contact_phone: string | null
        id_verification_status: string | null
        user_profiles:
          | { full_name: string | null; phone: string | null }
          | Array<{ full_name: string | null; phone: string | null }>
          | null
      }>
    | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function EcdPipelinePage({ searchParams }: PipelinePageProps) {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const admin = createAdminClient()
  const { data: centre } = await supabase.from('ecd_centres').select('name').eq('id', ecdId).maybeSingle()
  const pageSize = 120
  const rawPage = Number.parseInt(searchParams?.page ?? '1', 10)
  const currentPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const pageFrom = (currentPage - 1) * pageSize
  const pageTo = pageFrom + pageSize - 1

  const [{ data }, { count: totalCount }] = await Promise.all([
    supabase
      .from('applications')
      .select(
        'id,parent_id,child_id,application_number,status,submitted_at,offer_made_at,parent_message,admin_notes,children(first_name,last_name,date_of_birth,gender),parents(id,alt_phone,guardian_relationship,emergency_contact_name,emergency_contact_phone,id_verification_status,user_profiles(full_name,phone))'
      )
      .eq('ecd_id', ecdId)
      .order('submitted_at', { ascending: false })
      .range(pageFrom, pageTo),
    supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('ecd_id', ecdId),
  ])

  const applications = ((data ?? []) as ApplicationRow[]) ?? []
  const parentIds = Array.from(new Set(applications.map((application) => application.parent_id).filter(Boolean)))
  const { data: docsRows, error: docsError } =
    parentIds.length > 0
      ? await admin.from('parent_documents').select('parent_id,doc_type').in('parent_id', parentIds).limit(500)
      : { data: [] as Array<{ parent_id: string; doc_type: string | null }>, error: null }
  const docsByParent = new Map<string, string[]>()
  for (const row of docsRows ?? []) {
    const list = docsByParent.get(row.parent_id) ?? []
    if (row.doc_type) list.push(row.doc_type)
    docsByParent.set(row.parent_id, list)
  }

  const blockedPendingCount = docsError
    ? 0
    : applications.filter((application) => {
        if (application.status !== 'submitted' && application.status !== 'in_review') return false
        const parent = normalizeOne(application.parents)
        const profile = normalizeOne(parent?.user_profiles ?? null)
        const child = normalizeOne(application.children)
        const readiness = evaluateApplicationIntakeReadiness({
          parent: {
            fullName: profile?.full_name ?? null,
            phone: profile?.phone ?? parent?.alt_phone ?? null,
            guardianRelationship: parent?.guardian_relationship ?? null,
            emergencyContactName: parent?.emergency_contact_name ?? null,
            emergencyContactPhone: parent?.emergency_contact_phone ?? null,
            idVerificationStatus: parent?.id_verification_status ?? null,
          },
          child: {
            firstName: child?.first_name ?? null,
            lastName: child?.last_name ?? null,
            dateOfBirth: child?.date_of_birth ?? null,
            gender: child?.gender ?? null,
          },
          docTypes: docsByParent.get(application.parent_id) ?? [],
        })
        return !readiness.ready
      }).length

  const visibleApplications =
    docsError
      ? applications
      : applications.filter((application) => {
          if (application.status !== 'submitted' && application.status !== 'in_review') return true
          const parent = normalizeOne(application.parents)
          const profile = normalizeOne(parent?.user_profiles ?? null)
          const child = normalizeOne(application.children)
          const readiness = evaluateApplicationIntakeReadiness({
            parent: {
              fullName: profile?.full_name ?? null,
              phone: profile?.phone ?? parent?.alt_phone ?? null,
              guardianRelationship: parent?.guardian_relationship ?? null,
              emergencyContactName: parent?.emergency_contact_name ?? null,
              emergencyContactPhone: parent?.emergency_contact_phone ?? null,
              idVerificationStatus: parent?.id_verification_status ?? null,
            },
            child: {
              firstName: child?.first_name ?? null,
              lastName: child?.last_name ?? null,
              dateOfBirth: child?.date_of_birth ?? null,
              gender: child?.gender ?? null,
            },
            docTypes: docsByParent.get(application.parent_id) ?? [],
          })
          return readiness.ready
        })
  const total = totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  return (
    <EcdOsShell
      title="Children Journey (Pipeline)"
      description="Simple view of where each application is right now. Pipeline means stage-by-stage flow."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <section className="mb-4 space-y-3">
        <p className="text-sm text-slate-600">{centre?.name ?? 'Your crèche'}</p>
        <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          Tip: move children stage-by-stage. The board will guide and correct where needed.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Showing most recent {visibleApplications.length} of {total} applications. Page {currentPage} of {totalPages}.
        </p>
        {blockedPendingCount > 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {blockedPendingCount} pending application{blockedPendingCount === 1 ? '' : 's'} are hidden until parents
            complete required intake details.
          </p>
        ) : null}
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" variant="outline" asChild disabled={!canPrev}>
            <Link href={canPrev ? `/ecd/pipeline?page=${currentPage - 1}` : '/ecd/pipeline'}>Previous</Link>
          </Button>
          <Button size="sm" variant="outline" asChild disabled={!canNext}>
            <Link href={canNext ? `/ecd/pipeline?page=${currentPage + 1}` : `/ecd/pipeline?page=${currentPage}`}>
              Next
            </Link>
          </Button>
        </div>
      </section>

      {visibleApplications.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/90 p-6 text-sm text-muted-foreground">
          <p>No applications yet. Complete your profile to attract parents.</p>
          <div className="mt-3">
            <Button size="sm" asChild>
              <Link href="/ecd/website">Complete profile</Link>
            </Button>
          </div>
        </div>
      ) : (
        <PipelineBoard
          ecdId={ecdId}
          centreName={centre?.name ?? 'Your crèche'}
          initialApplications={visibleApplications}
        />
      )}
    </EcdOsShell>
  )
}





