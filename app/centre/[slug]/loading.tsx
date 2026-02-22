import { Container } from '@/components/layout/container'
import { Skeleton } from '@/components/ui/skeleton'

export default function CentreProfileLoading() {
  return (
    <main className="py-8 sm:py-10">
      <Container>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-xl sm:h-64" />

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-48" />
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />
              <Skeleton className="mt-4 h-10 w-full" />
              <Skeleton className="mt-2 h-10 w-full" />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="mt-4 h-40 w-full" />
          </div>
        </div>
      </Container>
    </main>
  )
}

