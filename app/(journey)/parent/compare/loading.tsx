export default function Loading() {
  return (
    <div className="space-y-6 p-1">
      <div className="h-8 w-52 rounded-2xl bg-slate-100 animate-pulse" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" style={{ animationDelay: '60ms' }} />
      </div>
    </div>
  )
}
