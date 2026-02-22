import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import { NextBestActionStrip } from '@/components/parent/next-best-action-strip'

export const metadata: Metadata = {
  title: 'Parent Profile Hub | CentreConnect',
  description: 'Manage your parent account, family details, and communication settings.',
}

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

    return (
      <div className="cc-page">
        <section>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Parent Profile Hub</h1>
          <p className="mt-1 text-sm text-slate-600">Keep your details complete to unlock better matches and faster decisions from centres.</p>
        </section>

        <NextBestActionStrip
          title="Complete your parent profile"
          hint="Budget, suburbs, and transport preferences help surface better-fit centres."
          actions={[
            { label: 'Edit Profile', href: '/parent/profile/edit' },
            { label: 'Manage Children', href: '/parent/children' },
            { label: 'Find Centres', href: '/directory' },
          ]}
        />

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>{userProfile?.full_name ?? 'Parent user'} {userProfile?.phone ? `- ${userProfile.phone}` : ''}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button className="h-12 justify-start bg-violet-600 hover:bg-violet-500" asChild>
              <Link href="/parent/profile/edit">Edit Profile</Link>
            </Button>
            <Button variant="outline" className="h-12 justify-start border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100" asChild>
              <Link href="/parent/notifications">Notifications</Link>
            </Button>
            <Button variant="outline" className="h-12 justify-start border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100" asChild>
              <Link href="/parent/profile/security">Security & Activity</Link>
            </Button>
            <Button variant="outline" className="h-12 justify-start border-lime-200 bg-lime-50 text-lime-900 hover:bg-lime-100" asChild>
              <Link href="/parent/profile/documents">Documents Vault</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Family Profiles</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button asChild>
              <Link href="/parent/children">Manage Children</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/parent/children/new">Add Child</Link>
            </Button>
            <Button variant="outline" className="border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100" asChild>
              <Link href="/parent/profile/emergency">Emergency Contacts</Link>
            </Button>
            <Button variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100" asChild>
              <Link href="/parent/profile/guardians">Co-Guardians</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Applications</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" className="border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100" asChild>
              <Link href="/parent/applications">Track Applications</Link>
            </Button>
            <Button variant="outline" className="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900 hover:bg-fuchsia-100" asChild>
              <Link href="/parent/shortlist">Saved Centres</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}
