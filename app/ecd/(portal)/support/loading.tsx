export default function Loading() {
    return (
        <div className="px-4 pt-6 sm:px-6">
            <div className="w-48 h-7 bg-slate-100 rounded-2xl animate-pulse mb-6" />
            <div className="space-y-4">
                <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
                <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" style={{ animationDelay: '60ms' }} />
            </div>
        </div>
    )
}
