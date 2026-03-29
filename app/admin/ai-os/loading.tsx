export default function Loading() {
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
        <div className="h-8 w-56 animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-96 animate-pulse rounded bg-slate-800/60" />
      </div>
      {/* Input skeleton */}
      <div className="h-28 animate-pulse rounded-lg bg-slate-900/60 border border-slate-700/50" />
      {/* Suggested prompts */}
      <div className="flex gap-2">
        {[80, 96, 112, 80].map((w, i) => (
          <div
            key={i}
            className="h-6 animate-pulse rounded-full bg-slate-800"
            style={{ width: w, animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
