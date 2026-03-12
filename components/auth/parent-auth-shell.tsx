import Link from 'next/link'
import { ArrowLeft, type LucideIcon } from 'lucide-react'

import { BrandMark } from '@/components/ecd/BrandMark'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'

type ParentAuthHighlight = {
  icon: LucideIcon
  title: string
  description: string
}

type ParentAuthShellProps = {
  eyebrow: string
  title: string
  description: string
  headerNote?: React.ReactNode
  form: React.ReactNode
  footer: React.ReactNode
  supportTitle: string
  supportDescription: string
  supportFootnote?: React.ReactNode
  highlights: ParentAuthHighlight[]
}

export function ParentAuthShell({
  eyebrow,
  title,
  description,
  headerNote,
  form,
  footer,
  supportTitle,
  supportDescription,
  supportFootnote,
  highlights,
}: ParentAuthShellProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#FFF8F1_0%,#FFFDF9_48%,#F6FBF9_100%)] text-foreground">
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top_left,rgba(212,147,90,0.18),transparent_40%),radial-gradient(circle_at_top_right,rgba(13,148,136,0.14),transparent_30%)]" />
      <div className="absolute -left-20 top-24 h-48 w-48 rounded-full bg-[rgba(212,147,90,0.10)] blur-3xl" />
      <div className="absolute right-[-3rem] top-32 h-56 w-56 rounded-full bg-[rgba(13,148,136,0.08)] blur-3xl" />

      <Container className="relative flex min-h-screen flex-col py-5 sm:py-6 lg:py-8">
        <div className="flex items-center justify-between gap-3">
          <BrandMark href="/" compact className="shrink-0" />

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden rounded-full text-slate-600 hover:bg-white/70 hover:text-foreground sm:inline-flex"
            >
              <Link href="/directory">Browse creches</Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-full border-border bg-white/90 text-foreground shadow-none hover:bg-muted"
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back home
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid flex-1 gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-12 lg:py-10">
          <div className="order-2 space-y-6 lg:order-1">
            <div className="max-w-xl">
              <div className="inline-flex items-center rounded-full border border-[#E5D9CC] bg-white/90 px-4 py-2 text-xs font-semibold text-primary shadow-[0_10px_24px_rgba(31,44,39,0.06)]">
                Parent account
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {supportTitle}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                {supportDescription}
              </p>
            </div>

            <div className="space-y-3">
              {highlights.map(({ icon: Icon, title: highlightTitle, description: highlightDescription }) => (
                <div
                  key={highlightTitle}
                  className="rounded-2xl border border-[#E7DDD1] bg-white/88 p-4 shadow-[0_12px_32px_rgba(34,49,46,0.05)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted/30 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{highlightTitle}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{highlightDescription}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {supportFootnote ? (
              <div className="rounded-2xl border border-border bg-[linear-gradient(135deg,#FFFDF9_0%,#F4FBF8_100%)] p-5 shadow-[0_10px_24px_rgba(34,49,46,0.04)]">
                {supportFootnote}
              </div>
            ) : null}
          </div>

          <Card className="order-1 border-[#E7DDD1] bg-white/95 shadow-[0_24px_60px_rgba(34,49,46,0.10)] lg:order-2">
            <CardContent className="p-5 sm:p-7">
              <PageHeader tone="parent" eyebrow={eyebrow} title={title} description={description}>
                {headerNote}
              </PageHeader>

              <div className="mt-6">{form}</div>
              <div className="mt-6 border-t border-[#EEE3D7] pt-5">{footer}</div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  )
}

