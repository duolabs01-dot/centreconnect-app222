import type {
  AiCompanyAgentDefinition,
  AiCompanyAgentId,
  AiCompanyLightPersonaId,
} from './types'

export const AI_COMPANY_OS_FEATURE_FLAG = 'ENABLE_AI_COMPANY_OS'
export const AI_COMPANY_LIGHT_PERSONAS_FEATURE_FLAG = 'ENABLE_AI_LIGHT_PERSONAS'

export const AI_COMPANY_LIGHT_PERSONA_IDS: ReadonlyArray<AiCompanyLightPersonaId> = ['ceo', 'cto']

export const AI_COMPANY_AGENT_DEFINITIONS: ReadonlyArray<AiCompanyAgentDefinition> = [
  {
    id: 'ceo',
    name: 'CEO Agent',
    roleLabel: 'Chief Executive Officer',
    mission: 'Turn platform signals into honest founder decisions about partner usage, real demand, and future revenue readiness.',
    decisionQuestion: 'What helps a real partner centre use the product now and reach future payment readiness?',
    lanes: ['revenue', 'growth', 'operations'],
    defaultSurface: 'internal',
    supportedSurfaces: ['internal', 'light'],
  },
  {
    id: 'cto',
    name: 'CTO Agent',
    roleLabel: 'Chief Technology Officer',
    mission: 'Keep the platform reliable, secure, and shippable without wasting engineering time.',
    decisionQuestion: 'What is the smallest safe technical move that protects delivery?',
    lanes: ['product', 'reliability', 'operations'],
    defaultSurface: 'internal',
    supportedSurfaces: ['internal', 'light'],
  },
  {
    id: 'ops',
    name: 'Ops Agent',
    roleLabel: 'Operations Lead',
    mission: 'Stabilize onboarding, support, and day-to-day operating follow-through.',
    decisionQuestion: 'Which queue is blocking activation or trust right now?',
    lanes: ['operations', 'reliability', 'revenue'],
    defaultSurface: 'internal',
    supportedSurfaces: ['internal'],
  },
  {
    id: 'growth',
    name: 'Growth Agent',
    roleLabel: 'Growth Lead',
    mission: 'Translate demand signals into clearer acquisition and conversion actions without overstating revenue readiness.',
    decisionQuestion: 'Where is the next trustworthy growth lever?',
    lanes: ['growth', 'revenue', 'product'],
    defaultSurface: 'internal',
    supportedSurfaces: ['internal'],
  },
] as const

function isEnabled(flagName: string) {
  return process.env[flagName] === '1'
}

export function isAiCompanyOperatingSystemEnabled() {
  return isEnabled(AI_COMPANY_OS_FEATURE_FLAG)
}

export function isAiCompanyLightPersonasEnabled() {
  return isAiCompanyOperatingSystemEnabled() && isEnabled(AI_COMPANY_LIGHT_PERSONAS_FEATURE_FLAG)
}

export function isAiCompanyLightPersonaId(value: string): value is AiCompanyLightPersonaId {
  return AI_COMPANY_LIGHT_PERSONA_IDS.includes(value as AiCompanyLightPersonaId)
}

export function getAiCompanyLightPersonaHref(agentId: AiCompanyLightPersonaId) {
  return `/admin/ai-os/${agentId}`
}
