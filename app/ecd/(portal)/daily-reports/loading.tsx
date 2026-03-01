export default function Loading() {
  return (
    <div className="space-y-5 p-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  )
}
