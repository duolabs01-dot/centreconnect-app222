import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PreferencesForm } from '@/components/parent/PreferencesForm'

export const metadata: Metadata = {
  title: 'Preferences | Parent Portal | CentreConnect',
  description: 'Tell us your budget, distance, and transport preferences to get smarter centre suggestions.',
}

export default async function ParentPreferencesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/parent/preferences')
  }

  const { data: parentProfile } = await supabase
    .from('parents')
    .select(
      'max_monthly_budget,preferred_radius_km,preferred_suburbs,transport_needed,preferred_start_month'
    )
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Smart Preferences</p>
        <h1 className="text-3xl font-bold text-foreground">Set Preferences</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Distance, budget, and transport filters help us recommend the exact centres you want to see. Update
          them whenever your needs shift.
        </p>
      </header>

      <PreferencesForm
        initial={{
          max_monthly_budget: parentProfile?.max_monthly_budget ?? null,
          preferred_radius_km: parentProfile?.preferred_radius_km ?? null,
          preferred_suburbs: parentProfile?.preferred_suburbs ?? null,
          transport_needed: parentProfile?.transport_needed ?? null,
          preferred_start_month: parentProfile?.preferred_start_month ?? null,
        }}
      />
    </div>
  )
}
