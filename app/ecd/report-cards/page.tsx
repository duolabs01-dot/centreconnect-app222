import type { Metadata } from 'next'
import { ComingSoonCard } from '@/components/ecd/ComingSoonCard'

export const metadata: Metadata = {
  title: 'Report Cards - CentreConnect',
  description: 'Manage and generate report cards for children in your centre.',
}

export default function ReportCardsPage() {
  return (
    <ComingSoonCard
      title="Report Cards"
      description="This section will allow you to generate and manage report cards for the children in your centre."
    />
  )
}
