import { SurfaceCard } from '@/components/ui/surface-card'

function ApplicationCardSkeleton() {
  return (
    <SurfaceCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="h-2 w-1/4 animate-pulse rounded bg-slate-50" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
          <div className="h-3 w-16 animate-pulse rounded bg-slate-100 ml-auto" />
        </div>
      </div>
    </SurfaceCard>
  )
}

function TrendSnapshotSkeleton() {
  return (
    <SurfaceCard className="p-4 sm:p-5">
      <div className="mb-3 h-3 w-24 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
            <div className="h-2 w-16 animate-pulse rounded bg-slate-200" />
            <div className="h-6 w-12 animate-pulse rounded bg-slate-300" />
            <div className="h-2 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </SurfaceCard>
  )
}

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-4 pb-24">
      <div className="cc-stack">
        {/* Header Skeleton */}
        <SurfaceCard className="p-5 sm:p-6 space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        </SurfaceCard>

        {/* Trend Snapshot Skeleton */}
        <TrendSnapshotSkeleton />

        {/* Applications List Skeleton */}
        <div className="cc-stack">
          {[1, 2, 3].map((i) => (
            <ApplicationCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
