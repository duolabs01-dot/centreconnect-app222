'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const updateCentreProfileSchema = z.object({
  ecdId: z.string().uuid(),
  name: z.string().min(2).max(120),
  address: z.string().max(255).optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  email: z.string().email(),
  description: z.string().max(2000).optional().or(z.literal('')),
  logo_url: z.string().url().optional().or(z.literal('')),
  banner_url: z.string().url().optional().or(z.literal('')),
})

export async function updateCentreProfileAction(input: unknown) {
  const parsed = updateCentreProfileSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid data', fields: parsed.error.flatten().fieldErrors }

  const session = await requireEcdPortalSession({ cached: false })
  if (session.role !== 'ecd_admin' || session.ecdId !== parsed.data.ecdId) {
    return { error: 'Only centre admins can update profile settings.' as const }
  }

  const { error } = await session.supabase
    .from('ecd_centres')
    .update({
      name: parsed.data.name,
      address: parsed.data.address?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      email: parsed.data.email,
      description: parsed.data.description?.trim() || null,
      logo_url: parsed.data.logo_url?.trim() || null,
      cover_image_url: parsed.data.banner_url?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.ecdId)

  if (error) return { error: error.message }

  const { data: centre } = await session.supabase
    .from('ecd_centres')
    .select('slug')
    .eq('id', parsed.data.ecdId)
    .maybeSingle()

  revalidatePath('/ecd/profile')
  if (centre?.slug) {
    revalidatePath(`/centre/${centre.slug}`)
    revalidatePath(`/c/${centre.slug}`)
  }

  return { success: true as const }
}
