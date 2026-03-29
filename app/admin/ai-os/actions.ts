'use server'

import { redirect } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { runFounderAdvisor } from '@/lib/ai/founder-advisor/run'
import type { FounderAdvisorResult } from '@/lib/ai/founder-advisor/run'

export async function generateFounderBrief(goal: string): Promise<FounderAdvisorResult> {
  const identity = await requirePlatformAdmin()
  if (!identity) redirect('/login')

  const trimmed = goal.trim()
  if (!trimmed) throw new Error('Please enter a goal or question.')

  return runFounderAdvisor({
    goal: trimmed,
    triggeredBy: identity.userId,
  })
}
