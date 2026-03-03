export default function Loading() {
  return (
    <div className="space-y-4 px-1 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-20 rounded-3xl border border-border bg-card shadow-[var(--shadow-elevation-1)] animate-pulse"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  )
}
