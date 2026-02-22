'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

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

export async function updateParentPreferencesAction(input: PreferencesPayload) {
  const parsed = preferencesSchema.safeParse(input)
  if (!parsed.success) {
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
    return { error: error.message }
  }

  return { success: true }
}
