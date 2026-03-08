import type { Metadata } from 'next'
import HomeClientPage from './page.client'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const revalidate = 3600

type UserRole = 'platform_admin' | 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | 'parent_user' | null

export const metadata: Metadata = {
  title: 'CentreConnect - Find ECD Crèches Near You',
  description: 'Browse trusted ECD crèches, compare options, and track your applications in one place.',
  openGraph: {
    images: ['/og-image.png'],
  },
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { source?: string }
}) {
  if (searchParams?.source === 'pwa') {
    redirect('/')
  }

  let supabase: Awaited<ReturnType<typeof createClient>> | null = null
  let user: { id: string } | null = null

  try {
    supabase = await createClient()
    const userResult = await supabase.auth.getUser()
    user = (userResult.data?.user as { id: string } | null) ?? null
  } catch (error) {
    console.error('[home] Failed to initialize Supabase session context:', error)
  }

  let role: UserRole = null

  if (user && supabase) {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      role = (profile?.role as UserRole | undefined) ?? null
    } catch (error) {
      console.error('[home] Failed to load user profile role:', error)
      role = null
    }

    if (role === 'platform_admin') {
      redirect('/admin/command')
    }
    if (role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor') {
      redirect('/ecd/dashboard')
    }
    if (role === 'parent_user') {
      redirect('/parent/dashboard')
    }
  }

  return <HomeClientPage />
}
