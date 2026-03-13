'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const linkFamilySchema = z.object({
  parentAId: z.string().uuid(),
  parentBId: z.string().uuid(),
  reason: z.string().max(500),
})

export type FamilyLinkResult = {
  success: boolean
  error?: string
  linkId?: string
}

export async function createFamilyLinkRequest(input: unknown): Promise<FamilyLinkResult> {
  const parsed = linkFamilySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const { parentAId, parentBId, reason } = parsed.data

  // Get ECD session
  const { ecdId, user } = await requireEcdPortalSession()

  const admin = createAdminClient()

  // Check if link already exists
  const { data: existing } = await admin
    .from('family_link_requests')
    .select('id,status')
    .or(`and(parent_a_id.eq.${parentAId},parent_b_id.eq.${parentBId}),and(parent_a_id.eq.${parentBId},parent_b_id.eq.${parentAId})`)
    .in('status', ['pending', 'approved'])
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'These accounts are already linked or have a pending request' }
  }

  // Create the link request (approved immediately since ECD initiated it)
  const { data, error } = await admin
    .from('family_link_requests')
    .insert({
      ecd_id: ecdId,
      requested_by_ecd_admin_id: user.id,
      parent_a_id: parentAId,
      parent_b_id: parentBId,
      reason,
      status: 'approved',
      parent_a_approved_at: new Date().toISOString(),
      parent_b_approved_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[family-link] Error creating link:', error)
    return { success: false, error: 'Failed to link accounts' }
  }

  // Now merge the accounts
  await mergeParentAccounts(parentAId, parentBId, ecdId)

  revalidatePath('/ecd/children')
  revalidatePath('/ecd/applications')

  return { success: true, linkId: data.id }
}

async function mergeParentAccounts(parentAId: string, parentBId: string, ecdId: string) {
  const admin = createAdminClient()

  // Determine which is the "primary" account (keep) vs "secondary" (merge)
  // Prefer the one with more children at this ECD
  const [{ data: childrenA }, { data: childrenB }] = await Promise.all([
    admin.from('children').select('id').eq('parent_id', parentAId).eq('ecd_id', ecdId),
    admin.from('children').select('id').eq('parent_id', parentBId).eq('ecd_id', ecdId),
  ])

  const primaryParentId = (childrenA?.length ?? 0) >= (childrenB?.length ?? 0) ? parentAId : parentBId
  const secondaryParentId = primaryParentId === parentAId ? parentBId : parentAId

  // Transfer children from secondary to primary (only for this ECD)
  // First, unlink children from secondary at this ECD
  await admin
    .from('children')
    .update({ parent_id: primaryParentId })
    .eq('parent_id', secondaryParentId)
    .eq('ecd_id', ecdId)

  // Transfer applications from secondary to primary (only for this ECD)
  await admin
    .from('applications')
    .update({ 
      parent_id: primaryParentId,
      merged_from_parent_id: secondaryParentId,
    })
    .eq('parent_id', secondaryParentId)
    .eq('ecd_id', ecdId)

  // Mark secondary account as merged
  await admin
    .from('user_profiles')
    .update({
      merged_into_user_id: primaryParentId,
      merged_at: new Date().toISOString(),
    })
    .eq('id', secondaryParentId)
}

export async function getFamilyLinkRequestsForECD(): Promise<any[]> {
  const { ecdId } = await requireEcdPortalSession()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('family_link_requests')
    .select(`
      *,
      parent_a:user_profiles!parent_a_id(full_name,phone),
      parent_b:user_profiles!parent_b_id(full_name,phone)
    `)
    .eq('ecd_id', ecdId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[family-link] Error fetching requests:', error)
    return []
  }

  return data ?? []
}
