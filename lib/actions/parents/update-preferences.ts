'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logSecurityEvent } from '@/lib/security/events'

const preferencesSchema = z.object({
  max_monthly_budget: z
    .union([z.number(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
      }
      return value ?? null
    }),
  preferred_radius_km: z
    .union([z.number(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
      }
      return value ?? null
    }),
  preferred_suburbs: z.string().trim().optional(),
  transport_needed: z.boolean().optional(),
  preferred_start_month: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

type PreferencesPayload = z.infer<typeof preferencesSchema>

type FailureContextValue = string | number | boolean | null

async function logPreferencesSubmitFailure(input: {
  supabase?: Awaited<ReturnType<typeof createClient>>
  parentId?: string | null
  failureType: string
  message: string
  context?: Record<string, FailureContextValue>
}) {
  try {
    const supabase = input.supabase ?? (await createClient())
    const parentId =
      input.parentId ??
      (await supabase.auth.getUser()).data.user?.id ??
      null

    if (!parentId) return

    await supabase.from('parent_form_submit_failures').insert({
      parent_id: parentId,
      route_path: '/parent/preferences',
      form_name: 'preferences_update',
      failure_type: input.failureType,
      source: 'server',
      error_message: input.message,
      context: input.context ?? {},
    })
  } catch {
    // Telemetry must never block the parent flow.
  }
}

export async function updateParentPreferencesAction(input: PreferencesPayload) {
  const parsed = preferencesSchema.safeParse(input)
  if (!parsed.success) {
    await logPreferencesSubmitFailure({
      failureType: 'validation_failed',
      message: 'Invalid preference values',
      context: {
        issue_count: parsed.error.issues.length,
      },
    })
    return { error: 'Invalid preference values' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Please log in to update preferences' }
  }

  const suburbs =
    parsed.data.preferred_suburbs
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? null

  const { error } = await supabase.from('parents').upsert(
    {
      id: user.id,
      max_monthly_budget: parsed.data.max_monthly_budget ?? null,
      preferred_radius_km: parsed.data.preferred_radius_km ?? null,
      preferred_suburbs: suburbs,
      transport_needed: parsed.data.transport_needed ?? false,
      preferred_start_month: parsed.data.preferred_start_month ?? null,
    },
    { onConflict: 'id' }
  )

  if (error) {
    await logPreferencesSubmitFailure({
      supabase,
      parentId: user.id,
      failureType: 'submit_failed',
      message: error.message || 'Failed to update preferences',
    })
    return { error: error.message }
  }

  await logSecurityEvent(user.id, 'preferences_update', 'Parent updated discovery and budget preferences.')

  return { success: true }
}
