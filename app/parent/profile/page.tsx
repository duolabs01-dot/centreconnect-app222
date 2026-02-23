import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Baby, Pencil, FileText, Phone, Users, ShieldCheck, ChevronRight, LogOut, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'

export const metadata: Metadata = {
  title: 'Parent Profile Hub | CentreConnect',
  description: 'Manage your parent account, family details, and communication settings.',
}

const sections = [
  {
    href: '/parent/children',
    icon: Baby,
    label: 'My Children',
    description: 'Profiles and details',
  },
  {
    href: '/parent/profile/edit',
    icon: Pencil,
    label: 'Edit Profile',
    description: 'Name, phone, contact info',
  },
  {
    href: '/parent/profile/documents',
    icon: FileText,
    label: 'Documents',
    description: 'ID, proof of residence, birth certificates',
  },
  {
    href: '/parent/profile/emergency',
    icon: Phone,
    label: 'Emergency Contacts',
    description: 'Who to call in an emergency',
  },
  {
    href: '/parent/profile/guardians',
    icon: Users,
    label: 'Co-Guardians',
    description: 'Other authorised adults',
  },
  {
    href: '/parent/profile/security',
    icon: ShieldCheck,
    label: 'Security',
    description: 'Password and sign-in activity',
  },
] as const

export default async function ParentProfilePage() {
  const perf = startRoutePerf('/parent/profile')
  const supabase = await createClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const userProfileResult = await supabase
      .from('user_profiles')
      .select('full_name,phone,avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    const userProfileFallback =
      userProfileResult.error &&
      typeof userProfileResult.error.message === 'string' &&
      userProfileResult.error.message.includes("'avatar_url' column")
        ? await supabase.from('user_profiles').select('full_name,phone').eq('id', user.id).maybeSingle()
        : null

    const userProfile = (userProfileFallback?.data ?? userProfileResult.data) as
      | { full_name: string | null; phone: string | null; avatar_url?: string | null }
      | null

    const parentName =
      userProfile?.full_name?.trim() ||
      (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '') ||
      'Parent'
    const userEmail = user.email ?? 'No email'
    const avatarUrl = userProfile?.avatar_url?.trim() ?? ''

    async function handleSignOut() {
      'use server'
      const serverClient = await createClient()
      await serverClient.auth.signOut()
      redirect('/')
    }

    return (
      <div className="cc-page">
        <div className="mb-4 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="rounded-2xl bg-gradient-to-br from-white/90 via-cyan-200/70 to-blue-200/70 p-[2px] shadow-[var(--shadow-elevation-3)]">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/20 text-2xl font-bold text-white">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={`${parentName} profile`} className="h-full w-full object-cover" />
                  ) : (
                    <span>{parentName?.[0]?.toUpperCase() ?? 'P'}</span>
                  )}
                </div>
              </div>
              <Link
                href="/parent/profile/edit"
                className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-white text-cyan-700 shadow-[var(--shadow-elevation-1)] transition-colors hover:bg-cyan-50"
                aria-label="Edit profile photo"
              >
                <Camera className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-bold">{parentName}</p>
              <p className="truncate text-sm text-cyan-100">{userEmail}</p>
              <Link href="/parent/profile/edit" className="mt-1 inline-flex text-xs font-semibold text-cyan-100 hover:text-white">
                Edit photo and details
              </Link>
            </div>
          </div>
        </div>

        <section className="space-y-3">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-cyan-300 hover:shadow-[var(--shadow-elevation-1)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50">
                <section.icon className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {section.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {section.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </Link>
          ))}
        </section>

        <form action={handleSignOut}>
          <button
            type="submit"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 p-4 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </form>
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}


