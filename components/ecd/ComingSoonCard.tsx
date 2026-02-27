import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ecd/Card'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { BuildingIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ecd/Button'

interface ComingSoonCardProps {
  title: string
  description: string
  comingSoonText?: string
  backLinkHref?: string
  backLinkText?: string
}

export function ComingSoonCard({
  title,
  description,
  comingSoonText = 'Feature Coming Soon!',
  backLinkHref = '/ecd/dashboard',
  backLinkText = 'Back to Dashboard',
}: ComingSoonCardProps) {
  return (
    <EcdOsShell title={title} description={description}>
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="glass-card w-full max-w-md border border-border bg-card/90 text-foreground text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BuildingIcon className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold">{comingSoonText}</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              {description} We're actively working on this feature to bring you the best experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={backLinkHref}>{backLinkText}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </EcdOsShell>
  )
}
