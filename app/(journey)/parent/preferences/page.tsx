import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PreferencesForm } from '@/components/parent/PreferencesForm'
import { LiteModeToggle } from '@/components/parent/LiteModeToggle'
import { SurfaceCard } from '@/components/ui/surface-card'

export const metadata: Metadata = {
  title: 'Preferences | Parent Portal | CentreConnect',
  description: 'Tell us your budget, distance, and transport preferences to get smarter crèche suggestions.',
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
    <div className="bg-surface-secondary px-4 pt-4 pb-28 min-h-screen">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600 mb-1">Smart Preferences</p>
        <h1 className="text-3xl font-bold text-slate-900">Set Preferences</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl">
          Distance, budget, and transport filters help us recommend the exact crèches you want to see. Update
          them whenever your needs shift.
        </p>
      </header>

      {/* Active preferences summary */}
      {(parentProfile?.max_monthly_budget || parentProfile?.preferred_radius_km || (parentProfile?.preferred_suburbs ?? []).length > 0) && (
        <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4 mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-700">Your current filters</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {parentProfile?.max_monthly_budget ? (
              <span className="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-800">
                Budget: up to R{parentProfile.max_monthly_budget}/mo
              </span>
            ) : null}
            {parentProfile?.preferred_radius_km ? (
              <span className="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-800">
                Within {parentProfile.preferred_radius_km} km
              </span>
            ) : null}
            {(parentProfile?.preferred_suburbs ?? []).map((suburb: string) => (
              <span key={suburb} className="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-800">
                {suburb}
              </span>
            ))}
            {parentProfile?.transport_needed ? (
              <span className="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-800">
                Transport needed
              </span>
            ) : null}
          </div>
          <div className="mt-3">
            <a
              href="/parent/discover"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-teal-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-teal-700"
            >
              See matching cr&egrave;ches &rarr;
            </a>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <PreferencesForm
          initial={{
            max_monthly_budget: parentProfile?.max_monthly_budget ?? null,
            preferred_radius_km: parentProfile?.preferred_radius_km ?? null,
            preferred_suburbs: parentProfile?.preferred_suburbs ?? null,
            transport_needed: parentProfile?.transport_needed ?? null,
            preferred_start_month: parentProfile?.preferred_start_month ?? null,
          }}
        />

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 px-1">App Performance</h2>
          <SurfaceCard className="p-4">
            <LiteModeToggle />
          </SurfaceCard>
        </section>
      </div>
    </div>
  )
}

