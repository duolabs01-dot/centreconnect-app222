import type { Metadata } from 'next'
import { ComingSoonCard } from '@/components/ecd/ComingSoonCard'

export const metadata: Metadata = {
  title: 'Parent Invoicing - CentreConnect',
  description: 'Manage invoicing and payments for parents.',
}

export default function ParentInvoicingPage() {
  return (
    <ComingSoonCard
      title="Parent Invoicing"
      description="This section will provide tools for managing invoices, payments, and financial reporting for parents."
    />
  )
}
