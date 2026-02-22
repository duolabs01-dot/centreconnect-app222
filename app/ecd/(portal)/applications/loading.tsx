import { Skeleton } from '@/components/ui/skeleton'

export default function EcdApplicationsLoading() {
  return (
    <div className="space-y-6">
      <section>
        <Skeleton className="h-4 w-44" />
      </section>

      <section className="rounded-2xl border border-border bg-card/90 p-4 sm:p-6">
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-36" />
        </div>

        <div className="mb-4 flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-28" />
          ))}
        </div>

        <div className="space-y-3 lg:hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-lg" />
          ))}
        </div>

        <div className="hidden lg:block">
          <Skeleton className="h-12 w-full rounded-t-md" />
          <div className="space-y-2 border border-border border-t-0 p-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
