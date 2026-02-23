import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Baby, Pencil, FileText, Phone, Users, ShieldCheck, ChevronRight, LogOut } from 'lucide-react'
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

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('full_name,phone')
      .eq('id', user.id)
      .maybeSingle()

    const parentName =
      userProfile?.full_name?.trim() ||
      (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '') ||
      'Parent'
    const userEmail = user.email ?? 'No email'

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
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold text-white">
              {parentName?.[0]?.toUpperCase() ?? 'P'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-bold">{parentName}</p>
              <p className="truncate text-sm text-cyan-100">{userEmail}</p>
            </div>
          </div>
        </div>

        <section className="space-y-3">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-cyan-300 hover:shadow-sm"
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
