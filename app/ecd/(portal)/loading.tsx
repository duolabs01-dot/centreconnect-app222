import { SkeletonCard } from '@/components/ui/skeleton-card'

export default function EcdLoading() {
  return (
    <div className="space-y-6 px-6 py-6">
      <div className="space-y-2">
        <div className="h-6 w-32 rounded bg-slate-200 animate-pulse" />
        <div className="h-4 w-48 rounded bg-slate-100 animate-pulse" />
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <SkeletonCard className="xl:col-span-2 h-[300px]" />
        <SkeletonCard className="h-[300px]" />
      </div>
    </div>
  )
}
