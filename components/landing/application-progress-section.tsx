'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText, LogIn, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/button'

type ApplicationPreview = {
  id: string
  status: string
  submitted_at: string
  ecd_centres:
    | {
        name: string | null
        logo_url: string | null
      }
    | Array<{
        name: string | null
        logo_url: string | null
      }>
    | null
  children:
    | {
        first_name: string | null
        last_name: string | null
      }
    | Array<{
        first_name: string | null
        last_name: string | null
      }>
    | null
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export function ApplicationProgressSection() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [items, setItems] = useState<ApplicationPreview[]>([])

  useEffect(() => {
    let mounted = true
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!mounted) return

      if (!user) {
        setIsSignedIn(false)
        setLoading(false)
        return
      }

      setIsSignedIn(true)
      const { data } = await supabase
        .from('applications')
        .select('id,status,submitted_at,ecd_centres(name,logo_url),children(first_name,last_name)')
        .eq('parent_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(3)

      if (!mounted) return
      setItems(((data ?? []) as ApplicationPreview[]) ?? [])
      setLoading(false)
    }
    void run()
    return () => {
      mounted = false
    }
  }, [supabase])

  if (loading) {
    return (
      <section className="glass-card rounded-2xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">Application Progress</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="h-20 animate-pulse-slow rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      </section>
    )
  }

  if (!isSignedIn) {
    return (
      <section className="glass-card rounded-2xl p-4 sm:p-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50">
            <FileText className="h-7 w-7 text-cyan-600" />
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-900">Track Your Applications</h3>
          <p className="mt-1 text-sm text-slate-600">
            Log in to view status updates, centre responses, and next actions for each child.
          </p>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Log in to see progress
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/directory">
                Browse centres
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="glass-card rounded-2xl p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900">Your Applications</h3>
      <p className="mt-1 text-sm text-slate-600">Recent activity for your child applications.</p>
      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">No applications yet</p>
          <p className="mt-1 text-xs text-slate-600">Start with directory search to apply to a centre.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const centre = one(item.ecd_centres)
            const child = one(item.children)
            const childName = [child?.first_name ?? '', child?.last_name ?? ''].join(' ').trim() || 'Child'
            return (
              <Link key={item.id} href={`/parent/applications/${item.id}`} className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50">
                <p className="text-sm font-semibold text-slate-900">{centre?.name ?? 'ECD Centre'}</p>
                <p className="mt-1 text-xs text-slate-600">{childName}</p>
                <div className="mt-3">
                  <StatusBadge status={item.status} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}



