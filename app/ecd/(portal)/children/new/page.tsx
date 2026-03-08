import type { Metadata } from 'next'
import Link from 'next/link'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { Button } from '@/components/ui/button'
import { ChildEnrollmentWizard } from './child-enrollment-wizard'
import { QuickStartChildren } from './quick-start-children'

export const metadata: Metadata = {
  title: 'Add Children | CentreConnect',
  description: 'Quickly add the first 5 children, then finish full child profiles when you need more detail.',
}

function getPrimaryGuardian(raw: unknown) {
  if (!Array.isArray(raw)) return { parent_name: '', parent_phone: '', parent_email: '' }

  const match = raw.find((entry) => {
    if (!entry || typeof entry !== 'object') return false
    const record = entry as Record<string, unknown>
    return typeof record.phone === 'string' || typeof record.email === 'string' || typeof record.full_name === 'string'
  })

  if (!match || typeof match !== 'object') {
    return { parent_name: '', parent_phone: '', parent_email: '' }
  }

  const record = match as Record<string, unknown>
  return {
    parent_name: typeof record.full_name === 'string' ? record.full_name : '',
    parent_phone: typeof record.phone === 'string' ? record.phone : '',
    parent_email: typeof record.email === 'string' ? record.email : '',
  }
}

export default async function EcdAddChildWizardPage() {
  const { supabase, user, role, ecdId } = await requireEcdPortalSession()

  const [centreResult, classesResult, pendingChildrenResult] = await Promise.all([
    supabase
      .from('ecd_centres')
      .select('name')
      .eq('id', ecdId)
      .maybeSingle(),
    supabase
      .from('ecd_classes')
      .select('id, name, age_group')
      .eq('ecd_id', ecdId)
      .order('name'),
    supabase
      .from('children')
      .select('id, first_name, last_name, enrollment_start_date, guardian_contacts, parent_id')
      .eq('ecd_id', ecdId)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const centreName = centreResult.data?.name?.trim() || 'Your Centre'
  const classes = classesResult.data ?? []
  const pendingParentChildren = (pendingChildrenResult.data ?? []).map((child: any) => {
    const guardian = getPrimaryGuardian(child.guardian_contacts)
    return {
      id: String(child.id),
      first_name: typeof child.first_name === 'string' ? child.first_name : 'Child',
      last_name: typeof child.last_name === 'string' ? child.last_name : '',
      enrollment_start_date: typeof child.enrollment_start_date === 'string' ? child.enrollment_start_date : '',
      parent_name: guardian.parent_name,
      parent_phone: guardian.parent_phone,
      parent_email: guardian.parent_email,
    }
  })

  return (
    <EcdOsShell
      title="Add Children"
      description="Move the first 5 children from the paper register to CentreConnect in minutes."
      roleLabel={role === 'ecd_admin' ? 'Creche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <section className="mx-auto w-full max-w-7xl space-y-6 px-1 py-2 sm:py-3">
        <QuickStartChildren centreName={centreName} classes={classes} pendingParentChildren={pendingParentChildren} />

        <div id="full-child-profile" className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">Need more detail?</p>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Use the full child profile</h2>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                This is where you capture medical details, guardians, documents, and the full parent handoff in one go.
              </p>
            </div>
            <Button variant="outline" asChild className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              <Link href="#quick-add">Back to quick add</Link>
            </Button>
          </div>
          <ChildEnrollmentWizard centreName={centreName} classes={classes} />
        </div>
      </section>
    </EcdOsShell>
  )
}
