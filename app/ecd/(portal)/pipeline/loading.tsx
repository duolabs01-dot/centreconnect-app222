import { Skeleton } from '@/components/ui/skeleton'

export default function EcdPipelineLoading() {
  return (
    <div className="space-y-6">
      <section>
        <Skeleton className="h-4 w-44" />
      </section>

      <section className="overflow-x-auto">
        <div className="grid min-w-[1200px] grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="glass-card border border-border p-4">
              <Skeleton className="h-5 w-24" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-md" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

