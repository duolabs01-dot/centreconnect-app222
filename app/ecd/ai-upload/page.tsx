import type { Metadata } from 'next'
import { ComingSoonCard } from '@/components/ecd/ComingSoonCard'

export const metadata: Metadata = {
  title: 'AI Upload - CentreConnect',
  description: 'Utilize AI to assist with document processing and content generation.',
}

export default function AiUploadPage() {
  return (
    <ComingSoonCard
      title="AI Upload & Processing"
      description="This section will allow you to upload documents and leverage AI for various tasks like summarization, content generation, and data extraction."
    />
  )
}
