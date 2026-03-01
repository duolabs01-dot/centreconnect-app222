export default function Loading() {
  return (
    <div className="space-y-6 p-1">
      <div className="h-8 w-36 rounded-2xl bg-slate-100 animate-pulse" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
      ))}
    </div>
  )
}
