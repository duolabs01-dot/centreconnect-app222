import { SkeletonCard } from '@/components/ui/skeleton-card'

export default function ParentLoading() {
  return (
    <div className="space-y-6 px-4 pt-4">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-64 rounded bg-gray-100 animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard className="sm:col-span-2" />
      </div>
    </div>
  )
}
