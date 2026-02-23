import { Container } from '@/components/ecd/Container'
import { Skeleton } from '@/components/ui/skeleton'

export default function EcdLoading() {
  return (
    <div className="ecd-light-shell min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col">
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-border bg-background/70 backdrop-blur-sm">
            <Container className="py-5">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <div>
                  <Skeleton className="mb-2 h-6 w-36" />
                  <Skeleton className="h-8 w-44" />
                  <Skeleton className="mt-2 h-4 w-80 max-w-full" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-52" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            </Container>
          </header>

          <main className="flex-1 py-6 lg:py-8">
            <Container>
              <div className="space-y-4">
                <Skeleton className="h-40 w-full rounded-xl border border-border bg-card" />
                <Skeleton className="h-64 w-full rounded-xl border border-border bg-card" />
              </div>
            </Container>
          </main>
        </div>
      </div>
    </div>
  )
}
