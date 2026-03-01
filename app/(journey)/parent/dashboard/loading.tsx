export default function ParentDashboardLoading() {
  return (
    <div style={{ fontFamily: 'var(--font-parent)', padding: '16px' }}>
      <div className="w-48 h-6 rounded-lg bg-gray-200 animate-pulse-slow mb-6" />

      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-2xl bg-gray-200 animate-pulse-slow" />
        <div className="h-20 rounded-2xl bg-gray-200 animate-pulse-slow" />
        <div className="h-20 rounded-2xl bg-gray-200 animate-pulse-slow" />
        <div className="h-20 rounded-2xl bg-gray-200 animate-pulse-slow" />
      </div>

      <div className="w-32 h-4 bg-gray-200 rounded animate-pulse-slow mt-6 mb-3" />

      <div className="h-48 rounded-2xl bg-gray-200 animate-pulse-slow mb-3" />
      <div className="h-48 rounded-2xl bg-gray-200 animate-pulse-slow mb-3" />
      <div className="h-48 rounded-2xl bg-gray-200 animate-pulse-slow mb-3" />
    </div>
  )
}

