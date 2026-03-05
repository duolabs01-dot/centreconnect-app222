import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Parent onboarding redirect',
  description: 'Redirecting you to the ECD welcome experience.',
}

export default function ParentOnboardingPage() {
  redirect('/ecd/welcome')
}
