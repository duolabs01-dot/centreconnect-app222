import { Skeleton } from '@/components/ui/skeleton'

export default function ParentNotificationsLoading() {
  return (
    <div className="space-y-4 p-2">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  )
}
