export default function Loading() {
  return (
    <div className="space-y-4 p-1">
      <div className="h-8 w-32 rounded-2xl bg-slate-100 animate-pulse" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  )
}
