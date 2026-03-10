import { redirect } from 'next/navigation'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { resolveFirstName } from '@/lib/utils/name'
import { ActivateAccountClient } from './activate-account-client'

type UserRole = 'platform_admin' | 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | 'parent_user'

function toDashboardPath(role: UserRole | string | null | undefined) {
  if (role === 'platform_admin') return '/admin/dashboard'
  if (role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor') return '/ecd/dashboard'
  return '/parent/dashboard'
}

function roleLabel(role: UserRole | string | null | undefined) {
  if (role === 'platform_admin') return 'Platform Admin'
  if (role === 'ecd_admin') return 'ECD Admin'
  if (role === 'ecd_staff') return 'ECD Staff'
  if (role === 'ecd_supervisor') return 'ECD Supervisor'
  return 'Parent'
}

export default async function ActivateAccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/account/activate')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role,first_name,surname,full_name,email,account_activation_required,activation_reason,activation_requested_at')
    .eq('id', user.id)
    .maybeSingle()

  const role = (profile?.role as UserRole | null) ?? 'parent_user'
  const redirectPath = toDashboardPath(role)

  if (!profile?.account_activation_required) {
    redirect(redirectPath)
  }

  const email = (user.email ?? profile?.email ?? '').trim()
  const firstName = resolveFirstName({
    firstName: profile?.first_name ?? null,
    fullName: profile?.full_name ?? null,
    email,
    fallback: 'Friend',
  })
  const fullName = [profile?.first_name, profile?.surname].filter(Boolean).join(' ').trim() || profile?.full_name || firstName

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#f8fafc_46%,#eef2ff_100%)] px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <Card className="border-cyan-100 bg-white/95 shadow-[var(--shadow-elevation-2)] backdrop-blur">
          <CardHeader className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Final step</p>
            <CardTitle className="text-2xl font-black text-slate-900">Hi {firstName}, activate your account</CardTitle>
            <p className="text-sm text-slate-600">
              Your details are ready. Please confirm activation before opening your dashboard.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Name</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{fullName}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Email</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 break-all">{email || '-'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Role</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{roleLabel(role)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Requested</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {profile?.activation_requested_at
                    ? new Date(profile.activation_requested_at).toLocaleString('en-ZA', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'Pending'}
                </p>
              </div>
            </div>

            {profile?.activation_reason ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {profile.activation_reason}
              </div>
            ) : null}

            <ActivateAccountClient defaultRedirectTo={redirectPath} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

