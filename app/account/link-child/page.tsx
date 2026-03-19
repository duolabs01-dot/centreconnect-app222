import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, Heart, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { peekParentLinkRequestByToken } from '@/lib/ecd/parent-link-requests'
import { acceptParentLinkAction } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'Link Child Profile | CentreConnect',
  description: 'Confirm your child profile and start receiving your creche updates in one place.',
}

type LinkChildPageProps = {
  searchParams?:
    | {
        token?: string
        linked?: string
        error?: string
        childId?: string
      }
    | Promise<{
        token?: string
        linked?: string
        error?: string
        childId?: string
      }>
}

function friendlyError(value: string | undefined) {
  const text = String(value ?? '').trim()
  if (!text) return null
  if (text === 'missing-token') return 'This family link is incomplete. Please open the full email link again.'
  return text
}

export default async function LinkChildPage({ searchParams }: LinkChildPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams)
  const linked = resolvedSearchParams?.linked === '1'
  const error = friendlyError(resolvedSearchParams?.error)
  const token = String(resolvedSearchParams?.token ?? '').trim()

  if (!linked && !token) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-black text-slate-900">This family link is missing something.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
              <p>Please open the full email link from your creche, or sign in and try again.</p>
              <Button asChild className="rounded-2xl bg-cyan-600 text-white hover:bg-cyan-700">
                <Link href="/login">Sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  if (linked) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <Card className="rounded-[2rem] border-emerald-200 bg-white shadow-sm">
            <CardHeader className="space-y-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Family link complete
              </div>
              <CardTitle className="text-2xl font-black text-slate-900">You are in. Your child profile is now connected.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
              <p>
                Welcome to CentreConnect. You are about to experience the easiest way to stay close to your child&apos;s creche: daily updates,
                announcements, messages, and the little moments that matter most.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="rounded-2xl bg-cyan-600 text-white hover:bg-cyan-700">
                  <Link href="/parent/dashboard">Open parent home</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                  <Link href="/parent/children">View child profile</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/account/link-child?token=${token}`)}`)
  }

  const request = await peekParentLinkRequestByToken(token)
  if (!request) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <Card className="rounded-[2rem] border-amber-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-black text-slate-900">This family link is no longer active.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
              <p>Please ask your creche to send a fresh CentreConnect family email.</p>
              <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                <Link href="/parent/dashboard">Go to parent home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="rounded-[2rem] border-cyan-200 bg-white shadow-sm">
          <CardHeader className="space-y-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">
              <Heart className="h-3.5 w-3.5" />
              Parent welcome
            </div>
            <CardTitle className="text-2xl font-black text-slate-900">
              {request.centreName} is ready to connect {request.childName} with you.
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
            {error ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">{error}</div>
            ) : null}
            <p>
              You are about to unlock the best version of creche communication: warm daily updates, clear announcements, shared documents,
              and one trusted place for everything your family needs.
            </p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Child:</span> {request.childName}</p>
              <p><span className="font-semibold text-slate-900">Creche:</span> {request.centreName}</p>
              <p><span className="font-semibold text-slate-900">Your email:</span> {request.summary.parentEmail}</p>
            </div>
            <form action={acceptParentLinkAction}>
              <input type="hidden" name="token" value={token} />
              <Button type="submit" className="rounded-2xl bg-cyan-600 text-white hover:bg-cyan-700">
                <Mail className="mr-2 h-4 w-4" />
                Link my child profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

