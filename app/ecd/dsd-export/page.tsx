import type { Metadata } from 'next'
import { ComingSoonCard } from '@/components/ecd/ComingSoonCard'

export const metadata: Metadata = {
  title: 'DSD Export - CentreConnect',
  description: 'Generate reports and data exports for DSD compliance.',
}

export default function DsdExportPage() {
  return (
    <ComingSoonCard
      title="DSD Export"
      description="This section will provide tools to generate reports and export data in formats required for Department of Social Development (DSD) compliance."
    />
  )
}
