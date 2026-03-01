import { Skeleton } from '@/components/ui/skeleton'

export default function ParentProfileLoading() {
  return (
    <div className="space-y-4 p-2">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  )
}
