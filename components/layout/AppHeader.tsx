import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageContainer } from './PageContainer'
import { BrandMark } from '@/components/cc-admin/BrandMark'

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
    <header className="cc-glass-nav sticky top-0 z-40 border-b border-cyan-100/60">
      <PageContainer className="flex items-center justify-between py-4">
        <BrandMark href={brandHref} label={brandLabel} compact hideLabelOnMobile />
        <nav className="hidden items-center gap-5 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-700 transition-colors hover:text-sky-700">
              {link.label}
            </Link>
          ))}
          {cta ? (
            <Button size="sm" asChild>
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          ) : null}
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          {mobileAuthLink ? (
            <Button size="sm" variant="outline" asChild className="font-semibold">
              <Link href={mobileAuthLink.href}>{mobileAuthLink.label}</Link>
            </Button>
          ) : null}
          {cta ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          ) : null}
        </div>
      </PageContainer>
    </header>
  )
}
