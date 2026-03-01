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

  // Look up the guardian record so we can show child name before login
  const admin = createAdminClient()
  const { data: guardian } = await admin
    .from('guardians')
    .select('id, full_name, child_id, linked_user_id, invite_token_expires_at, children(first_name, last_name), parents:parent_id(user_profiles(full_name))')
    .eq('invite_token', token)
    .maybeSingle()

  const expired = !guardian || !guardian.invite_token_expires_at || new Date(guardian.invite_token_expires_at) < new Date()
  const alreadyLinked = !!guardian?.linked_user_id

  // Get inviter name and child name
  const rawChild = guardian?.children
  const child = Array.isArray(rawChild) ? rawChild[0] : rawChild
  const rawParent = (guardian as any)?.parents
  const parentProfile = Array.isArray(rawParent) ? rawParent[0]?.user_profiles : rawParent?.user_profiles
  const inviterName = (Array.isArray(parentProfile) ? parentProfile[0]?.full_name : parentProfile?.full_name) || 'Your co-parent'
  const childName = child ? `${(child as any).first_name} ${(child as any).last_name}`.trim() : 'your child'

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
      inviterName={inviterName}
      guardianName={guardian?.full_name ?? ''}
    />
  )
}
