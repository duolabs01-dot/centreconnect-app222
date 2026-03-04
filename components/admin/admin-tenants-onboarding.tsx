'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Copy,
  ImagePlus,
  MailPlus,
  Rocket,
  Send,
  Sparkles,
  UploadCloud,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type OnboardingMode = 'single' | 'team'
type TeamRole = 'ecd_admin' | 'ecd_staff'
type Tier = 'pilot' | 'basic' | 'standard' | 'premium'

type SuccessState = {
  centreId: string
  centreName: string
  slug: string
  ownerEmail: string
  ownerPhone: string
  teamRequested: number
  teamSent: number
  teamFailed: number
  eventKey: string | null
  trackingLink: string
}

type ExistingUserConflict = {
  email?: string
  existingRole?: string | null
  existingUserId?: string | null
  willSetRole?: string
  parentAccessWillBeRevoked?: boolean
}

type ExistingCentreOption = {
  id: string
  name: string
  ownerEmail?: string | null
}

const TIER_PRICE: Record<Tier, number> = {
  pilot: 0,
  basic: 199,
  standard: 299,
  premium: 499,
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (slug.length >= 3) return slug.slice(0, 80)
  const fallback = `centre-${Date.now().toString().slice(-6)}`
  return fallback
}

function contactNameFromEmail(email: string, fallback: string) {
  const local = email.split('@')[0] ?? ''
  const normalized = local.replace(/[._-]+/g, ' ').trim()
  return normalized.length >= 2 ? normalized : `${fallback} Admin`
}

function parseTeamEmails(raw: string) {
  const chunks = raw
    .split(/[\n,;]+/g)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  const valid: string[] = []
  const seen = new Set<string>()
  let invalidCount = 0
  for (const email of chunks) {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!ok) {
      invalidCount += 1
      continue
    }
    if (seen.has(email)) continue
    seen.add(email)
    valid.push(email)
  }
  return { valid, invalidCount }
}

function normalizeCentreSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
}

function extensionOf(file: File) {
  const value = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!value) return 'jpg'
  return value.replace(/[^a-z0-9]/g, '') || 'jpg'
}

const darkInputClass =
  'border-cyan-500/20 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-400/70'

