import Link from 'next/link'

export function GlobalMobileLegalStrip() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="border-t border-slate-200/80 bg-white/95 px-4 py-3 text-xs text-slate-600 md:hidden">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
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
        <span className="text-slate-500">© {currentYear} CentreConnect</span>
      </div>
      <p className="mt-1 text-center text-[10px] font-mono text-slate-400">
        v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}
      </p>
    </div>
  )
}
