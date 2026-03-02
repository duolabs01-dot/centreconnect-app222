import type { Metadata } from 'next'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { PickupVerifyClient } from './pickup-verify-client'

export const metadata: Metadata = {
  title: 'Pickup Verification - CentreConnect',
  description: "Verify a parent's pickup code before releasing a child.",
}

export default async function EcdPickupPage() {
  const { user, ecdId, role } = await requireEcdPortalSession()

  return (
    <EcdOsShell
      title="Pickup Verification"
      description="Verify a parent's pickup code before releasing a child."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <div className="space-y-4">
        <section>
          <h1 className="text-2xl font-bold text-slate-900">Pickup Verification</h1>
          <p className="mt-1 text-sm text-slate-600">
            Verify a parent&apos;s pickup code before releasing a child.
          </p>
        </section>
        <PickupVerifyClient ecdId={ecdId} />
      </div>
    </EcdOsShell>
  )
}



