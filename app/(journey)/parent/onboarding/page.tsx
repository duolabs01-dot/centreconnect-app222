import type { Metadata } from 'next'
import { SetupWizard } from './_components/setup-wizard'

export const metadata: Metadata = {
  title: 'Parent Onboarding | CentreConnect',
  description: 'Finish your parent setup so you can explore nearby crèches and apply faster.',
}

export default function ParentOnboardingPage() {
  return (
    <main className="min-h-screen bg-surface-secondary px-4 py-6 sm:px-6">
      <section className="mx-auto w-full max-w-3xl">
        <div className="mb-8 max-w-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Parent setup</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Let&apos;s get your family ready to apply.
          </h1>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
            Share a few details so CentreConnect can show nearby crèches and help you apply faster.
          </p>
        </div>

        <SetupWizard />
      </section>
    </main>
  )
}
