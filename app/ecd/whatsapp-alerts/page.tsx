import type { Metadata } from 'next'
import { ComingSoonCard } from '@/components/ecd/ComingSoonCard'

export const metadata: Metadata = {
  title: 'WhatsApp Alerts - CentreConnect',
  description: 'Send automated WhatsApp alerts and notifications to parents.',
}

export default function WhatsappAlertsPage() {
  return (
    <ComingSoonCard
      title="WhatsApp Alerts"
      description="This section will enable you to send automated WhatsApp alerts and notifications to parents for important updates, events, and emergencies."
    />
  )
}
