import type { Metadata } from 'next'
import { SetupWizard } from './_components/setup-wizard'
import { BrandMark } from '@/components/ecd/BrandMark'

export const metadata: Metadata = {
  title: 'Welcome to CentreConnect',
  description: 'Complete your 1-minute setup to start finding the right crèche for your family.',
}

export default function ParentOnboardingPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center pt-12 pb-20 px-4">
      <header className="mb-12 text-center">
        <BrandMark compact className="h-10 w-auto mx-auto mb-6" />
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Let&apos;s get you ready.</h1>
        <p className="text-slate-500 font-medium mt-2">Just a few details to personalize your experience.</p>
      </header>

      <SetupWizard />
      
      <footer className="mt-12 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Secure & Private • 100% Free for Parents
        </p>
      </footer>
    </div>
  )
}
