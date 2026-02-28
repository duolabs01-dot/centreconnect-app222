import { AdminSkeletonCard } from '@/components/ui/skeleton-card'

export default function AdminLoading() {
  return (
    <div className="space-y-6 px-6 py-6">
      <div className="space-y-2">
        <div className="h-6 w-32 rounded bg-admin-border animate-pulse" />
        <div className="h-4 w-48 rounded bg-admin-surface-hover animate-pulse" />
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <AdminSkeletonCard />
        <AdminSkeletonCard />
        <AdminSkeletonCard />
        <AdminSkeletonCard />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <AdminSkeletonCard className="lg:col-span-2 h-[400px]" />
        <AdminSkeletonCard className="h-[400px]" />
      </div>
    </div>
  )
}
