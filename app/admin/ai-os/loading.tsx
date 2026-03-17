export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-40 animate-pulse rounded-[2rem] bg-slate-950/60" />
      <div className="grid gap-6 xl:grid-cols-3">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-[2rem] bg-slate-950/60"
            style={{ animationDelay: `${index * 80}ms` }}
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="h-80 animate-pulse rounded-[2rem] bg-slate-950/60"
            style={{ animationDelay: `${index * 80}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
