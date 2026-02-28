import { cn } from '@/lib/utils'

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-squircle bg-surface p-5 shadow-card animate-pulse', className)}>
      <div className="h-3 w-1/3 rounded bg-gray-200 mb-4" />
      <div className="h-5 w-2/3 rounded bg-gray-200 mb-2" />
      <div className="h-3 w-1/2 rounded bg-gray-100" />
    </div>
  )
}

export function AdminSkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-squircle bg-admin-surface border border-admin-border p-5 animate-pulse', className)}>
      <div className="h-3 w-1/3 rounded bg-admin-border mb-4" />
      <div className="h-5 w-2/3 rounded bg-admin-border mb-2" />
      <div className="h-3 w-1/2 rounded bg-admin-surface-hover" />
    </div>
  )
}
