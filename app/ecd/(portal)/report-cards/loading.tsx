export default function ReportCardsLoading() {
  return (
    <div className="space-y-5 px-1 py-2">
      <div className="h-8 w-52 animate-pulse rounded-2xl bg-slate-200" />
      <div className="h-4 w-72 animate-pulse rounded-xl bg-slate-100" />

      {[1, 2, 3].map((index) => (
        <div key={index} className="space-y-3 rounded-3xl border border-slate-100 bg-white p-5">
          <div className="h-5 w-40 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-3 w-56 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-10 w-full animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ))}
    </div>
  )
}
