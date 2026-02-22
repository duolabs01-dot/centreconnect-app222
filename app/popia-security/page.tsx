import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'POPIA and Security - CentreConnect',
  description: 'Overview of POPIA-ready controls and platform security safeguards.',
}

const controls = [
  'Role-based access controls for parent, ECD, and platform-admin roles',
  'Audit logging for sensitive platform admin operations',
  'Server-side validation and protected route checks',
  'Bot and abuse mitigation controls on critical submit routes',
  'Rate limiting for selected public endpoints',
  'Secure payment webhook handling and replay controls',
]

export default function PopiaSecurityPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-slate-900">POPIA and Security</h1>
      <p className="mt-2 text-sm text-slate-600">Last updated: February 19, 2026</p>

      <section className="mt-8 space-y-4 text-sm text-slate-700">
        <p>
          CentreConnect is built with POPIA-ready platform controls to support lawful, minimal, and secure processing
          of personal information in ECD workflows.
        </p>
        <p>
          These controls help reduce risk across admissions, communications, and account access. Final compliance
          outcomes still depend on each centre&apos;s internal governance, policies, and operating processes.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">Core Controls</h2>
        <ul className="list-disc space-y-2 pl-5">
          {controls.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">Operational Responsibility</h2>
        <p>
          ECD centres remain responsible for staff access discipline, lawful processing instructions, retention
          decisions, and incident response obligations within their organization.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link href="/privacy" className="text-sm font-medium text-slate-900 underline underline-offset-2">
          View Privacy Notice
        </Link>
        <Link href="/terms" className="text-sm font-medium text-slate-900 underline underline-offset-2">
          View Terms of Use
        </Link>
      </div>
    </main>
  )
}
