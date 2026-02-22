import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Use - CentreConnect',
  description: 'Basic platform terms for CentreConnect users.',
}

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-slate-900">Terms of Use</h1>
      <p className="mt-2 text-sm text-slate-600">Last updated: February 19, 2026</p>

      <section className="mt-8 space-y-4 text-sm text-slate-700">
        <p>
          CentreConnect enables discovery, admissions, and communication workflows between parents and ECD centres.
          By using the platform, you agree to use it lawfully and responsibly.
        </p>
        <p>
          Users are responsible for providing accurate details, maintaining account security, and using communication
          tools appropriately.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">Centre Responsibilities</h2>
        <p>
          Each ECD centre is responsible for its admission decisions, data retention, and compliance with applicable
          legal obligations, including POPIA where relevant.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">Service Availability</h2>
        <p>
          We continuously improve reliability, but availability may be interrupted by maintenance, upgrades, or issues
          outside our control.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">Updates</h2>
        <p>
          These terms may be updated from time to time. Continued use of the platform after updates means you accept
          the revised terms.
        </p>
      </section>

      <div className="mt-10">
        <Link href="/" className="text-sm font-medium text-slate-900 underline underline-offset-2">
          Back to home
        </Link>
      </div>
    </main>
  )
}
