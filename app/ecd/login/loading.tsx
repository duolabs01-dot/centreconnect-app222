export default function Loading() {
    return (
        <div className="mx-auto w-full max-w-lg px-4 pt-10">
            <div className="w-40 h-8 bg-slate-100 rounded-2xl animate-pulse mx-auto mb-8" />
            <div className="space-y-4">
                <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                <div className="h-12 rounded-xl bg-slate-100 animate-pulse" style={{ animationDelay: '60ms' }} />
                <div className="h-12 rounded-xl bg-slate-100 animate-pulse" style={{ animationDelay: '120ms' }} />
            </div>
        </div>
    )
}
