import { Skeleton } from '@/components/ui/skeleton'
import { Container } from '@/components/layout/container'

export function DirectorySkeleton() {
  return (
    <main className="py-8 sm:py-10">
      <Container>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="grid gap-3 md:grid-cols-6">
              <Skeleton className="h-10 md:col-span-2" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <div className="md:col-span-6 flex gap-2">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">
                <Skeleton className="h-20 w-20 rounded-md" />
                <Skeleton className="mt-3 h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-1/2" />
                <Skeleton className="mt-4 h-4 w-2/3" />
                <Skeleton className="mt-2 h-4 w-1/2" />
                <Skeleton className="mt-4 h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </main>
  )
}

export function ApplicationsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-4 w-56 max-w-full" />
            <Skeleton className="mt-3 h-6 w-24" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-full" />
            <div className="mt-4 flex justify-end gap-2">
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
