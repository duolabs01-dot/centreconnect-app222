export default function Loading() {
  return (
    <div className="space-y-6 p-1">
      <div className="h-8 w-48 rounded-2xl bg-slate-100 animate-pulse" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-3xl bg-slate-100 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    </div>
  )
}
