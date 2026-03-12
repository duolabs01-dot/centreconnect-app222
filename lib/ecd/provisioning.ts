import 'server-only'
import { getInternalTierPrice, toInternalTier } from '@/lib/billing/plans'
import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export function slugifyCentre(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48)
}

export async function getUniqueCentreSlug(admin: AdminClient, centreName: string, userIdSeed: string) {
  const baseSlug = slugifyCentre(centreName) || `ecd-${userIdSeed.slice(0, 8)}`
  let slug = baseSlug
  let counter = 1

  while (true) {
    const { data: exists, error } = await admin.from('ecd_centres').select('id').eq('slug', slug).maybeSingle()
    if (error) throw new Error(error.message)
    if (!exists) return slug
    counter += 1
    slug = `${baseSlug}-${counter}`
  }
}

export async function assignCentreOwnerIfMissing(admin: AdminClient, centreId: string, userId: string) {
  return admin.from('ecd_centres').update({ owner_id: userId }).eq('id', centreId).is('owner_id', null)
}

export async function upsertEcdAdminLink(args: {
  admin: AdminClient
  ecdId: string
  userId: string
  invitedBy?: string
}) {
  const payload: Record<string, unknown> = {
    ecd_id: args.ecdId,
    user_id: args.userId,
    role: 'ecd_admin',
    accepted_at: new Date().toISOString(),
  }
  if (args.invitedBy) payload.invited_by = args.invitedBy

  return args.admin.from('ecd_admins').upsert(payload, { onConflict: 'ecd_id,user_id' })
}

export async function upsertCentreSubscription(args: {
  admin: AdminClient
  ecdId: string
  selectedTier?: string | null
  status?: 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended'
  monthlyPrice?: number | null
}) {
  const tier = toInternalTier(args.selectedTier, 'basic')
  const monthlyPrice = args.monthlyPrice ?? getInternalTierPrice(tier)
  return args.admin.from('subscriptions').upsert(
    {
      ecd_id: args.ecdId,
      tier,
      status: args.status ?? 'trial',
      monthly_price: monthlyPrice,
    },
    { onConflict: 'ecd_id' }
  )
}

export async function rollbackProvisionedCentre(admin: AdminClient, centreId: string, userId: string) {
  await admin.from('ecd_admins').delete().eq('ecd_id', centreId).eq('user_id', userId)
  await admin.from('subscriptions').delete().eq('ecd_id', centreId)
  await admin.from('ecd_centres').delete().eq('id', centreId)
}
