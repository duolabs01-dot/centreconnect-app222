import type { Metadata } from 'next'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { PickupVerifyClient } from './pickup-verify-client'

export const metadata: Metadata = {
  title: 'Pickup Verification - CentreConnect',
  description: "Verify a parent's pickup code before releasing a child.",
}

export default async function EcdPickupPage() {
  const { user, ecdId, role } = await requireEcdPortalSession()

  return (
    <>
      <div className="space-y-4">
        <section>
          <h1 className="text-2xl font-bold text-slate-900">Pickup Verification</h1>
          <p className="mt-1 text-sm text-slate-600">
            Verify a parent&apos;s pickup code before releasing a child.
          </p>
        </section>
        <PickupVerifyClient ecdId={ecdId} />
      </div>
    </>
  )
}




