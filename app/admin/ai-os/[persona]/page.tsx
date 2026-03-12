import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { AiCompanyLightBrief } from '@/components/admin/ai-company-light-brief'
import {
  isAiCompanyLightPersonaId,
  isAiCompanyLightPersonasEnabled,
} from '@/lib/ai/company-os/config'
import { getAiCompanyOperatingSystemSnapshot } from '@/lib/ai/company-os/service'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Company OS Light Brief | Platform Admin',
  description: 'Feature-flagged light briefing surfaces for CEO and CTO.',
}

export default async function AdminAiCompanyLightPersonaPage({
  params,
}: {
  params: { persona: string }
}) {
  const identity = await requirePlatformAdmin()
  if (!identity) redirect('/login')

  if (!isAiCompanyLightPersonasEnabled() || !isAiCompanyLightPersonaId(params.persona)) {
    notFound()
  }

  const snapshot = await getAiCompanyOperatingSystemSnapshot({
    ownerEmail: identity.email,
  })

  const persona = snapshot.lightPersonas.find(
    (item) => item.agentId === params.persona
  )
  const brief = snapshot.agents.find((item) => item.agentId === params.persona)

  if (!persona || !brief) {
    notFound()
  }

  return (
    <AiCompanyLightBrief
      persona={persona}
      brief={brief}
      risks={snapshot.risks.slice(0, 3)}
      signalMode={snapshot.signalMode}
      dataNotes={snapshot.dataNotes}
      generatedAt={snapshot.generatedAt}
      founderTruth={snapshot.founderTruth}
    />
  )
}
