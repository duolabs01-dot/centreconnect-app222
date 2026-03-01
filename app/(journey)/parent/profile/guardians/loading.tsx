export default function Loading() {
  return (
    <div className="space-y-4 p-1">
      <div className="h-8 w-52 rounded-2xl bg-slate-100 animate-pulse" />
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" style={{ animationDelay: `${i * 70}ms` }} />
      ))}
    </div>
  )
}
