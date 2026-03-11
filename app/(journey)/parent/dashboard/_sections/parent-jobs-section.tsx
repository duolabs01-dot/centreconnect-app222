import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SurfaceCard } from '@/components/ui/surface-card'
import { Briefcase, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export async function ParentJobsSection() {
  const supabase = await createClient()
  const { data: jobsRaw } = await supabase
    .from('jobs')
    .select(`
      id,
      title,
      role_type,
      closes_at,
      ecd_centres (
        name,
        slug,
        suburb
      )
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(3)

  if (!jobsRaw || jobsRaw.length === 0) return null

  const jobs = jobsRaw.map((job: any) => {
    const centre = Array.isArray(job.ecd_centres) ? job.ecd_centres[0] : job.ecd_centres
    return {
      id: job.id,
      title: job.title,
      centreName: centre?.name || 'Local creche',
      suburb: centre?.suburb || '',
      closesAt: job.closes_at,
      slug: centre?.slug,
    }
  })

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-slate-500">
          <Briefcase className="h-4 w-4" />
          <h2 className="text-sm font-bold uppercase tracking-widest">Community jobs</h2>
        </div>
      </div>

      <SurfaceCard className="overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <p className="text-xs font-medium italic text-slate-500">
            If you or someone you know is looking for work, here are recent openings at local creches.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={job.slug ? `/c/${job.slug}/jobs/${job.id}` : `/directory`}
              className="group flex items-center justify-between p-4 transition-colors hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-cyan-700">{job.title}</p>
                <p className="truncate text-xs text-slate-500">{job.centreName} - {job.suburb}</p>
              </div>
              <div className="ml-4 flex items-center gap-3">
                {job.closesAt && (
                  <span className="hidden text-[10px] font-bold uppercase tracking-tighter text-slate-400 sm:block">
                    Ends {formatDate(job.closesAt)}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-cyan-500" />
              </div>
            </Link>
          ))}
        </div>
        <div className="bg-white p-3 text-center">
          <Link href="/#active-jobs" className="text-[11px] font-black uppercase tracking-widest text-cyan-600 hover:text-cyan-800">
            View all jobs
          </Link>
        </div>
      </SurfaceCard>
    </section>
  )
}
