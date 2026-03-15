import Link from 'next/link'
import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getParentProgress } from '@/lib/parent/progress'
import { SurfaceCard } from '@/components/ui/surface-card'
import { cn } from '@/lib/utils'

type ReadinessAction = {
  key: string
  label: string
  href: string
}

const ACTIONS_BY_MISSING_CODE: Record<string, ReadinessAction> = {
  name: { key: 'profile', label: 'Add your name', href: '/parent/profile' },
  phone: { key: 'profile', label: 'Add phone number', href: '/parent/profile' },
  avatar: { key: 'avatar', label: 'Add profile photo', href: '/parent/profile' },
  relationship: { key: 'profile', label: 'Add relationship', href: '/parent/profile' },
  emergency: { key: 'emergency', label: 'Add emergency contact', href: '/parent/profile/emergency' },
}

function mapReadinessActions(missingFields: string[]): ReadinessAction[] {
  const seen = new Set<string>()
  const actions: ReadinessAction[] = []

  for (const field of missingFields) {
    let action = ACTIONS_BY_MISSING_CODE[field]
    if (!action) {
      if (field.includes('document')) {
        action = { key: 'documents', label: 'Upload documents', href: '/parent/profile/documents' }
      } else if (field.includes('child')) {
        action = { key: 'child', label: 'Add a child', href: '/parent/children/new' }
      }
    }
    if (!action || seen.has(action.key)) continue
    seen.add(action.key)
    actions.push(action)
  }

  return actions.slice(0, 3)
}

export async function ProfileReadinessCard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const progress = await getParentProgress(user.id)
  
  const missingFields = progress.nextAction.missingProfileFields
  const actions = mapReadinessActions(missingFields)

  return (
    <SurfaceCard className="animate-in fade-in slide-in-from-bottom-2 duration-500 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Your progress</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">Profile completeness</h2>
        </div>
        <div
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black',
            progress.profileCompleteness === 100
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          )}
        >
          {progress.profileCompleteness === 100 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {progress.profileCompleteness}% complete
        </div>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            progress.profileCompleteness === 100 ? 'bg-emerald-500' : 'bg-cyan-600'
          )}
          style={{ width: `${progress.profileCompleteness}%` }}
        />
      </div>

      {actions.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-slate-600">Do these next:</p>
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
        <p className="mt-4 text-sm text-emerald-700">Your profile is complete!</p>
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
