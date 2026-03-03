// components/parent/CentreCard.tsx
// Premium card for directory listings and saved centres.
// Uses depth (shadow), not gradients. Subtle hover lift.

'use client'

import type { MouseEvent } from 'react'
import Link from 'next/link'
import { MapPin, Users, Star, CheckCircle2, ShieldCheck, Wallet, MessageCircleMore, BadgeCheck, Circle } from 'lucide-react'
import { SaveCentreButton } from '@/components/parent/SaveCentreButton'
import { getCentreHeroImage } from '@/lib/ui/centre-hero-images'
import { LiteImage } from '@/components/ui/LiteImage' // Import LiteImage
import { getCentreOperationalStatus } from '@/lib/time/centre-operational-status'

interface CentreCardProps {
  id: string
  slug: string
  name: string
  tagline?: string
  suburb: string
  city: string
  capacity?: number
  age_groups?: string[]
  is_registered: boolean
  logo_url?: string
  cover_image_url?: string
  rating?: number        // future feature
  open_spots?: number    // future: calculated from capacity - approved apps
  variant?: 'default' | 'compact' | 'featured'
  subsidy_accepted?: boolean
  fees_display_mode?: 'exact' | 'range' | 'contact' | null
  is_claimed?: boolean
  latitude?: number | null // Added
  longitude?: number | null // Added
  distanceLabel?: string
}

