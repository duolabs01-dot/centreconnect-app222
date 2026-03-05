import type { Metadata } from 'next'
import CentreConnectWelcomePack from './CentreConnectWelcomePack'

export const metadata: Metadata = {
  title: 'Welcome to CentreConnect',
  description: 'Complete your 1-minute setup to start finding the right crèche for your family.',
}

export default function ParentOnboardingPage() {
  return <CentreConnectWelcomePack />
}
