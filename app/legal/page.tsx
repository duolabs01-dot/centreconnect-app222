import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Trust Center - CentreConnect',
  description: 'Legal, privacy, POPIA, and security resources for CentreConnect users and ECD centres.',
}

export default function LegalPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-slate-900">Trust Center</h1>
      <p className="mt-2 text-sm text-slate-600">
        Central access to privacy, POPIA and security information, and platform use terms.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/privacy" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300">
          <p className="text-base font-semibold text-slate-900">Privacy Notice</p>
          <p className="mt-1 text-sm text-slate-600">How personal information is handled on CentreConnect.</p>
        </Link>

        <Link href="/popia-security" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300">
          <p className="text-base font-semibold text-slate-900">POPIA and Security</p>
          <p className="mt-1 text-sm text-slate-600">Platform safeguards and shared compliance responsibilities.</p>
        </Link>

        <Link href="/terms" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300">
          <p className="text-base font-semibold text-slate-900">Terms of Use</p>
          <p className="mt-1 text-sm text-slate-600">Platform usage terms and operational boundaries.</p>
        </Link>

        <Link href="/for-centres" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300">
          <p className="text-base font-semibold text-slate-900">Centre Onboarding</p>
          <p className="mt-1 text-sm text-slate-600">Information for ECD centres joining CentreConnect.</p>
        </Link>
      </section>
    </main>
  )
}
