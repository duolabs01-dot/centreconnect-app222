export default function Loading() {
  return (
    <div className="min-h-screen bg-[rgb(250,248,244)]">
      {/* Skeleton hero — matches homepage layout */}
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="h-7 w-48 animate-pulse rounded-full bg-stone-200/70" />
        <div className="mt-5 h-12 w-3/4 animate-pulse rounded-xl bg-stone-200/60 sm:h-16" />
        <div className="mt-3 h-12 w-1/2 animate-pulse rounded-xl bg-stone-200/50 sm:h-16" />
        <div className="mt-5 h-5 w-2/3 animate-pulse rounded-lg bg-stone-200/40" />
        <div className="mt-6 flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 animate-pulse rounded-full bg-stone-200/50" />
          ))}
        </div>
        <div className="mt-6 h-14 w-56 animate-pulse rounded-2xl bg-teal-100/50" />
      </div>
    </div>
  )
}
