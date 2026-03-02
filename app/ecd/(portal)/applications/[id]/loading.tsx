export default function Loading() {
  return (
    <div className="space-y-4 px-4 py-6 sm:px-6">
      <div className="h-6 w-40 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="h-44 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-52 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-44 animate-pulse rounded-3xl bg-slate-100" />
        </div>
        <div className="space-y-4">
          <div className="h-60 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-44 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      </div>
    </div>
  )
}
