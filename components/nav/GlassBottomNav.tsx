'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CircleUser, Compass, Home, Map } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  matches: string[]
}

const parentNavItems = [
  { href: '/parent/dashboard', label: 'Home', icon: Home, matches: ['/parent/dashboard', '/parent/notifications'] },
  { href: '/directory', label: 'Discover', icon: Compass, matches: ['/directory', '/centre', '/c', '/parent/shortlist', '/parent/compare'] },
  { href: '/parent/applications', label: 'Journey', icon: Map, matches: ['/parent/applications', '/apply'] },
  { href: '/parent/profile', label: 'Me', icon: CircleUser, matches: ['/parent/profile', '/parent/children', '/parent/preferences'] },
] satisfies NavItem[]

const publicNavItems = [
  { href: '/parent/dashboard', label: 'Home', icon: Home, matches: ['/parent/dashboard', '/parent/notifications'] },
  { href: '/directory', label: 'Discover', icon: Compass, matches: ['/directory', '/centre', '/c'] },
  { href: '/parent/applications', label: 'Journey', icon: Map, matches: ['/parent/applications', '/apply'] },
  { href: '/parent/profile', label: 'Me', icon: CircleUser, matches: ['/parent/profile', '/parent/children', '/parent/preferences'] },
] satisfies NavItem[]

type GlassBottomNavProps = {
  mode?: 'parent' | 'public'
}

export function GlassBottomNav({ mode = 'parent' }: GlassBottomNavProps) {
  const pathname = usePathname()
  const navItems = mode === 'public' ? publicNavItems : parentNavItems
  const isPathActive = (path: string, matches: string[]) =>
    matches.some((match) => path === match || path.startsWith(`${match}/`))

  return (
    <>
      <nav className="glass-nav" aria-label="Primary">
        <div className="glass-nav__pill">
          {navItems.map(({ href, label, icon: Icon, matches }) => {
            const active = pathname ? isPathActive(pathname, matches) : false
            return (
              <Link
                key={`${label}-${href}`}
                href={href}
                aria-current={active ? 'page' : undefined}
                aria-label={mode === 'public' && matches.length === 0 ? `${label} (Sign in required)` : label}
                className={`glass-nav__item ${active ? 'is-active' : ''}`}
              >
                <span className="glass-nav__icon-wrap">
                  <Icon className="glass-nav__icon" strokeWidth={active ? 2.35 : 2} />
                  {active ? <span className="glass-nav__dot" aria-hidden /> : null}
                </span>
                <span className="glass-nav__label">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <style jsx>{`
        .glass-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 180;
          display: flex;
          justify-content: center;
          padding: 0 14px calc(12px + env(safe-area-inset-bottom));
          pointer-events: none;
        }

        .glass-nav__pill {
          pointer-events: auto;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: center;
          gap: 0;
          width: min(100%, 468px);
          border-radius: 26px;
          padding: 8px 10px;
          border: 1px solid rgba(255, 255, 255, 0.55);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.34) 100%),
            rgba(255, 255, 255, 0.24);
          backdrop-filter: blur(22px) saturate(180%);
          -webkit-backdrop-filter: blur(22px) saturate(180%);
          box-shadow:
            0 16px 32px rgba(15, 23, 42, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.65);
        }

        .glass-nav__item {
          width: 100%;
          min-width: 0;
          border-radius: 16px;
          padding: 6px 4px;
          display: grid;
          grid-template-rows: 30px auto;
          place-items: center;
          gap: 3px;
          text-decoration: none;
          color: #64748b;
          transition: transform 140ms ease, color 140ms ease, background-color 140ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .glass-nav__item:hover {
          background: rgba(255, 255, 255, 0.22);
        }

        .glass-nav__item:active {
          transform: scale(0.95);
        }

        .glass-nav__item:focus-visible {
          outline: 2px solid rgba(37, 99, 235, 0.4);
          outline-offset: 1px;
        }

        .glass-nav__item.is-active {
          color: #0f172a;
          background: rgba(255, 255, 255, 0.42);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
        }

        .glass-nav__icon-wrap {
          position: relative;
          display: grid;
          place-items: center;
          align-self: center;
          justify-self: center;
          width: 30px;
          height: 30px;
          line-height: 0;
          margin-inline: auto;
        }

        .glass-nav__item.is-active .glass-nav__icon-wrap::before {
          content: '';
          position: absolute;
          inset: -5px;
          border-radius: 50%;
          background: rgba(14, 165, 233, 0.16);
          animation: navGlow 180ms var(--ease-spring, cubic-bezier(0.175, 0.885, 0.32, 1.275));
        }

        .glass-nav__icon {
          position: relative;
          z-index: 1;
          width: 18px;
          height: 18px;
          display: block;
          margin: 0 auto;
          transform-origin: center center;
          transition: transform 160ms ease;
        }

        .glass-nav__item.is-active .glass-nav__icon {
          animation: navIconBounce 240ms var(--ease-spring, cubic-bezier(0.175, 0.885, 0.32, 1.275));
        }

        .glass-nav__dot {
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #0891b2;
          animation: navDot 180ms var(--ease-spring, cubic-bezier(0.175, 0.885, 0.32, 1.275));
        }

        .glass-nav__label {
          display: block;
          width: 100%;
          align-self: center;
          justify-self: center;
          text-align: center;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.01em;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          opacity: 0.67;
          transition: opacity 140ms ease;
        }

        .glass-nav__item.is-active .glass-nav__label {
          opacity: 1;
        }

        @keyframes navGlow {
          from {
            transform: scale(0.76);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes navDot {
          from {
            transform: translateX(-50%) scale(0);
          }
          to {
            transform: translateX(-50%) scale(1);
          }
        }

        @keyframes navIconBounce {
          0% {
            transform: scale(0.95);
          }
          45% {
            transform: scale(1.06);
          }
          100% {
            transform: scale(1);
          }
        }

        :global(.dark) .glass-nav__pill {
          border-color: rgba(255, 255, 255, 0.3);
          background:
            linear-gradient(180deg, rgba(30, 41, 59, 0.72) 0%, rgba(15, 23, 42, 0.58) 100%),
            rgba(15, 23, 42, 0.5);
          box-shadow: 0 12px 28px rgba(2, 6, 23, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        :global(.dark) .glass-nav__item {
          color: #9aa3b4;
        }

        :global(.dark) .glass-nav__item.is-active {
          color: #e2e8f0;
          background: rgba(148, 163, 184, 0.16);
        }

        :global(.dark) .glass-nav__dot {
          background: #22d3ee;
        }

        @media (prefers-reduced-motion: reduce) {
          .glass-nav__item,
          .glass-nav__icon,
          .glass-nav__dot {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </>
  )
}
