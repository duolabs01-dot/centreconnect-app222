import Link from 'next/link'
import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { evaluateParentIntakeReadiness } from '@/lib/admissions/intake-readiness'
import { SurfaceCard } from '@/components/ui/surface-card'
import { cn } from '@/lib/utils'

type ReadinessAction = {
  key: string
  label: string
  href: string
}

const ACTIONS_BY_MISSING_CODE: Record<string, ReadinessAction> = {
  parent_name: { key: 'profile', label: 'Complete profile details', href: '/parent/profile' },
  parent_phone: { key: 'profile', label: 'Complete profile details', href: '/parent/profile' },
  guardian_relationship: { key: 'profile', label: 'Complete profile details', href: '/parent/profile' },
  emergency_contact_name: { key: 'emergency', label: 'Add emergency contact', href: '/parent/profile/emergency' },
  emergency_contact_phone: { key: 'emergency', label: 'Add emergency contact', href: '/parent/profile/emergency' },
  id_document: { key: 'documents', label: 'Upload parent ID', href: '/parent/profile/documents' },
  child_document: { key: 'documents', label: 'Upload child document', href: '/parent/profile/documents' },
  child_profile: { key: 'child', label: 'Add a child profile', href: '/parent/children/new' },
}

function mapReadinessActions(missingCodes: string[]) {
  const seen = new Set<string>()
  const actions: ReadinessAction[] = []

  for (const code of missingCodes) {
    const action = ACTIONS_BY_MISSING_CODE[code]
    if (!action || seen.has(action.key)) continue
    seen.add(action.key)
    actions.push(action)
  }

  return actions
}

export async function ProfileReadinessCard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [profileResult, parentResult, docsResult, childrenCountResult] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('full_name,phone')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('parents')
      .select('guardian_relationship,emergency_contact_name,emergency_contact_phone,id_verification_status')
      .eq('id', user.id)
      .maybeSingle(),
    supabase.from('parent_documents').select('doc_type').eq('parent_id', user.id).limit(100),
    supabase.from('children').select('id', { count: 'exact', head: true }).eq('parent_id', user.id),
  ])

  const readiness = evaluateParentIntakeReadiness({
    parent: {
      fullName: profileResult.data?.full_name,
      phone: profileResult.data?.phone,
      guardianRelationship: parentResult.data?.guardian_relationship,
      emergencyContactName: parentResult.data?.emergency_contact_name,
      emergencyContactPhone: parentResult.data?.emergency_contact_phone,
      idVerificationStatus: parentResult.data?.id_verification_status,
    },
    docTypes: (docsResult.data ?? []).map((doc) => doc.doc_type),
    hasAtLeastOneChild: (childrenCountResult.count ?? 0) > 0,
  })

  const actions = mapReadinessActions(readiness.missingCodes).slice(0, 3)

  return (
    <SurfaceCard className="animate-in fade-in slide-in-from-bottom-2 duration-500 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Readiness health</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">Profile progress</h2>
        </div>
        <div
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black',
            readiness.ready
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          )}
        >
          {readiness.ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {readiness.completionPct}% ready
        </div>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            readiness.ready ? 'bg-emerald-500' : 'bg-cyan-600'
          )}
          style={{ width: `${readiness.completionPct}%` }}
        />
      </div>

      {actions.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-slate-600">
            Next best actions:
          </p>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Link
                key={action.key}
                href={action.href}
                className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-cyan-300 hover:text-cyan-700"
              >
                {action.label}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-emerald-700">All key setup actions are complete.</p>
      )}
    </SurfaceCard>
  )
}

export function ProfileReadinessCardSkeleton() {
  return (
    <SurfaceCard className="p-5 sm:p-6">
      <div className="space-y-3">
        <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-2 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-10 w-56 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </SurfaceCard>
  )
}
