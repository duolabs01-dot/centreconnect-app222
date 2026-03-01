import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BrowserNotificationBridge } from '@/components/notifications/browser-notification-bridge'

export default async function ParentAuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (existingProfile?.role !== 'parent_user') {
    // If not a parent profile yet, check if we need to bootstrap it or redirect
    // (This part is simplified from previous layout as bootstrap is often handled by ensure-profile API)
    redirect('/login?error=unauthorized')
  }

  return (
    <div className="animate-in fade-in duration-200">
      <BrowserNotificationBridge mode="parent" parentId={user.id} />
      {children}
    </div>
  )
}
