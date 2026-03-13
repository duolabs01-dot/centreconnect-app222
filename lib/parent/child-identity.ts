'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type ChildIdentityMatch = {
  identity_id: string
  original_parent_id: string | null
  original_child_id: string | null
  original_application_id: string | null
  match_fields: string[]
  created_at: string
}

export type ChildIdentityInput = {
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  suburb: string
}

export async function checkChildIdentityDuplicates(
  ecdId: string,
  child: ChildIdentityInput,
  excludeParentId?: string
): Promise<ChildIdentityMatch[]> {
  const admin = createAdminClient()

  const { data, error } = await admin.rpc('check_child_identity_duplicates', {
    p_ecd_id: ecdId,
    p_first_name: child.first_name.trim(),
    p_last_name: child.last_name.trim(),
    p_dob: child.date_of_birth,
    p_gender: child.gender.trim(),
    p_suburb: child.suburb.trim(),
    p_exclude_parent_id: excludeParentId ?? null,
  })

  if (error || !data) {
    console.error('[child-identity] Error checking duplicates:', error)
    return []
  }

  return data as ChildIdentityMatch[]
}

export async function recordChildIdentity(
  ecdId: string,
  child: ChildIdentityInput,
  parentId: string,
  childId: string,
  applicationId: string
): Promise<string | null> {
  const admin = createAdminClient()

  const { data, error } = await admin.rpc('record_child_identity', {
    p_ecd_id: ecdId,
    p_first_name: child.first_name.trim(),
    p_last_name: child.last_name.trim(),
    p_dob: child.date_of_birth,
    p_gender: child.gender.trim(),
    p_suburb: child.suburb.trim(),
    p_parent_id: parentId,
    p_child_id: childId,
    p_application_id: applicationId,
  })

  if (error) {
    console.error('[child-identity] Error recording identity:', error)
    return null
  }

  return data
}

export async function verifyChildIdentityNotDuplicate(identityId: string, ecdAdminId: string): Promise<boolean> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('child_identities')
    .update({
      verified_by_ecd: true,
      ecd_verified_at: new Date().toISOString(),
      ecd_verified_by: ecdAdminId,
    })
    .eq('id', identityId)

  if (error) {
    console.error('[child-identity] Error verifying identity:', error)
    return false
  }

  return true
}
