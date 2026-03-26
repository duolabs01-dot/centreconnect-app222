export default function DirectoryLoading() {
  return (
    <div className="min-h-screen bg-[rgb(250,248,244)] px-4 pb-32 pt-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Search bar skeleton */}
        <div className="h-14 w-full animate-pulse rounded-[1.4rem] bg-stone-200/60" />
        {/* Filter pills */}
        <div className="mt-4 flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 shrink-0 animate-pulse rounded-full bg-stone-200/50" />
          ))}
        </div>
        {/* Results bar skeleton */}
        <div className="mt-6 flex items-center justify-between rounded-[1.5rem] border border-stone-200 bg-stone-50 px-5 py-4">
          <div className="space-y-2">
            <div className="h-2.5 w-16 animate-pulse rounded-full bg-stone-200/60" />
            <div className="h-4 w-32 animate-pulse rounded-full bg-stone-200/60" />
          </div>
          <div className="flex gap-1 rounded-full bg-slate-100 p-0.5">
            <div className="h-8 w-8 animate-pulse rounded-full bg-stone-200/60" />
            <div className="h-8 w-8 animate-pulse rounded-full bg-stone-200/40" />
          </div>
        </div>
      </div>

      {/* Full-card skeletons (grid) */}
      <div className="mx-auto mt-4 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
            {/* Hero */}
            <div className="h-[140px] w-full animate-pulse bg-stone-200/50" />
            {/* Body */}
            <div className="px-4 pb-3.5 pt-7 space-y-2.5">
              <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200/60" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-stone-200/40" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-stone-200/40" />
              {/* Badges */}
              <div className="flex gap-1.5">
                <div className="h-5 w-14 animate-pulse rounded-full bg-stone-200/50" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-stone-200/40" />
                <div className="h-5 w-12 animate-pulse rounded-full bg-stone-200/40" />
              </div>
              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <div className="h-10 flex-1 animate-pulse rounded-[10px] bg-teal-100/50" />
                <div className="h-10 w-12 animate-pulse rounded-[10px] bg-stone-100/60" />
              </div>
            </div>
            {/* Trust line */}
            <div className="border-t border-stone-100 px-4 py-2">
              <div className="h-3 w-4/5 animate-pulse rounded bg-stone-200/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
