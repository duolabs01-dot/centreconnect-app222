import { redirect } from 'next/navigation'

// The persona-specific agent pages (CEO/CTO light briefs) have been superseded
// by the unified Founder Advisor. All requests are forwarded there.
export default function AdminAiPersonaPage() {
  redirect('/admin/ai-os')
}
