export default function DirectoryLoading() {
  return (
    <div className="min-h-screen bg-[rgb(250,248,244)] px-4 pb-32 pt-6 sm:px-6">
      {/* Search bar skeleton */}
      <div className="mx-auto max-w-6xl">
        <div className="h-12 w-full animate-pulse rounded-2xl bg-stone-200/60" />
        {/* Filter pills */}
        <div className="mt-4 flex gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-stone-200/50" />
          ))}
        </div>
      </div>
      {/* Centre card skeletons — match actual card aspect ratio */}
      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-[2rem] border border-stone-200/60 bg-white"
          >
            <div className="aspect-[16/5.9] w-full animate-pulse bg-stone-200/50" />
            <div className="space-y-2.5 p-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-stone-200/60" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200/60" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-stone-200/40" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-20 animate-pulse rounded-full bg-stone-200/40" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-stone-200/40" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-24 animate-pulse rounded-full bg-stone-200/50" />
                <div className="h-8 w-20 animate-pulse rounded-full bg-stone-200/50" />
              </div>
              <div className="h-4 w-full animate-pulse rounded bg-stone-200/30" />
            </div>
            <div className="border-t border-stone-200/50 p-4">
              <div className="h-12 w-full animate-pulse rounded-2xl bg-teal-100/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
