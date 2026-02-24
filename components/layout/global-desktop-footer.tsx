import Link from 'next/link'

export function GlobalDesktopFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="hidden border-t border-slate-200/80 bg-white/95 md:block">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">CentreConnect</p>
          <p className="mt-1 text-xs text-slate-600">
            POPIA-ready platform controls: consent-aware workflows, role-based access, audit trails, and secure data
            handling. Final compliance also depends on each centre&apos;s internal policies and operational practices.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <Link href="/directory" className="hover:text-slate-900 hover:underline">
            Browse Centres
          </Link>
          <Link href="/for-centres" className="hover:text-slate-900 hover:underline">
            For ECD Centres
          </Link>
          <Link href="/legal" className="hover:text-slate-900 hover:underline">
            Trust Center
          </Link>
          <Link href="/privacy" className="hover:text-slate-900 hover:underline">
            Privacy
          </Link>
          <Link href="/popia-security" className="hover:text-slate-900 hover:underline">
            POPIA and Security
          </Link>
          <Link href="/terms" className="hover:text-slate-900 hover:underline">
            Terms
          </Link>
          <span className="text-slate-500">(c) {currentYear} CentreConnect. All rights reserved.</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400">
            v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}
          </span>
        </div>
      </div>
    </footer>
  )
}
