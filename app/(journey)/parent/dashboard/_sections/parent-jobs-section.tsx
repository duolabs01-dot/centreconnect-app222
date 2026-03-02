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
      centreName: centre?.name || 'ECD Crèche',
      suburb: centre?.suburb || '',
      closesAt: job.closes_at,
      slug: centre?.slug
    }
  })

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-slate-500">
          <Briefcase className="h-4 w-4" />
          <h2 className="text-sm font-bold uppercase tracking-widest">Community Opportunities</h2>
        </div>
      </div>

      <SurfaceCard className="overflow-hidden p-0">
        <div className="bg-slate-50/50 px-5 py-3 border-b border-slate-100">
          <p className="text-xs font-medium text-slate-500 italic">
            Know someone looking for work? Or interested yourself? Here are recent openings at local crèches.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <Link 
              key={job.id} 
              href={job.slug ? `/c/${job.slug}/jobs/${job.id}` : `/directory`}
              className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate group-hover:text-cyan-700 transition-colors">{job.title}</p>
                <p className="text-xs text-slate-500 truncate">{job.centreName} â€¢ {job.suburb}</p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                {job.closesAt && (
                  <span className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    Ends {formatDate(job.closesAt)}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
        <div className="p-3 bg-white text-center">
          <Link href="/#active-jobs" className="text-[11px] font-black text-cyan-600 uppercase tracking-widest hover:text-cyan-800">
            View All Openings
          </Link>
        </div>
      </SurfaceCard>
    </section>
  )
}


