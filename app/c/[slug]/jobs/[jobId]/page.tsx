import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { PublicJobApplyForm } from '@/components/public/public-job-apply-form'

type PublicJobPageProps = {
  params: {
    slug: string
    jobId: string
  }
}

type JobCentre = {
  id: string
  name: string
  slug: string
  logo_url: string | null
}

export async function generateMetadata({ params }: PublicJobPageProps): Promise<Metadata> {
  const supabase = await createClient()
  const { data: job } = await supabase
    .from('jobs')
    .select('title,ecd_centres(name)')
    .eq('id', params.jobId)
    .eq('is_published', true)
    .maybeSingle()

  const centre = Array.isArray(job?.ecd_centres) ? job?.ecd_centres[0] : job?.ecd_centres
  if (!job) return { title: 'Job Not Found | CentreConnect' }
  return {
    title: `${job.title} - ${centre?.name ?? 'Centre'} | CentreConnect`,
    description: `Apply for ${job.title} at ${centre?.name ?? 'an ECD centre'}.`,
  }
}

export default async function PublicJobPage({ params }: PublicJobPageProps) {
  const supabase = await createClient()
  const { data: job } = await supabase
    .from('jobs')
    .select('id,ecd_id,title,role_type,description,requirements,closes_at,is_published,ecd_centres(id,name,slug,logo_url)')
    .eq('id', params.jobId)
    .eq('is_published', true)
    .maybeSingle()
  if (!job) notFound()

  const relatedCentre = (Array.isArray(job.ecd_centres) ? job.ecd_centres[0] : job.ecd_centres) as JobCentre | null
  let centre: JobCentre | null = relatedCentre ?? null

  if (!centre && job.ecd_id) {
    const { data: centreById } = await supabase
      .from('ecd_centres')
      .select('id,name,slug,logo_url')
      .eq('id', job.ecd_id)
      .maybeSingle()

    centre = (centreById as JobCentre | null) ?? null
  }

  const centreName = centre?.name ?? 'ECD Centre'
  const centreLogoUrl = centre?.logo_url ?? null
  const ecdId = job.ecd_id as string
  const isClosed = Boolean(job.closes_at && new Date(job.closes_at) < new Date())

  return (
    <main className="min-h-screen bg-slate-50 pb-10">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          {centreLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={centreLogoUrl} alt={centreName} className="h-8 w-8 rounded-lg object-cover" />
          ) : null}
          <span className="text-sm font-medium text-slate-900">{centreName}</span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">{job.title}</h1>
          <p className="text-sm text-slate-600">{centreName}</p>
          {job.closes_at ? (
            <p className={`text-sm ${isClosed ? 'text-red-700' : 'text-slate-600'}`}>
              {isClosed ? 'Applications closed' : `Apply by ${formatDate(job.closes_at)}`}
            </p>
          ) : (
            <p className="text-sm text-emerald-700">Open until filled</p>
          )}
        </section>

        {job.description ? (
          <section>
            <h2 className="text-lg font-semibold text-slate-900">About this role</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{job.description}</p>
          </section>
        ) : null}

        {job.requirements ? (
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Requirements</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{job.requirements}</p>
          </section>
        ) : null}

        {isClosed ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-lg font-semibold text-slate-900">Applications Closed</p>
            <p className="mt-1 text-sm text-slate-600">The closing date has passed for this role.</p>
          </section>
        ) : (
          <PublicJobApplyForm
            jobId={job.id}
            ecdId={ecdId}
            jobTitle={job.title}
            centreName={centreName}
          />
        )}
      </div>
    </main>
  )
}
