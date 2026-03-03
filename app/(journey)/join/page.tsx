import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { JoinClient } from './_components/join-client'

export const metadata: Metadata = {
  title: 'Accept Invite — CentreConnect',
  description: "Join a family on CentreConnect to co-manage your child's profile.",
}

type PageProps = {
  searchParams: { token?: string }
}

export default async function JoinPage({ searchParams }: PageProps) {
  const token = searchParams.token?.trim()

  if (!token) {
    redirect('/')
  }

  // Look up all guardian rows using the token (single invite can cover multiple children).
  const admin = createAdminClient()
  const { data: guardians } = await admin
    .from('guardians')
    .select(
      'id, full_name, child_id, linked_user_id, invite_token_expires_at, children(first_name, last_name), parents:parent_id(user_profiles(full_name))'
    )
    .eq('invite_token', token)
    .limit(50)

  const rows = guardians ?? []
  if (rows.length > 0) {
    const viewedAt = new Date().toISOString()
    try {
      await admin
        .from('guardians')
        .update({ invite_link_viewed_at: viewedAt })
        .eq('invite_token', token)
        .is('invite_link_viewed_at', null)
    } catch {
      // Invite lifecycle tracking is optional during rollout.
    }
  }
  const expired =
    rows.length === 0 ||
    rows.every((row) => !row.invite_token_expires_at || new Date(row.invite_token_expires_at) < new Date())
  const alreadyLinked = rows.length > 0 && rows.every((row) => Boolean(row.linked_user_id))

  const childNames = Array.from(
    new Set(
      rows
        .map((row) => {
          const rawChild = row.children
          const child = Array.isArray(rawChild) ? rawChild[0] : rawChild
          if (!child) return null
          return `${child.first_name} ${child.last_name}`.trim()
        })
        .filter((value): value is string => Boolean(value))
    )
  )
  const childName =
    childNames.length === 0 ? 'your child' : childNames.length === 1 ? childNames[0] : `${childNames.length} children`

  const firstGuardian = rows[0] ?? null
  const rawParent = (firstGuardian as any)?.parents
  const parentProfile = Array.isArray(rawParent) ? rawParent[0]?.user_profiles : rawParent?.user_profiles
  const inviterName = (Array.isArray(parentProfile) ? parentProfile[0]?.full_name : parentProfile?.full_name) || 'Your co-parent'

  // Check if user is already logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <JoinClient
      token={token}
      expired={expired}
      alreadyLinked={alreadyLinked}
      isLoggedIn={!!user}
      childName={childName}
      childNames={childNames}
      inviterName={inviterName}
      guardianName={firstGuardian?.full_name ?? ''}
    />
  )
}
