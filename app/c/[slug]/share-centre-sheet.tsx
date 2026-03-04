'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ExternalLink, Send, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type ShareCentreSheetProps = {
  centreName: string
  centreSlug: string
  suburb: string | null
  city: string | null
}

type ShareContact = {
  id: string
  name: string
  phone: string
  label: 'Co-parent' | 'Guardian'
}

function toWhatsappNumber(raw: string) {
  return raw.replace(/[^\d]/g, '')
}

function dedupeContacts(rows: ShareContact[]) {
  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = toWhatsappNumber(row.phone)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function ShareCentreSheet({ centreName, centreSlug, suburb, city }: ShareCentreSheetProps) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contacts, setContacts] = useState<ShareContact[]>([])
  const [authRequired, setAuthRequired] = useState(false)

  const locationLabel = [suburb, city].filter(Boolean).join(', ')
  const shareUrl =
    typeof window === 'undefined' ? `/c/${centreSlug}` : `${window.location.origin}/c/${centreSlug}`
  const shareText = `Check out ${centreName}${locationLabel ? ` in ${locationLabel}` : ''} on CentreConnect: ${shareUrl}`
  const supportsNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const whatsappGenericHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  const hasContacts = contacts.length > 0
  const sortedContacts = useMemo(
    () => [...contacts].sort((a, b) => a.label.localeCompare(b.label) || a.name.localeCompare(b.name)),
    [contacts]
  )

  async function handleNativeShare() {
    if (!supportsNativeShare) return
    try {
      await navigator.share({
        title: centreName,
        text: `Take a look at ${centreName} on CentreConnect`,
        url: shareUrl,
      })
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        toast.error('Could not open share menu')
      }
    }
  }

  async function loadContacts() {
    setLoadingContacts(true)
    setAuthRequired(false)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setContacts([])
        setAuthRequired(true)
        return
      }

      const [coParentsResult, guardiansResult] = await Promise.allSettled([
        supabase
          .from('parent_guardians')
          .select('id,full_name,phone,status')
          .eq('parent_id', user.id)
          .not('phone', 'is', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('guardians')
          .select('id,full_name,phone,relationship')
          .eq('parent_id', user.id)
          .not('phone', 'is', null)
          .order('created_at', { ascending: false }),
      ])

      const coParentsData =
        coParentsResult.status === 'fulfilled' && !coParentsResult.value.error
          ? coParentsResult.value.data ?? []
          : []
      const guardiansData =
        guardiansResult.status === 'fulfilled' && !guardiansResult.value.error
          ? guardiansResult.value.data ?? []
          : []

      const coParentRows = coParentsData.map((row) => ({
        id: `co-${row.id}`,
        name: row.full_name?.trim() || 'Co-parent',
        phone: row.phone ?? '',
        label: 'Co-parent' as const,
      }))

      const guardianRows = guardiansData.map((row) => ({
        id: `g-${row.id}`,
        name: row.full_name?.trim() || row.relationship?.trim() || 'Guardian',
        phone: row.phone ?? '',
        label: 'Guardian' as const,
      }))

      const merged = dedupeContacts([...coParentRows, ...guardianRows])
      setContacts(merged)
    } catch (error: any) {
      toast.error(error?.message || 'Could not load saved contacts')
    } finally {
      setLoadingContacts(false)
    }
  }

  async function handleOpen() {
    setOpen(true)
    await loadContacts()
  }

  if (!open) {
    return (
      <Button onClick={handleOpen} variant="outline" className="gap-2">
        <Send className="h-4 w-4" />
        Share Centre
      </Button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={() => setOpen(false)}
    >
      <Card
        className="glass-modal w-full max-w-xl space-y-4 rounded-t-2xl p-0 sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Share {centreName}</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-9 w-9 rounded-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <p className="text-sm text-slate-600">
            Share this centre with your support network. Saved co-parent and guardian contacts appear below.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {supportsNativeShare ? (
              <Button onClick={handleNativeShare} className="h-11 rounded-2xl gap-2">
                <Send className="h-4 w-4" />
                Share Now
              </Button>
            ) : null}
            <Button asChild variant="outline" className="h-11 rounded-2xl gap-2">
              <a href={whatsappGenericHref} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-700" />
              <p className="text-sm font-semibold text-slate-900">Share to saved contacts</p>
            </div>

            {loadingContacts ? <p className="text-sm text-slate-500">Loading contacts...</p> : null}

            {!loadingContacts && authRequired ? (
              <p className="text-sm text-slate-500">
                Sign in to send directly to your co-parent and guardian contacts.{' '}
                <Link href={`/login?next=${encodeURIComponent(`/c/${centreSlug}`)}`} className="font-semibold text-cyan-700">
                  Sign in
                </Link>
              </p>
            ) : null}

            {!loadingContacts && !authRequired && !hasContacts ? (
              <p className="text-sm text-slate-500">
                No saved contacts yet. Add co-parent or guardian profiles in{' '}
                <Link href="/parent/profile/guardians" className="font-semibold text-cyan-700">
                  Me &rarr; Co-Guardians
                </Link>
                .
              </p>
            ) : null}

            {!loadingContacts && hasContacts ? (
              <div className="space-y-2">
                {sortedContacts.map((contact) => {
                  const whatsappHref = `https://wa.me/${toWhatsappNumber(contact.phone)}?text=${encodeURIComponent(shareText)}`
                  return (
                    <div key={contact.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                          <p className="text-xs text-slate-500">
                            {contact.label} - {contact.phone}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            asChild
                            variant="outline"
                            className="h-8 rounded-2xl border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            <a href={whatsappHref} target="_blank" rel="noreferrer">
                              WhatsApp
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
