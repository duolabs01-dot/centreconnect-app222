import type { Metadata } from 'next'
import Link from 'next/link'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Button } from '@/components/ecd/Button'
import { PipelineBoard } from './pipeline-board'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

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

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function EcdPipelinePage({ searchParams }: PipelinePageProps) {
  const { supabase, user, ecdId } = await requireEcdPortalSession()
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
        'id,application_number,status,submitted_at,offer_made_at,parent_message,admin_notes,children(first_name,last_name),parents(id,alt_phone,user_profiles(full_name,phone))'
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
  const total = totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  return (
    <EcdOsShell
      title="Children Journey (Pipeline)"
      description="Simple view of where each application is right now. Pipeline means stage-by-stage flow."
      roleLabel="ECD Portal"
      userEmail={user.email ?? 'Unknown email'}
    >
      <section className="mb-4 space-y-3">
        <p className="text-sm text-slate-600">{centre?.name ?? 'Your centre'}</p>
        <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          Tip: move children stage-by-stage. The board will guide and correct where needed.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Showing most recent {applications.length} of {total} applications. Page {currentPage} of {totalPages}.
        </p>
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

      {applications.length === 0 ? (
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
          centreName={centre?.name ?? 'Your centre'}
          initialApplications={applications}
        />
      )}
    </EcdOsShell>
  )
}

