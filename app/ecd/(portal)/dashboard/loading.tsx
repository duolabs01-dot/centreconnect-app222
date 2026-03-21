export default function EcdDashboardLoading() {
  return (
    <div style={{ fontFamily: 'var(--font-ecd)', padding: '24px' }}>
      <div className="w-56 h-7 bg-gray-200 rounded animate-pulse-slow mb-6" />

      <div className="grid grid-cols-4 gap-3">
        <div className="h-24 rounded-xl bg-gray-200 animate-pulse-slow" />
        <div className="h-24 rounded-xl bg-gray-200 animate-pulse-slow" />
        <div className="h-24 rounded-xl bg-gray-200 animate-pulse-slow" />
        <div className="h-24 rounded-xl bg-gray-200 animate-pulse-slow" />
      </div>

      <div className="w-full h-64 rounded-2xl bg-gray-200 animate-pulse-slow mt-6" />
    </div>
  )
}

