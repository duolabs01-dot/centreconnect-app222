import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Notice - CentreConnect',
  description: 'How CentreConnect handles personal information and supports POPIA-aligned operations.',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-slate-900">Privacy Notice</h1>
      <p className="mt-2 text-sm text-slate-600">Last updated: February 19, 2026</p>

      <section className="mt-8 space-y-4 text-sm text-slate-700">
        <p>
          CentreConnect provides digital tooling for parents and ECD centres. We apply POPIA-ready controls, including
          role-based access, audit trails, and secure data handling patterns.
        </p>
        <p>
          Personal information may include parent profile details, child application details, guardian contacts,
          communication records, and platform activity logs needed to operate the service.
        </p>
        <p>
          We use this information to run admissions workflows, support communication between parents and centres,
          improve service reliability, and protect platform security.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">Your Rights</h2>
        <p>
          Parents and centres may request correction of inaccurate information and may request account support where
          access or visibility issues occur.
        </p>
        <p>
          Each ECD centre remains responsible for its own internal compliance obligations, retention practices, and
          lawful processing decisions.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
        <p>
          For privacy or data-handling support, use platform support channels in the app or contact your centre
          administrator.
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