export function AdminTenantsOnboarding({ existingCentres }: { existingCentres: ExistingCentreOption[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<OnboardingMode>('single')
  const [busy, setBusy] = useState(false)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false)
  const [existingUserConflict, setExistingUserConflict] = useState<ExistingUserConflict | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [heroFile, setHeroFile] = useState<File | null>(null)
  const [success, setSuccess] = useState<SuccessState | null>(null)
  const [form, setForm] = useState({
    centreName: '',
    ownerEmail: '',
    ownerPhone: '',
    suburb: '',
    city: 'Johannesburg',
    province: 'Gauteng',
    tier: 'pilot' as Tier,
    teamRole: 'ecd_staff' as TeamRole,
    teamEmails: '',
  })

  const teamParsed = useMemo(() => parseTeamEmails(form.teamEmails), [form.teamEmails])
  const normalizedCentreName = useMemo(() => normalizeCentreSearch(form.centreName), [form.centreName])
  const matchingCentres = useMemo(() => {
    if (!normalizedCentreName) return []
    return existingCentres
      .map((centre) => ({ centre, normalized: normalizeCentreSearch(centre.name) }))
      .filter(
        (entry) =>
          Boolean(entry.normalized) &&
          (entry.normalized.includes(normalizedCentreName) || normalizedCentreName.includes(entry.normalized))
      )
      .sort((a, b) => {
        const aStarts = a.normalized.startsWith(normalizedCentreName) ? 0 : 1
        const bStarts = b.normalized.startsWith(normalizedCentreName) ? 0 : 1
        if (aStarts !== bStarts) return aStarts - bStarts
        return a.centre.name.localeCompare(b.centre.name)
      })
      .slice(0, 6)
      .map((entry) => entry.centre)
  }, [existingCentres, normalizedCentreName])
  const exactCentreMatch = useMemo(() => {
    if (!normalizedCentreName) return null
    return existingCentres.find((centre) => normalizeCentreSearch(centre.name) === normalizedCentreName) ?? null
  }, [existingCentres, normalizedCentreName])
  const trackingLinkHref = success ? success.trackingLink : '/admin/invites'

  async function uploadBrandMedia(centreId: string) {
    if (!logoFile && !heroFile) return
    const supabase = createClient()
    let logoUrl: string | null = null
    let coverImageUrl: string | null = null

    if (logoFile) {
      const logoPath = `centres/${centreId}/branding/logo-${Date.now()}.${extensionOf(logoFile)}`
      const { error: logoError } = await supabase.storage.from('ecd-media').upload(logoPath, logoFile, { upsert: true })
      if (logoError) throw new Error(`Logo upload failed: ${logoError.message}`)
      logoUrl = supabase.storage.from('ecd-media').getPublicUrl(logoPath).data.publicUrl
    }

    if (heroFile) {
      const heroPath = `centres/${centreId}/branding/hero-${Date.now()}.${extensionOf(heroFile)}`
      const { error: heroError } = await supabase.storage.from('ecd-media').upload(heroPath, heroFile, { upsert: true })
      if (heroError) throw new Error(`Hero image upload failed: ${heroError.message}`)
      coverImageUrl = supabase.storage.from('ecd-media').getPublicUrl(heroPath).data.publicUrl
    }

    const mediaResponse = await fetch(`/api/internal/platform-admin/centres/${centreId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set_brand_media',
        logoUrl,
        coverImageUrl,
      }),
    })
    const mediaPayload = (await mediaResponse.json().catch(() => ({}))) as { error?: string }
    if (!mediaResponse.ok) {
      throw new Error(mediaPayload.error || 'Failed to save logo/hero image on centre profile.')
    }
  }

  async function triggerOwnerInvite(centreId: string) {
    const response = await fetch(`/api/internal/platform-admin/centres/${centreId}/send-owner-invite`, {
      method: 'POST',
    })
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean
      eventKey?: string
      error?: string
      warning?: string
    }
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to send owner invite.')
    }
    if (payload.warning) {
      toast.warning(payload.warning)
    }
    return payload.eventKey ?? null
  }

  async function sendTeamInvites(centreId: string, emails: string[], role: TeamRole) {
    if (emails.length === 0) return { sent: 0, failed: 0 }

    const results = await Promise.all(
      emails.map(async (email) => {
        const response = await fetch('/api/internal/platform-admin/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ecdId: centreId,
            email,
            role,
          }),
        })
        return response.ok
      })
    )

    const sent = results.filter(Boolean).length
    return { sent, failed: emails.length - sent }
  }

  async function handleCreate(options?: {
    allowExistingEmailMigration?: boolean
    confirmAdminRoleMigration?: boolean
    confirmParentAccessRevocation?: boolean
  }) {
    const centreName = form.centreName.trim()
    const ownerEmail = form.ownerEmail.trim().toLowerCase()
    const ownerPhone = form.ownerPhone.trim()
    const suburb = form.suburb.trim()
    if (!centreName || !ownerEmail || !ownerPhone || !suburb) {
      toast.error('Centre name, owner email, owner phone, and suburb are required.')
      return
    }
    if (exactCentreMatch) {
      toast.error('Centre already exists - claim it instead.')
      return
    }

    if (mode === 'team' && teamParsed.valid.length < 5) {
      toast.error('Team onboarding requires at least 5 valid email addresses.')
      return
    }

    setBusy(true)
    try {
      const slug = slugify(centreName)
      const createResponse = await fetch('/api/internal/platform-admin/centres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: centreName,
          primaryContactName: contactNameFromEmail(ownerEmail, centreName),
          email: ownerEmail,
          phone: ownerPhone,
          address: `${suburb}, ${form.city.trim() || 'Johannesburg'}`,
          suburb,
          city: form.city.trim() || 'Johannesburg',
          province: form.province.trim() || 'Gauteng',
          monthlyPrice: TIER_PRICE[form.tier],
          tier: form.tier,
          contractSigned: true,
          onboardingFeePaid: true,
          allowExistingEmailMigration: options?.allowExistingEmailMigration ?? false,
          confirmAdminRoleMigration: options?.confirmAdminRoleMigration ?? false,
          confirmParentAccessRevocation: options?.confirmParentAccessRevocation ?? false,
        }),
      })

      const createPayload = (await createResponse.json().catch(() => ({}))) as {
        error?: string
        code?: string
        conflict?: ExistingUserConflict
        centre?: { id: string; name: string; slug: string }
        warnings?: string[]
      }

      if (!createResponse.ok || !createPayload.centre?.id) {
        if (createResponse.status === 409 && createPayload.code === 'existing_user_confirmation_required') {
          setExistingUserConflict(createPayload.conflict ?? { email: ownerEmail })
          setMigrationDialogOpen(true)
          toast.warning('Existing account detected. Confirm migration to continue.')
          return
        }
        throw new Error(createPayload.error || 'Failed to create tenant.')
      }

      const centre = createPayload.centre
      if (createPayload.warnings?.length) {
        toast.warning(createPayload.warnings[0])
      }

      try {
        await uploadBrandMedia(centre.id)
      } catch (error: any) {
        toast.warning(error?.message || 'Brand media was not saved. Continue from profile editor.')
      }

      let eventKey: string | null = null
      try {
        eventKey = await triggerOwnerInvite(centre.id)
      } catch (error: any) {
        toast.warning(error?.message || 'Created centre, but owner invite was not sent.')
      }

      let teamSent = 0
      let teamFailed = 0
      if (mode === 'team' && teamParsed.valid.length > 0) {
        const teamResult = await sendTeamInvites(centre.id, teamParsed.valid, form.teamRole)
        teamSent = teamResult.sent
        teamFailed = teamResult.failed
        if (teamFailed > 0) {
          toast.warning(`${teamFailed} team invites failed to deliver.`)
        }
      }

      const trackingLink = eventKey
        ? `/admin/invites?event_key=${encodeURIComponent(eventKey)}&centre_id=${centre.id}`
        : `/admin/invites?centre_id=${centre.id}`

      setSuccess({
        centreId: centre.id,
        centreName: centre.name || centreName,
        slug: centre.slug || slug,
        ownerEmail,
        ownerPhone,
        teamRequested: mode === 'team' ? teamParsed.valid.length : 0,
        teamSent,
        teamFailed,
        eventKey,
        trackingLink,
      })

      setMigrationDialogOpen(false)
      setExistingUserConflict(null)
      router.refresh()
      if (options?.allowExistingEmailMigration) {
        toast.success('Migration complete: account changed to ECD Admin and linked to the new tenant.')
      } else {
        toast.success('Centre created and onboarding started.')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create centre.')
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmMigration() {
    await handleCreate({
      allowExistingEmailMigration: true,
      confirmAdminRoleMigration: true,
      confirmParentAccessRevocation: true,
    })
  }

  async function handleResendInvite() {
    if (!success) return
    setInviteBusy(true)
    try {
      const eventKey = await triggerOwnerInvite(success.centreId)
      const trackingLink = eventKey
        ? `/admin/invites?event_key=${encodeURIComponent(eventKey)}&centre_id=${success.centreId}`
        : success.trackingLink
      setSuccess((prev) => (prev ? { ...prev, eventKey, trackingLink } : prev))
      toast.success('Owner invite sent.')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send invite.')
    } finally {
      setInviteBusy(false)
    }
  }

  async function copyTrackingLink() {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}${trackingLinkHref}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Tracking link copied.')
    } catch {
      toast.error('Could not copy link.')
    }
  }

  function resetFlow() {
    setSuccess(null)
    setLogoFile(null)
    setHeroFile(null)
    setMigrationDialogOpen(false)
    setExistingUserConflict(null)
    setForm((prev) => ({ ...prev, centreName: '', ownerEmail: '', ownerPhone: '', suburb: '', teamEmails: '' }))
  }

  const migrationDialog = (
    <Dialog
      open={migrationDialogOpen}
      onOpenChange={(open) => {
        setMigrationDialogOpen(open)
        if (!open && !busy) {
          setExistingUserConflict(null)
        }
      }}
    >
      <DialogContent className="border-cyan-500/30 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-cyan-200">Confirm Migration</DialogTitle>
          <DialogDescription className="text-slate-300">
            {existingUserConflict?.email
              ? `${existingUserConflict.email} already exists. Confirm to migrate this account to ECD Admin and revoke parent access.`
              : 'This email already exists. Confirm migration to ECD Admin and revoke parent access.'}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          Existing role: {existingUserConflict?.existingRole ?? 'unknown'} | New role:{' '}
          {existingUserConflict?.willSetRole ?? 'ecd_admin'}
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => {
              setMigrationDialogOpen(false)
              setExistingUserConflict(null)
            }}
            className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirmMigration()}
            loading={busy}
            className="bg-cyan-500 text-black hover:bg-cyan-400"
          >
            Confirm Migration - Change to ECD Admin and revoke parent access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (success) {
    return (
      <>
        <div className="space-y-8">
          <header className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-[#050b1a] via-[#071326] to-[#04111f] p-8 shadow-[0_24px_80px_rgba(2,132,199,0.16)]">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-cyan-400/30 bg-cyan-500/15 text-cyan-200">Onboarding Ready</Badge>
              <Badge className="border-emerald-400/30 bg-emerald-500/15 text-emerald-200">Success</Badge>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white">Tenant Created Successfully</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              {success.centreName} is ready. Invite dispatch and onboarding tracking are available immediately.
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-cyan-500/20 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Launch Summary
                </CardTitle>
                <CardDescription className="text-slate-400">Single centre + team onboarding status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Centre</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{success.centreName}</p>
                    <p className="mt-1 text-xs text-cyan-300">/{success.slug}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Owner</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{success.ownerEmail}</p>
                    <p className="mt-1 text-xs text-slate-400">{success.ownerPhone}</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-xs uppercase tracking-[0.2em] text-slate-500">Metric</TableHead>
                      <TableHead className="text-xs uppercase tracking-[0.2em] text-slate-500">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-slate-800">
                      <TableCell className="text-slate-300">Team invites requested</TableCell>
                      <TableCell className="text-slate-100">{success.teamRequested}</TableCell>
                    </TableRow>
                    <TableRow className="border-slate-800">
                      <TableCell className="text-slate-300">Team invites sent</TableCell>
                      <TableCell className="text-emerald-300">{success.teamSent}</TableCell>
                    </TableRow>
                    <TableRow className="border-slate-800">
                      <TableCell className="text-slate-300">Team invite failures</TableCell>
                      <TableCell className="text-amber-300">{success.teamFailed}</TableCell>
                    </TableRow>
                    <TableRow className="border-slate-800">
                      <TableCell className="text-slate-300">Invite event key</TableCell>
                      <TableCell className="text-xs text-cyan-300">{success.eventKey ?? 'Pending'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-3">
                <Button
                  onClick={() => void handleResendInvite()}
                  loading={inviteBusy}
                  className="bg-cyan-500 text-black hover:bg-cyan-400"
                >
                  <Send className="h-4 w-4" />
                  Send Invite
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void copyTrackingLink()}
                  className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy Tracking Link
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800"
                >
                  <Link href={success.trackingLink}>Open Tracking</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={resetFlow}
                  className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                >
                  Create Another Centre
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-cyan-500/20 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                  Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <p>1. Owner receives onboarding invite and welcome pack flow.</p>
                <p>2. Team members receive role-based invite links.</p>
                <p>3. Use tracking to monitor sent/opened/claimed states.</p>
              </CardContent>
            </Card>
          </div>
        </div>
        {migrationDialog}
      </>
    )
  }

  return (
    <>
      <div className="space-y-8">
        <header className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-[#040913] via-[#061021] to-[#03111f] p-8 shadow-[0_24px_80px_rgba(2,132,199,0.14)]">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-cyan-500/30 bg-cyan-500/15 text-cyan-200">CC Admin</Badge>
            <Badge className="border-slate-700 bg-slate-900 text-slate-300">Dark Onboarding</Badge>
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white">Tenant Onboarding</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Create a new centre and launch owner or team onboarding in a single flow.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-cyan-500/20 bg-slate-950/70">
            <CardHeader>
              <CardTitle className="text-white">Create Centre Workspace</CardTitle>
              <CardDescription className="text-slate-400">Single owner or team of 5+ in one setup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={mode} onValueChange={(value) => setMode(value as OnboardingMode)}>
                <TabsList className="grid h-11 w-full grid-cols-2 rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-1">
                  <TabsTrigger
                    value="single"
                    className="rounded-xl text-slate-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-100"
                  >
                    <Rocket className="mr-2 h-4 w-4" />
                    Single Centre
                  </TabsTrigger>
                  <TabsTrigger
                    value="team"
                    className="rounded-xl text-slate-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-100"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Bulk Team (5+)
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="single" className="mt-5" />
                <TabsContent value="team" className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Team Role</Label>
                    <Select value={form.teamRole} onValueChange={(value) => setForm((prev) => ({ ...prev, teamRole: value as TeamRole }))}>
                      <SelectTrigger className={cn(darkInputClass, '[&_span]:text-slate-100')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                        <SelectItem value="ecd_staff">ECD Staff</SelectItem>
                        <SelectItem value="ecd_admin">ECD Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Team Email List (5+)</Label>
                    <Textarea
                      className={cn(darkInputClass, 'min-h-[140px]')}
                      placeholder="staff1@centre.co.za&#10;staff2@centre.co.za&#10;staff3@centre.co.za"
                      value={form.teamEmails}
                      onChange={(event) => setForm((prev) => ({ ...prev, teamEmails: event.target.value }))}
                    />
                    <p className="text-xs text-slate-500">
                      Valid emails: {teamParsed.valid.length} | Invalid entries: {teamParsed.invalidCount}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="centre-name" className="text-slate-300">
                    Centre Name
                  </Label>
                  <Input
                    id="centre-name"
                    className={darkInputClass}
                    value={form.centreName}
                    onChange={(event) => setForm((prev) => ({ ...prev, centreName: event.target.value }))}
                    placeholder="Sunshine Early Learning Centre"
                  />
                  {normalizedCentreName && matchingCentres.length > 0 ? (
                    <Card className="border-cyan-500/20 bg-slate-950/95">
                      <CardContent className="space-y-2 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Existing centres</p>
                        <div className="space-y-2">
                          {matchingCentres.map((centre) => (
                            <div
                              key={centre.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-100">{centre.name}</p>
                                {centre.ownerEmail ? (
                                  <p className="truncate text-xs text-slate-400">{centre.ownerEmail}</p>
                                ) : null}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800"
                                onClick={() => setForm((prev) => ({ ...prev, centreName: centre.name }))}
                              >
                                Use
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                  {exactCentreMatch ? (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                      Centre already exists - claim it instead?{' '}
                      <Link
                        href={`/admin/tenants/${exactCentreMatch.id}`}
                        className="font-semibold text-cyan-300 underline decoration-cyan-400/70 underline-offset-4"
                      >
                        Open existing profile
                      </Link>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner-email" className="text-slate-300">
                    Owner Email
                  </Label>
                  <Input
                    id="owner-email"
                    type="email"
                    className={darkInputClass}
                    value={form.ownerEmail}
                    onChange={(event) => setForm((prev) => ({ ...prev, ownerEmail: event.target.value }))}
                    placeholder="owner@centre.co.za"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner-phone" className="text-slate-300">
                    Owner Phone
                  </Label>
                  <Input
                    id="owner-phone"
                    className={darkInputClass}
                    value={form.ownerPhone}
                    onChange={(event) => setForm((prev) => ({ ...prev, ownerPhone: event.target.value }))}
                    placeholder="+27 72 123 4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suburb" className="text-slate-300">
                    Suburb
                  </Label>
                  <Input
                    id="suburb"
                    className={darkInputClass}
                    value={form.suburb}
                    onChange={(event) => setForm((prev) => ({ ...prev, suburb: event.target.value }))}
                    placeholder="Alexandra"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Plan</Label>
                  <Select value={form.tier} onValueChange={(value) => setForm((prev) => ({ ...prev, tier: value as Tier }))}>
                    <SelectTrigger className={cn(darkInputClass, '[&_span]:text-slate-100')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                      <SelectItem value="pilot">Pilot (R0)</SelectItem>
                      <SelectItem value="basic">Basic (R199)</SelectItem>
                      <SelectItem value="standard">Standard (R299)</SelectItem>
                      <SelectItem value="premium">Premium (R499)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo-upload" className="text-slate-300">
                    Logo Upload
                  </Label>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className={darkInputClass}
                    onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-slate-500">{logoFile ? logoFile.name : 'No file selected'}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero-upload" className="text-slate-300">
                    Hero Image Upload
                  </Label>
                  <Input
                    id="hero-upload"
                    type="file"
                    accept="image/*"
                    className={darkInputClass}
                    onChange={(event) => setHeroFile(event.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-slate-500">{heroFile ? heroFile.name : 'No file selected'}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap justify-between gap-3">
              <p className="text-xs text-slate-500">
                Welcome pack and invite flow trigger automatically after successful creation.
              </p>
              <Button
                onClick={() => void handleCreate()}
                loading={busy}
                disabled={Boolean(exactCentreMatch)}
                className="bg-cyan-500 text-black hover:bg-cyan-400"
              >
                <UploadCloud className="h-4 w-4" />
                Create & Start Onboarding
              </Button>
            </CardFooter>
          </Card>

          <div className="space-y-6">
            <Card className="border-cyan-500/20 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ImagePlus className="h-4 w-4 text-cyan-300" />
                  Brand Media
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-300">
                <p>Logo and hero image upload are included in onboarding.</p>
                <p>Files are saved to centre media storage and attached to the centre profile.</p>
              </CardContent>
            </Card>

            <Card className="border-cyan-500/20 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <MailPlus className="h-4 w-4 text-cyan-300" />
                  Invite Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <p>Owner invite is triggered automatically on successful creation.</p>
                <p>Team mode sends bulk invites immediately for all valid emails.</p>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800"
                >
                  <Link href="/admin/invites">Open Invite Tracking</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {migrationDialog}
    </>
  )
}
