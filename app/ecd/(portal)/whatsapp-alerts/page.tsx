import type { Metadata } from "next"
import { MessageCircleMore } from "lucide-react"

export const metadata: Metadata = {
  title: "WhatsApp Alerts — CentreConnect",
}

export default function WhatsappAlertsPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-2xl border border-slate-200 bg-white p-10 max-w-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
          <MessageCircleMore className="h-7 w-7" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-2">
          Coming Soon
        </p>
        <h1 className="text-xl font-bold text-slate-900">WhatsApp Alerts</h1>
        <p className="mt-2 text-sm text-slate-500">Notify parents instantly via WhatsApp.</p>
        <p className="mt-4 text-xs text-slate-400">Expected: Q2 2026</p>
      </div>
    </div>
  )
}
