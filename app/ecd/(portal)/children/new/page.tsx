import type { Metadata } from 'next'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { ChildEnrollmentWizard } from './child-enrollment-wizard'

export const metadata: Metadata = {
  title: 'Add New Child | CentreConnect',
  description: 'Rich manual child enrollment wizard with medical details, guardians, immunization records, and AI photo extraction.',
}

export default async function EcdAddChildWizardPage() {
  const { supabase, user, role, ecdId } = await requireEcdPortalSession()

  const { data: centre } = await supabase
    .from('ecd_centres')
    .select('name')
    .eq('id', ecdId)
    .maybeSingle()

  const { data: classes } = await supabase
    .from('ecd_classes')
    .select('id, name, age_group')
    .eq('ecd_id', ecdId)
    .order('name')

  const centreName = centre?.name?.trim() || 'Your Centre'

  return (
    <EcdOsShell
      title="Add New Child"
      description="Create a complete child profile with medical, guardians, immunization, and AI-assisted document pre-fill."
      roleLabel={role === 'ecd_admin' ? 'Creche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <section className="mx-auto w-full max-w-7xl space-y-6 px-1 py-2 sm:py-3">
        <ChildEnrollmentWizard centreName={centreName} classes={classes ?? []} />
      </section>
    </EcdOsShell>
  )
}
