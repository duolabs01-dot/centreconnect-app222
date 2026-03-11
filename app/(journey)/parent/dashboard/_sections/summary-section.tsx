import { createClient } from '@/lib/supabase/server'
import { getJohannesburgGreeting } from '@/lib/utils'

export async function DashboardSummary() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  const parentName = profile?.full_name?.trim() || 'Parent'
  const greeting = getJohannesburgGreeting()

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="text-sm font-medium text-slate-500">
        {greeting}, {parentName}
      </p>
      <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        Parent home
      </h1>
    </div>
  )
}

export function DashboardSummarySkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
    </div>
  )
}
