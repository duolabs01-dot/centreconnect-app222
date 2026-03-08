import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { normalizeAppUrl } from '@/lib/auth/onboarding-links'
import { createClient } from '@/lib/supabase/server'
import { PosterAnalyticsTracker } from './poster-analytics-tracker'
import { PrintPosterButton } from './print-button'

type CentrePosterRow = {
  id: string
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
  const selectColumns = 'id,slug,name,logo_url,cover_image_url,suburb,city'

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

function CentreLogo({ logoImage, centreName, size = 72 }: { logoImage: string | null; centreName: string; size?: number }) {
  const initials = centreName.slice(0, 2).toUpperCase()

  return (
    <div
      className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"
      style={{ width: size, height: size }}
    >
      {logoImage ? (
        <Image
          src={logoImage}
          alt={`${centreName} logo`}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          sizes={`${size}px`}
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-teal-50 text-lg font-black text-teal-700">
          {initials}
        </div>
      )}
    </div>
  )
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
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?format=svg&size=1200x1200&ecc=Q&qzone=2&data=${encodeURIComponent(
    centreUrl
  )}`

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #fff !important; }
          .poster-page { break-after: page; page-break-after: always; }
          .poster-page:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>

      <PosterAnalyticsTracker ecdId={centre.id} />

      <div className="no-print mx-auto mb-5 flex max-w-[820px] flex-wrap gap-3">
        <PrintPosterButton ecdId={centre.id} />
        <Link
          href={centreUrl}
          className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
        >
          Preview Centre Page
        </Link>
      </div>

      <div className="mx-auto flex max-w-[820px] flex-col gap-6 print:max-w-none print:gap-0">
        <section className="poster-page overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.12)] print:min-h-[277mm] print:rounded-none print:border-0 print:shadow-none">
          <header className="border-b border-slate-200 bg-[linear-gradient(135deg,#0f766e_0%,#14b8a6_100%)] px-6 py-5 text-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/80">Office QR sheet</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight">Keep this at the desk.</h1>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-right backdrop-blur-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/75">CentreConnect</p>
                <p className="mt-1 text-sm font-semibold text-white">Made for real parent enquiries.</p>
              </div>
            </div>
          </header>

          <div className="grid gap-6 p-6 sm:grid-cols-[1fr_260px] print:grid-cols-[1fr_220px]">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
                  <Image
                    src="/centreconnect-logo.svg"
                    alt="CentreConnect logo"
                    width={148}
                    height={36}
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <CentreLogo logoImage={logoImage} centreName={centreName} size={68} />
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-teal-700">For office use</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{centreName}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{location}</p>
              </div>

              <p className="text-sm leading-7 text-slate-700 print:text-[13px]">
                Let parents scan this code while they visit or collect forms. It opens your live CentreConnect page with
                centre details, contact information, and online application info.
              </p>

              <div className="grid gap-3 sm:grid-cols-3 print:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700">
                  Parents can see your centre profile in one calm place.
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700">
                  They get your location, contact details, and listing information quickly.
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700">
                  It feels more professional than sharing the same details on WhatsApp again and again.
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">Tip</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Print one copy for the office desk. Laminate it if you can. Parents will keep scanning it over time.
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-teal-100 bg-teal-50 p-4 text-center shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-teal-700">Scan to open</p>
              <div className="mt-3 rounded-[1.5rem] border border-teal-200 bg-white p-3 shadow-sm">
                <Image
                  src={qrSvgUrl}
                  alt={`QR code for ${centreName}`}
                  width={220}
                  height={220}
                  className="mx-auto h-52 w-52 print:h-44 print:w-44"
                  sizes="220px"
                  unoptimized
                />
              </div>
              <p className="mt-3 break-all text-[11px] leading-relaxed text-slate-500">{centreUrl}</p>
            </div>
          </div>
        </section>

        <section className="poster-page overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.12)] print:min-h-[277mm] print:rounded-none print:border-0 print:shadow-none">
          <div className="relative overflow-hidden px-6 py-6 print:py-5">
            <Image
              src={heroImage}
              alt={`${centreName} hero image`}
              width={1600}
              height={900}
              className="absolute inset-0 h-full w-full object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,118,110,0.88)_0%,rgba(15,23,42,0.80)_100%)]" />
            <div className="relative space-y-6 text-white">
              <div className="flex items-center justify-between gap-4">
                <div className="rounded-[24px] border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
                  <Image
                    src="/centreconnect-logo.svg"
                    alt="CentreConnect logo"
                    width={156}
                    height={38}
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <CentreLogo logoImage={logoImage} centreName={centreName} size={76} />
              </div>

              <div className="max-w-2xl space-y-3">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-teal-100">Street-facing poster</p>
                <h2 className="text-4xl font-black leading-tight tracking-tight print:text-[34px]">
                  Scan to learn more about {centreName}.
                </h2>
                <p className="text-lg font-semibold text-white/90 print:text-base">{location}</p>
                <p className="max-w-xl text-sm leading-7 text-white/90 print:text-[13px]">
                  Parents passing by can scan this code to open your CentreConnect page and see your centre information online.
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <div className="mx-auto max-w-[640px] rounded-[2rem] border border-white/20 bg-white p-4 shadow-2xl print:max-w-[620px]">
                  <Image
                    src={qrSvgUrl}
                    alt={`Large QR code for ${centreName}`}
                    width={640}
                    height={640}
                    className="mx-auto h-[74vw] w-[74vw] max-h-[640px] max-w-[640px] print:h-[560px] print:w-[560px]"
                    sizes="(max-width: 768px) 74vw, 640px"
                    unoptimized
                  />
                </div>
                <p className="mt-4 text-center text-sm font-semibold text-white/90 print:text-[13px]">
                  Scan with your phone camera to open the full centre page.
                </p>
                <p className="mt-2 break-all text-center text-[11px] text-white/75 print:text-[10px]">{centreUrl}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

