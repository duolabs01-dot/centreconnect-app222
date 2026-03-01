export default function Loading() {
  return (
    <div className="space-y-6 p-1">
      <div className="h-8 w-40 rounded-2xl bg-slate-100 animate-pulse" />
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-3" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="h-5 w-32 rounded-xl bg-slate-100 animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
