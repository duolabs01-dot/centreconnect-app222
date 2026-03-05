import type { Metadata } from 'next'
import CentreConnectWelcomePack from './CentreConnectWelcomePack'

export const metadata: Metadata = {
  title: 'CentreConnect Welcome',
  description: 'Step-by-step welcome pack for ECD principals.',
}

export default function EcdWelcomePage() {
  return <CentreConnectWelcomePack />
}