export default function CentreCard({
  id,
  slug,
  name,
  tagline,
  suburb,
  city,
  capacity,
  age_groups = [],
  is_registered,
  logo_url,
  cover_image_url,
  rating,
  open_spots,
  variant = 'default',
  subsidy_accepted = false,
  fees_display_mode = null,
  is_claimed = true,
  distanceLabel,
}: CentreCardProps) {
  const heroImage = getCentreHeroImage(slug, cover_image_url)
  const locationLabel = [suburb?.trim(), city?.trim()].filter(Boolean).join(', ')
  const operationalStatus = getCentreOperationalStatus()
  const isFoundingPartner = suburb?.trim().toLowerCase() === 'alexandra'
  const hasPriorityListing = is_registered || isFoundingPartner
  const pilotBadges = [
    is_registered ? 'Verified' : null,
    isFoundingPartner ? 'Founding Partner' : null,
    hasPriorityListing ? 'Priority Listing' : null,
  ].filter(Boolean) as string[]

  const claimHref = `/for-centres/register?plan=pilot&claim=${encodeURIComponent(slug)}`

  function handleClaimClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    window.location.href = claimHref
  }

  if (variant === 'compact') {
    return (
      <Link href={`/centre/${slug}`} className="centre-card centre-card--compact">
        <div className="centre-card__logo-sm">
          {logo_url ? (
            <LiteImage src={logo_url} alt={name} width={40} height={40} className="w-full h-full object-cover" sizes="40px" />
          ) : (
            <span className="centre-card__initials">{name.charAt(0)}</span>
          )}
        </div>
        <div className="centre-card__body-sm">
          <p className="centre-card__name-sm">{name}</p>
          <p className="centre-card__loc-sm">
            <MapPin size={11} strokeWidth={2} />
            {suburb}
          </p>
        </div>
        {is_registered && (
          <CheckCircle2 size={16} className="centre-card__check" />
        )}
        <style jsx>{`
          .centre-card--compact {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: white;
            border-radius: var(--radius-md);
            border: 1px solid #F1F5F9;
            box-shadow: var(--shadow-elevation-1);
            text-decoration: none;
            transition: box-shadow 0.15s ease;
          }
          .centre-card--compact:active {
            box-shadow: var(--shadow-elevation-2);
          }
          .centre-card__logo-sm {
            width: 40px; height: 40px;
            border-radius: var(--radius-sm);
            background: #EFF6FF;
            overflow: hidden;
            flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
          }
          .centre-card__initials {
            font-size: 18px; font-weight: 700; color: #2563EB;
          }
          .centre-card__body-sm { flex: 1; min-width: 0; }
          .centre-card__name-sm {
            font-size: 14px; font-weight: 700; color: #0F172A;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          }
          .centre-card__loc-sm {
            display: flex; align-items: center; gap: 3px;
            font-size: 12px; color: #64748B; margin-top: 2px;
          }
          .centre-card__check { color: #10B981; flex-shrink: 0; }
        `}</style>
      </Link>
    )
  }

  return (
    <>
      <Link href={`/centre/${slug}`} className={`centre-card ${variant === 'featured' ? 'centre-card--featured' : ''}`}>
        {/* Cover image */}
        <div className="centre-card__cover">
          <LiteImage
            src={heroImage}
            alt={`${name} cover`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
            loading="lazy"
          />

          {/* Registration badge - top right */}
          {is_registered && (
            <div className="centre-card__reg-badge">
              <CheckCircle2 size={12} strokeWidth={2.5} />
              Registered
            </div>
          )}

          {/* Open spots indicator */}
          {open_spots !== undefined && (
            <div className={`centre-card__spots ${open_spots === 0 ? 'centre-card__spots--full' : ''}`}>
              {open_spots === 0 ? 'Full' : `${open_spots} spots`}
            </div>
          )}
          <div style={{position: 'absolute', bottom: '10px', right: '10px'}}>
            <SaveCentreButton centreId={id} />
          </div>
        </div>

        {/* Card body */}
        <div className="centre-card__body">
          {/* Logo + name row */}
          <div className="centre-card__header">
            <div className="centre-card__logo">
              {logo_url ? (
                <LiteImage src={logo_url} alt={name} width={44} height={44} className="w-full h-full object-cover" loading="lazy" sizes="44px" />
              ) : (
                <span className="centre-card__initials-lg">{name.charAt(0)}</span>
              )}
            </div>
            <div className="centre-card__title-group">
              <h3 className="centre-card__name">{name}</h3>
              {tagline && <p className="centre-card__tagline">{tagline}</p>}
            </div>
          </div>

          {/* Meta row */}
          <div className="centre-card__meta">
            <span
              className={`centre-card__meta-item ${
                operationalStatus.isOnline ? 'centre-card__meta-item--online' : 'centre-card__meta-item--offline'
              }`}
            >
              <Circle size={11} fill="currentColor" strokeWidth={0} />
              {operationalStatus.label}
            </span>
            <span className={`centre-card__meta-item ${!locationLabel ? 'text-orange-500' : ''}`}>
              <MapPin size={13} strokeWidth={2} />
              {locationLabel || 'Location to be confirmed'}
            </span>
            {distanceLabel && (
              <span className="centre-card__meta-item" style={{ color: '#0891b2', fontWeight: '700' }}>
                {distanceLabel}
              </span>
            )}
            {capacity && (
              <span className="centre-card__meta-item">
                <Users size={13} strokeWidth={2} />
                {capacity} children
              </span>
            )}
            {rating && (
              <span className="centre-card__meta-item centre-card__meta-item--rating">
                <Star size={13} fill="currentColor" strokeWidth={0} />
                {rating.toFixed(1)}
              </span>
            )}
          </div>

          {/* Age group chips */}
          {age_groups.length > 0 && (
            <div className="centre-card__tags">
              {age_groups.slice(0, 3).map(age => (
                <span key={age} className="centre-card__tag">{age} yrs</span>
              ))}
              {age_groups.length > 3 && (
                <span className="centre-card__tag centre-card__tag--more">+{age_groups.length - 3}</span>
              )}
            </div>
          )}

          {pilotBadges.length > 0 ? (
            <div className="centre-card__badges">
              {pilotBadges.map((badge) => (
                <span key={badge} className="centre-card__pilot-badge">
                  <BadgeCheck size={12} />
                  {badge}
                </span>
              ))}
            </div>
          ) : null}

          <div className="centre-card__checklist">
            <p className="centre-card__checklist-title">Trust checklist</p>
            <p className="centre-card__checklist-item">
              <CheckCircle2 size={12} />
              {is_registered ? 'DSD registered' : 'DSD registration in progress'}
            </p>
            <p className="centre-card__checklist-item">
              <ShieldCheck size={12} />
              Safety and compliance oversight expected.
            </p>
            <p className="centre-card__checklist-item">
              <BadgeCheck size={12} />
              Subsidy readiness supports quality operations.
            </p>
            <p className="centre-card__checklist-note">
              Why parents care: Government subsidy standards usually mean stronger quality and safety oversight.
            </p>
          </div>

          <div className="centre-card__trust">
            {is_registered ? (
              <span className="centre-card__trust-item">
                <ShieldCheck size={12} /> Registered
              </span>
            ) : null}
            {subsidy_accepted ? (
              <span className="centre-card__trust-item">
                <Wallet size={12} /> Subsidy-friendly
              </span>
            ) : null}
            {fees_display_mode && fees_display_mode !== 'contact' ? (
              <span className="centre-card__trust-item">
                <MessageCircleMore size={12} /> Clear fees
              </span>
            ) : null}
          </div>

          {!is_claimed ? (
            <button type="button" className="centre-card__claim-btn" onClick={handleClaimClick}>
              {`This is my cr\u00e8che - Claim & Update`}
            </button>
          ) : null}
        </div>
      </Link>

      <style jsx>{`
        .centre-card {
          display: block;
          background: white;
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-elevation-2);
          border: 1px solid rgba(241,245,249,1);
          text-decoration: none;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                      box-shadow 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .centre-card:active {
          transform: scale(0.98);
          box-shadow: var(--shadow-elevation-1);
        }
        @media (hover: hover) {
          .centre-card:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-elevation-3);
          }
        }

        .centre-card--featured {
          border: 1.5px solid rgba(37,99,235,0.20);
          box-shadow: var(--shadow-elevation-3);
        }

        /* Cover */
        .centre-card__cover {
          position: relative;
          height: 140px;
          background: #EFF6FF;
        }
        .centre-card__reg-badge {
          position: absolute;
          top: 10px; right: 10px;
          display: flex; align-items: center; gap: 4px;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(8px);
          color: #059669;
          font-size: 11px; font-weight: 700;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(16,185,129,0.20);
        }
        .centre-card__spots {
          position: absolute;
          bottom: 10px; left: 10px;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(8px);
          color: #2563EB;
          font-size: 11px; font-weight: 700;
          padding: 3px 8px;
          border-radius: 999px;
        }
        .centre-card__spots--full {
          color: #EF4444;
        }

        /* Body */
        .centre-card__body {
          padding: 14px 16px 16px;
        }
        .centre-card__header {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 10px;
        }
        .centre-card__logo {
          width: 44px; height: 44px;
          border-radius: var(--radius-md);
          background: #EFF6FF;
          overflow: hidden;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border: 1.5px solid #DBEAFE;
          margin-top: -28px; /* Overlap cover */
          box-shadow: var(--shadow-elevation-2);
        }
        .centre-card__initials-lg {
          font-size: 20px; font-weight: 800; color: #2563EB;
        }
        .centre-card__title-group { flex: 1; min-width: 0; padding-top: 2px; }
        .centre-card__name {
          font-size: 16px; font-weight: 700; color: #0F172A;
          line-height: 1.2;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin: 0;
        }
        .centre-card__tagline {
          font-size: 13px; color: #64748B; margin: 2px 0 0;
          line-height: 1.35;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* Meta */
        .centre-card__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 10px;
        }
        .centre-card__meta-item {
          display: flex; align-items: center; gap: 4px;
          font-size: 13px; color: #64748B; font-weight: 500;
        }
        .centre-card__meta-item--online {
          color: #059669;
          font-weight: 700;
        }
        .centre-card__meta-item--offline {
          color: #dc2626;
          font-weight: 700;
        }
        .centre-card__meta-item--rating {
          color: #F59E0B;
        }

        .centre-card__badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
        }
        .centre-card__pilot-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 999px;
          border: 1px solid #99f6e4;
          background: #ecfeff;
          color: #0f766e;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
        }

        .centre-card__checklist {
          border: 1px solid #d1fae5;
          background: #f0fdf4;
          border-radius: 12px;
          padding: 10px;
          margin-bottom: 10px;
        }
        .centre-card__checklist-title {
          margin: 0 0 6px 0;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #047857;
        }
        .centre-card__checklist-item {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #14532d;
          font-size: 12px;
          font-weight: 700;
        }
        .centre-card__checklist-item + .centre-card__checklist-item {
          margin-top: 4px;
        }
        .centre-card__checklist-note {
          margin: 6px 0 0 0;
          color: #166534;
          font-size: 11px;
          line-height: 1.35;
        }

        /* Tags */
        .centre-card__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .centre-card__tag {
          font-size: 12px; font-weight: 600;
          padding: 3px 8px;
          background: #EFF6FF;
          color: #2563EB;
          border-radius: 999px;
          border: 1px solid #DBEAFE;
        }
        .centre-card__tag--more {
          background: #F8FAFC;
          color: #94A3B8;
          border-color: #E2E8F0;
        }

        .centre-card__trust {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .centre-card__trust-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 999px;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          color: #334155;
          font-size: 12px;
          font-weight: 600;
          padding: 3px 8px;
        }

        .centre-card__claim-btn {
          width: 100%;
          margin-top: 10px;
          border: 1px solid #0f766e;
          background: #ffffff;
          color: #0f766e;
          border-radius: 12px;
          height: 40px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.01em;
          cursor: pointer;
        }
      `}</style>
    </>
  )
}
