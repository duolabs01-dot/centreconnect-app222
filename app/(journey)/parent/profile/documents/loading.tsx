export default function Loading() {
  return (
    <div className="space-y-4 p-1">
      <div className="h-8 w-44 rounded-2xl bg-slate-100 animate-pulse" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-slate-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded-lg bg-slate-100 animate-pulse" />
            <div className="h-3 w-24 rounded-lg bg-slate-100 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
