import Link from 'next/link'
import { notFound } from 'next/navigation'

import { normalizeAppUrl } from '@/lib/auth/onboarding-links'
import { createClient } from '@/lib/supabase/server'
import { PrintPosterButton } from './print-button'

type CentrePosterRow = {
  slug: string | null
  name: string | null
  logo_url: string | null
  cover_image_url: string | null
  suburb: string | null
  city: string | null
}

const FALLBACK_HERO =
  'https://thumbs.dreamstime.com/b/young-african-preschool-kids-playing-playground-kindergarten-school-soweto-south-africa-july-180790376.jpg'

function toText(value: string | null | undefined, fallback: string) {
  const next = (value ?? '').trim()
  return next.length > 0 ? next : fallback
}

function locationLabel(suburb: string | null | undefined, city: string | null | undefined) {
  const bits = [suburb, city].map((value) => (value ?? '').trim()).filter(Boolean)
  return bits.length > 0 ? bits.join(', ') : 'your area'
}

function isSafeImage(value: string | null | undefined) {
  const next = (value ?? '').trim()
  if (!next) return false
  try {
    const parsed = new URL(next)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

async function loadCentre(slug: string) {
  const supabase = await createClient()
  const selectColumns = 'slug,name,logo_url,cover_image_url,suburb,city'

  const { data: publicCentre } = await supabase
    .from('public_ecd_centres')
    .select(selectColumns)
    .eq('slug', slug)
    .maybeSingle()

  if (publicCentre) {
    return publicCentre as CentrePosterRow
  }

  const { data: fallbackCentre } = await supabase
    .from('ecd_centres')
    .select(selectColumns)
    .eq('slug', slug)
    .maybeSingle()

  if (fallbackCentre) {
    return fallbackCentre as CentrePosterRow
  }

  return null
}

export default async function CentrePosterPage({
  params,
}: {
  params: { slug: string }
}) {
  const slug = (params.slug ?? '').trim().toLowerCase()
  if (!slug) notFound()

  const centre = await loadCentre(slug)
  if (!centre) notFound()

  const centreName = toText(centre.name, 'Your Centre')
  const location = locationLabel(centre.suburb, centre.city)
  const heroImage = isSafeImage(centre.cover_image_url) ? (centre.cover_image_url as string) : FALLBACK_HERO
  const logoImage = isSafeImage(centre.logo_url) ? (centre.logo_url as string) : null

  const appUrl = normalizeAppUrl()
  const centreUrl = `${appUrl}/centre/${slug}`
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?format=svg&size=900x900&ecc=Q&qzone=2&data=${encodeURIComponent(
    centreUrl
  )}`

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #fff !important; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-[820px] rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.12)] print:rounded-none print:border-0 print:shadow-none">
        <header className="relative overflow-hidden border-b border-slate-200">
          <img
            src={heroImage}
            alt={`${centreName} children`}
            className="h-52 w-full object-cover sm:h-64"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/20 to-transparent" />
          <div className="absolute left-5 top-5 rounded-xl border border-white/40 bg-white/90 px-3 py-2">
            <img
              src="/centreconnect-logo.svg"
              alt="CentreConnect logo"
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="absolute bottom-5 left-5 right-5">
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{centreName}</h1>
            <p className="mt-1 text-sm text-cyan-100">{location}</p>
          </div>
        </header>

        <section className="grid gap-6 p-6 sm:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Family Notice</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Find {centreName} on CentreConnect
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Stay close to your child&apos;s day with simple updates, trusted communication, and safer pickup flow.
            </p>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Why parents scan this code:
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>- Daily updates in one calm place</li>
                <li>- Simple communication with your centre team</li>
                <li>- Safe pickup confidence for families</li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-3">
              <PrintPosterButton />
              <Link
                href={centreUrl}
                className="no-print inline-flex items-center rounded-2xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Preview Centre Page
              </Link>
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-teal-100 bg-teal-50 p-4 text-center">
            <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
              {logoImage ? (
                <img src={logoImage} alt={`${centreName} logo`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-black text-teal-700">
                  {centreName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
              Scan to open
            </p>
            <div className="rounded-2xl border border-teal-200 bg-white p-3 shadow-sm">
              <img src={qrSvgUrl} alt={`QR code for ${centreName}`} className="mx-auto h-56 w-56" />
            </div>
            <p className="break-all text-[11px] leading-relaxed text-slate-500">{centreUrl}</p>
          </div>
        </section>

        <footer className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs text-slate-500">
          CentreConnect | built for South African ECD communities
        </footer>
      </div>
    </main>
  )
}
