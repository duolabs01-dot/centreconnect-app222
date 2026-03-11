'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { acceptParentLinkRequestByToken } from '@/lib/ecd/parent-link-requests'

export async function acceptParentLinkAction(formData: FormData) {
  const token = String(formData.get('token') ?? '').trim()
  if (!token) {
    redirect('/account/link-child?error=missing-token')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/account/link-child?token=${token}`)}`)
  }

  const result = await acceptParentLinkRequestByToken({
    token,
    userId: user.id,
    email: user.email ?? null,
  })

  if (!result.ok) {
    redirect(`/account/link-child?token=${encodeURIComponent(token)}&error=${encodeURIComponent(result.message)}`)
  }

  redirect(`/account/link-child?linked=1&childId=${encodeURIComponent(result.childId ?? '')}`)
}
