export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border/75 bg-card/95 p-6 animate-pulse">
      <div className="h-4 w-1/3 bg-muted rounded mb-4" />
      <div className="h-20 bg-muted rounded" />
    </div>
  )
}
