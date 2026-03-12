import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Container } from './container'
import { BrandMark } from '@/components/ecd/BrandMark'

type HeaderLink = {
  href: string
  label: string
}

type AppHeaderProps = {
  brandHref?: string
  brandLabel?: string
  links?: HeaderLink[]
  cta?: HeaderLink
}

export function AppHeader({
  brandHref = '/',
  brandLabel = 'CentreConnect',
  links = [],
  cta,
}: AppHeaderProps) {
  const mobileAuthLink = links.find((link) => {
    const label = link.label.toLowerCase()
    return (
      label.includes('sign in') ||
      label.includes('login') ||
      label.includes('log in') ||
      link.href === '/login'
    )
  })

  return (
    <header className="glass-nav sticky top-0 z-40 border-b border-cyan-100/60">
      <Container className="flex items-center justify-between py-4">
        <BrandMark href={brandHref} label={brandLabel} compact hideLabelOnMobile />
        <nav className="hidden items-center gap-5 md:flex">
          {links.map((link) =>
            link.href === '/for-centres' ? (
              <a
                key={link.href}
                href="/for-centres"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-slate-700 transition-colors hover:text-sky-700"
              >
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-700 transition-colors hover:text-sky-700">
                {link.label}
              </Link>
            )
          )}
          {cta ? (
            <Button size="sm" asChild>
              {cta.href === '/for-centres' ? (
                <a href="/for-centres" target="_blank" rel="noopener noreferrer">
                  {cta.label}
                </a>
              ) : (
                <Link href={cta.href}>{cta.label}</Link>
              )}
            </Button>
          ) : null}
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <a
            href="/for-centres"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-cyan-300 hover:text-cyan-600"
          >
            <Building2 className="h-3.5 w-3.5" />
            For creche owners
          </a>
          {mobileAuthLink ? (
            <Button size="sm" variant="outline" asChild className="font-semibold">
              {mobileAuthLink.href === '/for-centres' ? (
                <a href="/for-centres" target="_blank" rel="noopener noreferrer">
                  {mobileAuthLink.label}
                </a>
              ) : (
                <Link href={mobileAuthLink.href}>{mobileAuthLink.label}</Link>
              )}
            </Button>
          ) : null}
          {cta ? (
            <Button size="sm" variant="outline" asChild>
              {cta.href === '/for-centres' ? (
                <a href="/for-centres" target="_blank" rel="noopener noreferrer">
                  {cta.label}
                </a>
              ) : (
                <Link href={cta.href}>{cta.label}</Link>
              )}
            </Button>
          ) : null}
        </div>
      </Container>
    </header>
  )
}


