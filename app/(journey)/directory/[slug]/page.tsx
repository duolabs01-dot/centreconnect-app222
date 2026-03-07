import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { normalizeCentreSlug } from '@/lib/ecd/centre-slug'
import { createWhatsappClickToChatLink } from '@/lib/communications/whatsapp'
import { Container } from '@/components/layout/container'
import { MapPin, AlertTriangle } from 'lucide-react'
import { WaitlistNotificationForm } from '@/components/directory/WaitlistNotificationForm'

export const metadata: Metadata = {
  title: 'Centre profile - unclaimed listing',
  description: 'This centre has not joined CentreConnect yet. Claim the profile or contact them directly.',
}

type DirectorySlugPageProps = {
  params: {
    slug: string
  }
}

export default async function DirectorySlugPage({ params }: DirectorySlugPageProps) {
  const normalizedSlug = normalizeCentreSlug(params.slug)
  if (!normalizedSlug) return notFound()

  const supabase = await createClient()
  const [{ data: centre }, { data: ecdCentre }] = await Promise.all([
    supabase
      .from('public_ecd_centres')
      .select('id,name,tagline,suburb,city,slug,logo_url,cover_image_url')
      .eq('slug', normalizedSlug)
      .maybeSingle(),
    supabase
      .from('ecd_centres')
      .select('owner_id,contact_phone,phone')
      .eq('slug', normalizedSlug)
      .maybeSingle(),
  ])

  if (!centre) return notFound()
  if (ecdCentre?.owner_id) {
    redirect(`/c/${normalizedSlug}`)
  }

  const suburb = (centre.suburb ?? '').trim()
  const { data: areaCount } = suburb
    ? await supabase
        .from('area_search_counts')
        .select('count')
        .eq('suburb', suburb)
        .maybeSingle()
    : { data: null }

  const parentSearchCount = areaCount?.count ?? null
  const contactPhone = ecdCentre?.contact_phone ?? ecdCentre?.phone ?? null
  const whatsappLink = contactPhone
    ? createWhatsappClickToChatLink(
        contactPhone,
        `Hi, I found ${centre.name ?? 'this centre'} on CentreConnect and I'd like to enquire about a space.`
      )
    : null

  return (
    <Container className="py-12">
      <div className="space-y-8 rounded-[2.5rem] bg-white/90 p-8 shadow-2xl shadow-slate-900/10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm font-semibold text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>This centre hasn&apos;t joined CentreConnect yet. Details may be outdated.</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
            <MapPin className="h-4 w-4" />
            <span>Unclaimed listing</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900">{centre.name}</h1>
          {parentSearchCount ? (
            <p className="text-sm text-slate-500">
              {parentSearchCount.toLocaleString()} parents searched for crèches in this area this month
            </p>
          ) : null}
          {centre.tagline ? <p className="text-base text-slate-600">{centre.tagline}</p> : null}
          <p className="text-sm text-slate-500">
            {suburb ? `${suburb}` : ''} {centre.city ? `• ${centre.city}` : ''}
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-slate-100 bg-slate-50/80 p-6">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-slate-900">Parents are already looking for you</p>
            <p className="text-sm text-slate-500">
              Contact the centre directly on WhatsApp or let us know you want to be notified when online
              applications open.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={whatsappLink ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center rounded-2xl border border-transparent bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-md transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-disabled={!whatsappLink}
            >
              Contact on WhatsApp
            </a>
            <span className="text-xs text-slate-500">
              ⚠️ Number not verified by CentreConnect
            </span>
          </div>
          <div>
            <WaitlistNotificationForm slug={normalizedSlug} centreName={centre.name ?? 'this centre'} />
          </div>
        </div>

        <div className="text-sm text-slate-500">
          <Link
            href={`/ecd/claim?slug=${encodeURIComponent(normalizedSlug)}`}
            className="font-semibold text-cyan-600 underline-offset-4 transition hover:underline"
          >
            Own this centre? Claim your free listing →
          </Link>
        </div>
      </div>
    </Container>
  )
}
