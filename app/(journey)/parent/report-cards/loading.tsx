export default function ParentReportCardsLoading() {
  return (
    <div className="space-y-6 animate-pulse p-4">
      <div className="h-8 w-52 rounded-2xl bg-slate-200" />
      <div className="h-4 w-72 rounded-xl bg-slate-100" />
      {[1, 2].map((index) => (
        <div key={index} className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6">
          <div className="h-6 w-44 rounded-xl bg-slate-200" />
          <div className="space-y-3">
            {[1, 2, 3].map((area) => (
              <div key={area} className="space-y-2">
                <div className="h-4 w-32 rounded bg-slate-100" />
                <div className="h-2 w-full rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
