export default function Loading() {
  return (
    <div className="space-y-5 p-1">
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-8 w-full rounded-2xl bg-slate-100 animate-pulse" style={{ animationDelay: `${(i % 7) * 30}ms` }} />
        ))}
      </div>
    </div>
  )
}
