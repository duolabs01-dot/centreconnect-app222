'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'
import { Button } from '@/components/cc-admin/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { adminTheme } from '@/lib/admin-theme'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertTriangle, AlertCircle, Clock, XCircle, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ROOT_DOMAIN } from '@/lib/config'

export type TenantRow = {
  id: string
  slug: string
  name: string
  city: string
  suburb: string
  is_active: boolean
  is_registered: boolean
  created_at: string
  admin_count: number
  subscription: {
    tier: string
    status: string
    monthly_price: number
    current_period_end: string | null
  } | null
  // New health fields
  last_login_at: string | null
  attendance_recorded: number
  applications_received: number
  payment_status: 'paid' | 'overdue' | 'failed' | 'unknown'
  support_tickets_open: number
  health_score: 'green' | 'amber' | 'red'
}

type TenantsIndexTableProps = {
  tenants: TenantRow[]
}

type ExistingUserConflict = {
  email?: string
  existingRole?: string | null
  existingUserId?: string | null
  willSetRole?: string
  parentAccessWillBeRevoked?: boolean
}

const TIER_MONTHLY_PRICE: Record<'pilot' | 'basic' | 'standard' | 'premium', number> = {
  pilot: 0,
  basic: 199,
  standard: 299,
  premium: 499,
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function billingBadge(tenant: TenantRow) {
  if (!tenant.subscription) return { label: 'No Plan', className: cn(adminTheme.badge, adminTheme.badgeNeutral) }
  if (tenant.subscription.status === 'active') return { label: 'Paying', className: cn(adminTheme.badge, adminTheme.badgeSuccess) }
  if (tenant.subscription.status === 'trial') return { label: 'Trial', className: cn(adminTheme.badge, adminTheme.badgeWarning) }
  if (tenant.subscription.status === 'past_due') return { label: 'Past Due', className: cn(adminTheme.badge, adminTheme.badgeError) }
  if (tenant.subscription.status === 'suspended') return { label: 'Suspended', className: cn(adminTheme.badge, adminTheme.badgeError) }
  return { label: 'Non-Paying', className: cn(adminTheme.badge, adminTheme.badgeNeutral) }
}

function HealthIndicator({ score }: { score: 'green' | 'amber' | 'red' }) {
  if (score === 'green') {
    return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
  }
  if (score === 'amber') {
    return <AlertTriangle className="h-5 w-5 text-amber-500" />
  }
  return <AlertCircle className="h-5 w-5 text-rose-500" />
}

export function TenantsIndexTable({ tenants }: TenantsIndexTableProps) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteTenant, setInviteTenant] = useState<{ id: string; name: string } | null>(null)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    role: 'ecd_staff' as 'ecd_admin' | 'ecd_staff',
  })
  const [createForm, setCreateForm] = useState({
    slug: '',
    name: '',
    primaryContactName: '',
    email: '',
    phone: '',
    address: '',
    suburb: '',
    city: 'Johannesburg',
    province: 'Gauteng',
    postalCode: '',
    monthlyPrice: String(TIER_MONTHLY_PRICE.pilot),
    tier: 'pilot',
    contractSigned: false,
    onboardingFeePaid: false,
  })
  const [existingUserConflict, setExistingUserConflict] = useState<ExistingUserConflict | null>(null)
  const [migrationConfirmOpen, setMigrationConfirmOpen] = useState(false)
  const [migrationChecks, setMigrationChecks] = useState({
    confirmRoleMigration: false,
    confirmParentAccessRevocation: false,
  })
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [, startTransition] = useTransition()
  const bulkConvertibleIds = tenants.filter((tenant) => !tenant.subscription).map((tenant) => tenant.id)
  const bulkRevertibleIds = tenants.filter((tenant) => Boolean(tenant.subscription)).map((tenant) => tenant.id)

  // CSV export — runs in browser, no server needed
  const exportCSV = () => {
    const headers = ['Name', 'City', 'Tier', 'Status', 'MRR', 'Created']
    const rows = tenants.map(t => [
      t.name,
      t.city,
      t.subscription?.tier ?? 'none',
      t.is_active ? 'Active' : 'Inactive',
      t.subscription?.monthly_price ?? 0,
      new Date(t.created_at).toLocaleDateString('en-ZA'),
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `tenants-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const premiumInputClass =
    'border-slate-500/80 bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100 placeholder:text-slate-400/95 shadow-[var(--shadow-elevation-1)] focus-visible:ring-cyan-400/70 focus-visible:border-cyan-400'

  const filteredTenants = useMemo(() => {
    let filtered = tenants;

    if (searchQuery) {
      filtered = filtered.filter(tenant => 
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.suburb.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.city.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterTier !== 'all') {
      filtered = filtered.filter(tenant => tenant.subscription?.tier === filterTier);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(tenant => {
        if (filterStatus === 'active_workspace') return tenant.is_active;
        if (filterStatus === 'suspended_workspace') return !tenant.is_active;
        if (filterStatus === 'unverified') return !tenant.is_registered;
        if (filterStatus === 'no_plan') return !tenant.subscription;
        return tenant.subscription?.status === filterStatus;
      });
    }

    return filtered;
  }, [tenants, searchQuery, filterTier, filterStatus]);

  async function convertToTenant(tenantId: string) {
    setPendingId(tenantId)
    try {
      const response = await fetch(`/api/internal/platform-admin/centres/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bootstrap_tenant',
          tier: 'basic',
          status: 'trial',
          monthlyPrice: 199,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Failed to convert to tenant')
      toast.success('Centre converted to tenant with starter subscription')
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error?.message || 'Failed to convert to tenant')
    } finally {
      setPendingId(null)
    }
  }

  async function bulkConvertToTenant() {
    if (bulkConvertibleIds.length === 0) {
      toast.error('No non-plan ECDs available to convert.')
      return
    }
    setPendingId('bulk')
    try {
      const response = await fetch('/api/internal/platform-admin/centres/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bootstrap_tenant',
          ids: bulkConvertibleIds,
          tier: 'basic',
          status: 'trial',
          monthlyPrice: 199,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; count?: number }
      if (!response.ok) throw new Error(payload.error || 'Bulk convert failed')
      toast.success(`Bulk converted ${payload.count ?? bulkConvertibleIds.length} centres to tenants`)
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error?.message || 'Bulk convert failed')
    } finally {
      setPendingId(null)
    }
  }

  async function revertToNonPaying(tenantId: string) {
    setPendingId(tenantId)
    try {
      const response = await fetch(`/api/internal/platform-admin/centres/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revert_to_non_paying',
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Failed to revert tenant to non-paying')
      toast.success('Tenant reverted to non-paying (subscription removed)')
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error?.message || 'Failed to revert tenant to non-paying')
    } finally {
      setPendingId(null)
    }
  }

  async function bulkRevertToNonPaying() {
    if (bulkRevertibleIds.length === 0) {
      toast.error('No subscription tenants available to revert.')
      return
    }
    setPendingId('bulk-revert')
    try {
      const response = await fetch('/api/internal/platform-admin/centres/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revert_to_non_paying',
          ids: bulkRevertibleIds,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; count?: number }
      if (!response.ok) throw new Error(payload.error || 'Bulk revert failed')
      toast.success(`Bulk reverted ${payload.count ?? bulkRevertibleIds.length} tenants to non-paying`)
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error?.message || 'Bulk revert failed')
    } finally {
      setPendingId(null)
    }
  }

  async function createTenant(options?: {
    allowExistingEmailMigration?: boolean
    confirmAdminRoleMigration?: boolean
    confirmParentAccessRevocation?: boolean
  }) {
    if (createBusy) return
    const requiredFields = ['name', 'primaryContactName', 'email', 'phone', 'address', 'suburb', 'slug'] as const
    for (const field of requiredFields) {
      if (!createForm[field].trim()) {
        toast.error(`Missing ${field}`)
        return
      }
    }
    
    if (!createForm.contractSigned) {
      toast.error('Contract must be signed before proceeding.')
      return
    }
    if (createForm.tier !== 'pilot' && !createForm.onboardingFeePaid) {
      toast.error('Onboarding fee must be paid before proceeding.')
      return
    }

    const monthlyPrice = Number(createForm.monthlyPrice)
    if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
      toast.error('Monthly price must be a valid number')
      return
    }

    setCreateBusy(true)
    try {
      const response = await fetch('/api/internal/platform-admin/centres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: createForm.slug.trim(),
          name: createForm.name.trim(),
          primaryContactName: createForm.primaryContactName.trim(),
          email: createForm.email.trim().toLowerCase(),
          phone: createForm.phone.trim(),
          address: createForm.address.trim(),
          suburb: createForm.suburb.trim(),
          city: createForm.city.trim() || 'Johannesburg',
          province: createForm.province.trim() || 'Gauteng',
          postalCode: createForm.postalCode.trim() || undefined,
          monthlyPrice,
          tier: createForm.tier,
          contractSigned: createForm.contractSigned,
          onboardingFeePaid: createForm.onboardingFeePaid,
          allowExistingEmailMigration: options?.allowExistingEmailMigration ?? false,
          confirmAdminRoleMigration: options?.confirmAdminRoleMigration ?? false,
          confirmParentAccessRevocation: options?.confirmParentAccessRevocation ?? false,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        code?: string
        conflict?: ExistingUserConflict
        centre?: { name?: string }
        pilot?: boolean
        migratedExistingUser?: boolean
        previousRole?: string | null
        warnings?: string[]
      }
      if (!response.ok) {
        if (response.status === 409 && payload.code === 'existing_user_confirmation_required') {
          setExistingUserConflict(payload.conflict ?? null)
          setMigrationChecks({
            confirmRoleMigration: false,
            confirmParentAccessRevocation: false,
          })
          setMigrationConfirmOpen(true)
          return
        }
        throw new Error(payload.error || 'Failed to create tenant')
      }

      toast.success(
        `Tenant created${payload.centre?.name ? `: ${payload.centre.name}` : ''}. Password setup email queued${
          payload.pilot ? ' + pilot welcome pack queued' : ''
        }.${payload.migratedExistingUser ? ' Existing user migrated to ECD Admin.' : ''}`
      )
      if (payload.warnings?.length) {
        toast.warning(payload.warnings[0])
      }
      setCreateOpen(false)
      setMigrationConfirmOpen(false)
      setExistingUserConflict(null)
      setCreateForm({
        slug: '',
        name: '',
        primaryContactName: '',
        email: '',
        phone: '',
        address: '',
        suburb: '',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '',
        monthlyPrice: String(TIER_MONTHLY_PRICE.pilot),
        tier: 'pilot',
        contractSigned: false,
        onboardingFeePaid: false,
      })
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create tenant')
    } finally {
      setCreateBusy(false)
    }
  }

  async function sendInvite() {
    if (!inviteTenant || inviteBusy) return
    const email = inviteForm.email.trim().toLowerCase()
    if (!email) {
      toast.error('Email is required')
      return
    }

    setInviteBusy(true)
    try {
      const response = await fetch('/api/internal/platform-admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ecdId: inviteTenant.id,
          email,
          role: inviteForm.role,
          fullName: inviteForm.fullName.trim() || undefined,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        invitedEmail?: string
        role?: string
        linkedExistingUser?: boolean
        pendingLinkOnNextLogin?: boolean
        parentAccessRevoked?: boolean
      }
      if (!response.ok) throw new Error(payload.error || 'Failed to send invite')

      if (payload.linkedExistingUser) {
        toast.success(
          `Linked existing account ${payload.invitedEmail ?? email} as ${payload.role ?? inviteForm.role}${
            payload.parentAccessRevoked ? ' (parent access revoked)' : ''
          }`
        )
      } else if (payload.pendingLinkOnNextLogin) {
        toast.success(
          `Invite saved for ${payload.invitedEmail ?? email} as ${payload.role ?? inviteForm.role}. Access will link on next login.`
        )
      } else {
        toast.success(`Invite sent to ${payload.invitedEmail ?? email} as ${payload.role ?? inviteForm.role}`)
      }
      setInviteForm({ email: '', fullName: '', role: 'ecd_staff' })
      setInviteOpen(false)
      setInviteTenant(null)
      startTransition(() => router.refresh())
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send invite')
    } finally {
      setInviteBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setCreateOpen(true)} className={adminTheme.buttonPrimary}>
          Create Tenant
        </Button>
        <Button
          size="sm"
          disabled={pendingId === 'bulk'}
          onClick={() => void bulkConvertToTenant()}
          className={adminTheme.buttonSecondary}
        >
          Convert All Non-Paying ECDs ({bulkConvertibleIds.length})
        </Button>
        <Button
          size="sm"
          disabled={pendingId === 'bulk-revert'}
          onClick={() => void bulkRevertToNonPaying()}
          className={adminTheme.buttonSecondary}
        >
          Revert All To Non-Paying ({bulkRevertibleIds.length})
        </Button>
        <Button size="sm" onClick={exportCSV} className={adminTheme.buttonSecondary}>
          Export CSV
        </Button>
      </div>

      <div className="flex items-center space-x-2 my-4">
        <div className="relative flex-1 min-w-[200px]"> {/* Added min-w to prevent it from collapsing too much */}
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn("pl-9", premiumInputClass)}
          />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className={cn("w-[200px]", premiumInputClass)}>
            <SelectValue placeholder="Filter by Tier" />
          </SelectTrigger>
          <SelectContent className={cn("border-slate-500/80 bg-slate-900 text-slate-100 shadow-[var(--shadow-elevation-4)] [&_*]:text-slate-100")}>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="pilot">Pilot</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className={cn("w-[200px]", premiumInputClass)}>
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent className={cn("border-slate-500/80 bg-slate-900 text-slate-100 shadow-[var(--shadow-elevation-4)] [&_*]:text-slate-100")}>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
            <SelectItem value="active_workspace">Workspace: Active</SelectItem>
            <SelectItem value="suspended_workspace">Workspace: Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={adminTheme.tableWrapper}>
        <Table>
          <TableCaption className="sr-only">Tenant index with billing segment and tenant conversion actions</TableCaption>
          <TableHeader className={adminTheme.tableHeader}>
            <TableRow className={cn(adminTheme.tr, "hover:bg-transparent border-b border-white/10")}>
              <TableHead className={cn(adminTheme.th, "min-w-[80px]")}>Health</TableHead>
              <TableHead className={cn(adminTheme.th, "min-w-[180px]")}>Tenant</TableHead>
              <TableHead className={cn(adminTheme.th, "min-w-[150px]")}>Location</TableHead>
              <TableHead className={cn(adminTheme.th, "min-w-[80px]")}>Admins</TableHead>
              <TableHead className={cn(adminTheme.th, "min-w-[140px]")}>Last Active</TableHead>
              <TableHead className={cn(adminTheme.th, "min-w-[120px]")}>Usage</TableHead>
              <TableHead className={cn(adminTheme.th, "min-w-[120px]")}>Payment</TableHead>
              <TableHead className={cn(adminTheme.th, "min-w-[120px]")}>Support</TableHead>
              <TableHead className={cn(adminTheme.th, "min-w-[140px]")}>Package</TableHead>
              <TableHead className={cn(adminTheme.th, "min-w-[140px]")}>Created</TableHead>
              <TableHead className={cn(adminTheme.th, "text-right min-w-[180px]")}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTenants.map((tenant) => {
              const bill = billingBadge(tenant)
              return (
                <TableRow key={tenant.id} className={cn(adminTheme.tr, "border-b border-white/5")}>
                  <TableCell className={adminTheme.td}>
                    <HealthIndicator score={tenant.health_score} />
                  </TableCell>
                  <TableCell className={cn(adminTheme.td, "font-medium text-white")}>
                    {tenant.name}
                    <span className="block text-xs text-slate-400 capitalize">{tenant.subscription?.tier} plan</span>
                  </TableCell>
                  <TableCell className={adminTheme.td}>
                    <div className="text-xs text-slate-400">
                      <span>{tenant.suburb}</span>, <span>{tenant.city}</span>
                    </div>
                  </TableCell>
                  <TableCell className={adminTheme.td}>
                    <span className="text-white">{tenant.admin_count}</span>
                  </TableCell>
                  <TableCell className={adminTheme.td}>
                    {tenant.last_login_at ? (
                      <span className="text-xs text-slate-400">{formatDateTime(tenant.last_login_at)}</span>
                    ) : (
                      <span className="text-xs text-slate-500">Never</span>
                    )}
                  </TableCell>
                  <TableCell className={adminTheme.td}>
                    <div className="text-xs text-slate-400">
                      <span>Apps: {tenant.applications_received}</span>
                      <span className="block">Att: {tenant.attendance_recorded}</span>
                    </div>
                  </TableCell>
                  <TableCell className={adminTheme.td}>
                    <Badge className={bill.className}>
                      {bill.label}
                    </Badge>
                  </TableCell>
                  <TableCell className={adminTheme.td}>
                    {tenant.support_tickets_open > 0 ? (
                      <Badge className={cn(adminTheme.badge, adminTheme.badgeWarning)}>
                        {tenant.support_tickets_open} Open
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </TableCell>
                  <TableCell className={adminTheme.td}>
                    {tenant.subscription ? (
                      <div className="text-sm">
                        <p className="uppercase text-white">{tenant.subscription.tier} | R{tenant.subscription.monthly_price}</p>
                        <p className="text-xs text-slate-400">{tenant.subscription.status}</p>
                      </div>
                    ) : (
                      <Badge className={cn(adminTheme.badge, adminTheme.badgeNeutral)}>No subscription</Badge>
                    )}
                  </TableCell>
                  <TableCell className={adminTheme.td}>{formatDateTime(tenant.created_at)}</TableCell>
                  <TableCell className={cn(adminTheme.td, "text-right")}>
                    <div className="flex justify-end gap-2">
                      {!tenant.subscription ? (
                        <Button
                          size="sm"
                          disabled={pendingId === tenant.id}
                          onClick={() => void convertToTenant(tenant.id)}
                          className={adminTheme.buttonPrimary}
                        >
                          Convert
                        </Button>
                      ) : null}
                      {tenant.subscription ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingId === tenant.id}
                          onClick={() => void revertToNonPaying(tenant.id)}
                          className={adminTheme.buttonSecondary}
                        >
                          Revert
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setInviteTenant({ id: tenant.id, name: tenant.name })
                          setInviteOpen(true)
                        }}
                        className={adminTheme.buttonSecondary}
                      >
                        Invite
                      </Button>
                      <Button asChild size="sm" variant="outline" className={adminTheme.buttonSecondary}>
                        <Link href={`/admin/tenants/${tenant.id}`}>View</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {filteredTenants.length === 0 && (
          <div className="p-6 text-center text-slate-400">No tenants found matching your criteria.</div>
        )}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            setMigrationConfirmOpen(false)
            setExistingUserConflict(null)
            setMigrationChecks({
              confirmRoleMigration: false,
              confirmParentAccessRevocation: false,
            })
          }
        }}
      >
        <DialogContent className={cn(adminTheme.card, "bg-slate-900/90")}>
          <DialogHeader>
            <DialogTitle className={adminTheme.cardTitle}>Create Tenant</DialogTitle>
            <DialogDescription className="text-slate-300">
              Create a new tenant workspace and starter subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="tenant-name" className={adminTheme.body}>Centre Name</Label>
              <Input
                id="tenant-name"
                className={premiumInputClass}
                placeholder="e.g. Bright Futures Early Learning Centre"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((prev) => {
                    const name = e.target.value
                    return { ...prev, name, slug: toSlug(name) }
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tenant-slug" className={adminTheme.body}>Centre Slug</Label>
              <Input
                id="tenant-slug"
                className={premiumInputClass}
                placeholder="Auto-generated, editable"
                value={createForm.slug}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, slug: e.target.value }))}
              />
              <p className="text-[11px] text-slate-400">This becomes the subdomain: [slug].{ROOT_DOMAIN}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="primary-contact-name" className={adminTheme.body}>Primary Contact Name</Label>
              <Input
                id="primary-contact-name"
                className={premiumInputClass}
                placeholder="Jane Doe"
                value={createForm.primaryContactName}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, primaryContactName: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tenant-email" className={adminTheme.body}>Primary Contact Email</Label>
              <Input
                id="tenant-email"
                type="email"
                className={premiumInputClass}
                placeholder="owner@centre.co.za"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tenant-phone" className={adminTheme.body}>Primary Contact Phone</Label>
              <Input
                id="tenant-phone"
                className={premiumInputClass}
                placeholder="+27 72 123 4567"
                value={createForm.phone}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tenant-address" className={adminTheme.body}>Address</Label>
              <Input
                id="tenant-address"
                className={premiumInputClass}
                placeholder="123 Main Road"
                value={createForm.address}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tenant-suburb" className={adminTheme.body}>Suburb</Label>
              <Input
                id="tenant-suburb"
                className={premiumInputClass}
                placeholder="Alexandra"
                value={createForm.suburb}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, suburb: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tenant-province" className={adminTheme.body}>Province</Label>
              <Input
                id="tenant-province"
                className={premiumInputClass}
                placeholder="Gauteng"
                value={createForm.province}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, province: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tenant-city" className={adminTheme.body}>City</Label>
              <Input
                id="tenant-city"
                className={premiumInputClass}
                placeholder="Johannesburg"
                value={createForm.city}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tenant-tier" className={adminTheme.body}>Package Selection</Label>
              <Select
                value={createForm.tier}
                onValueChange={(value) =>
                  setCreateForm((prev) => {
                    const tier = value as keyof typeof TIER_MONTHLY_PRICE
                    return { ...prev, tier, monthlyPrice: String(TIER_MONTHLY_PRICE[tier]) }
                  })
                }
              >
                <SelectTrigger id="tenant-tier" className={cn(premiumInputClass, "[&_span]:text-slate-100")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={cn("border-slate-500/80 bg-slate-900 text-slate-100 shadow-[var(--shadow-elevation-4)] [&_*]:text-slate-100")}>
                  <SelectItem value="basic" className="focus:bg-cyan-500/20 focus:text-cyan-100">Basic R199/mo</SelectItem>
                  <SelectItem value="standard" className="focus:bg-cyan-500/20 focus:text-cyan-100">Standard R299/mo</SelectItem>
                  <SelectItem value="premium" className="focus:bg-cyan-500/20 focus:text-cyan-100">Premium R499/mo</SelectItem>
                  <SelectItem value="pilot" className="focus:bg-cyan-500/20 focus:text-cyan-100">Pilot Trial (No card) R0</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tenant-monthly-price" className={adminTheme.body}>Calculated Monthly Price</Label>
              <Input
                id="tenant-monthly-price"
                type="number"
                min={0}
                className={`${premiumInputClass} cursor-not-allowed opacity-95`}
                readOnly
                aria-readonly="true"
                value={createForm.monthlyPrice}
              />
            </div>
            <div className="flex items-center space-x-2 md:col-span-2">
              <input
                id="contract-signed"
                type="checkbox"
                className={cn(premiumInputClass, "h-4 w-4")}
                checked={createForm.contractSigned}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, contractSigned: e.target.checked }))}
              />
              <Label htmlFor="contract-signed" className={adminTheme.body}>Contract signed?</Label>
            </div>
            <div className="flex items-center space-x-2 md:col-span-2">
              <input
                id="onboarding-fee-paid"
                type="checkbox"
                className={cn(premiumInputClass, "h-4 w-4")}
                checked={createForm.onboardingFeePaid}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, onboardingFeePaid: e.target.checked }))}
              />
              <Label htmlFor="onboarding-fee-paid" className={adminTheme.body}>Onboarding fee paid?</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className={adminTheme.buttonSecondary}
              onClick={() => setCreateOpen(false)}
              disabled={createBusy}
            >
              Cancel
            </Button>
            <Button className={adminTheme.buttonPrimary} onClick={() => void createTenant()} disabled={createBusy}>
              {createBusy ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={migrationConfirmOpen}
        onOpenChange={(open) => {
          setMigrationConfirmOpen(open)
          if (!open) {
            setMigrationChecks({
              confirmRoleMigration: false,
              confirmParentAccessRevocation: false,
            })
          }
        }}
      >
        <DialogContent className={cn(adminTheme.card, "bg-slate-900/90")}>
          <DialogHeader>
            <DialogTitle className={adminTheme.cardTitle}>Confirm Existing Account Migration</DialogTitle>
            <DialogDescription className="text-slate-300">
              {existingUserConflict?.email
                ? `${existingUserConflict.email} is already registered. Continue only if you want to force this account into ECD Admin for this new tenant.`
                : 'This email is already registered. Continue only if you want to force this account into ECD Admin for this new tenant.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-slate-200">
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-amber-100">
              Current role: <span className="font-semibold">{existingUserConflict?.existingRole ?? 'Unknown'}</span><br />
              New role: <span className="font-semibold">{existingUserConflict?.willSetRole ?? 'ecd_admin'}</span><br />
              Parent access: <span className="font-semibold">Will be blocked after migration</span>
            </div>
            <div className="flex items-start gap-2">
              <input
                id="confirm-role-migration"
                type="checkbox"
                className={cn(premiumInputClass, "mt-0.5 h-4 w-4")}
                checked={migrationChecks.confirmRoleMigration}
                onChange={(event) =>
                  setMigrationChecks((prev) => ({ ...prev, confirmRoleMigration: event.target.checked }))
                }
              />
              <Label htmlFor="confirm-role-migration" className={adminTheme.body}>
                I confirm this user account must be migrated to ECD Admin.
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <input
                id="confirm-parent-access-revocation"
                type="checkbox"
                className={cn(premiumInputClass, "mt-0.5 h-4 w-4")}
                checked={migrationChecks.confirmParentAccessRevocation}
                onChange={(event) =>
                  setMigrationChecks((prev) => ({ ...prev, confirmParentAccessRevocation: event.target.checked }))
                }
              />
              <Label htmlFor="confirm-parent-access-revocation" className={adminTheme.body}>
                I confirm parent access will be revoked for this account.
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className={adminTheme.buttonSecondary}
              onClick={() => setMigrationConfirmOpen(false)}
              disabled={createBusy}
            >
              Cancel
            </Button>
            <Button
              className={adminTheme.buttonPrimary}
              disabled={
                createBusy ||
                !migrationChecks.confirmRoleMigration ||
                !migrationChecks.confirmParentAccessRevocation
              }
              onClick={() =>
                void createTenant({
                  allowExistingEmailMigration: true,
                  confirmAdminRoleMigration: migrationChecks.confirmRoleMigration,
                  confirmParentAccessRevocation: migrationChecks.confirmParentAccessRevocation,
                })
              }
            >
              {createBusy ? 'Migrating...' : 'Confirm & Create Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open) setInviteTenant(null)
        }}
      >
        <DialogContent className={cn(adminTheme.card, "bg-slate-900/90")}>
          <DialogHeader>
            <DialogTitle className={adminTheme.cardTitle}>Invite Admin or Staff</DialogTitle>
            <DialogDescription className="text-slate-300">
              {inviteTenant ? `Send an access invite for ${inviteTenant.name}.` : 'Send an access invite.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="invite-email" className={adminTheme.body}>Email</Label>
              <Input
                id="invite-email"
                type="email"
                className={premiumInputClass}
                placeholder="educator@centre.co.za"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="invite-name" className={adminTheme.body}>Full Name (optional)</Label>
              <Input
                id="invite-name"
                className={premiumInputClass}
                placeholder="Jane Doe"
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="invite-role" className={adminTheme.body}>Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) => setInviteForm((prev) => ({ ...prev, role: value as 'ecd_admin' | 'ecd_staff' }))}
              >
                <SelectTrigger id="invite-role" className={cn(premiumInputClass, "[&_span]:text-slate-100")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={cn("border-slate-500/80 bg-slate-900 text-slate-100 shadow-[var(--shadow-elevation-4)] [&_*]:text-slate-100")}>
                  <SelectItem value="ecd_staff" className="focus:bg-cyan-500/20 focus:text-cyan-100">Teacher / Educator</SelectItem>
                  <SelectItem value="ecd_admin" className="focus:bg-cyan-500/20 focus:text-cyan-100">ECD Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className={adminTheme.buttonSecondary}
              onClick={() => {
                setInviteOpen(false)
                setInviteTenant(null)
              }}
              disabled={inviteBusy}
            >
              Cancel
            </Button>
            <Button className={adminTheme.buttonPrimary} onClick={() => void sendInvite()} disabled={inviteBusy || !inviteTenant}>
              {inviteBusy ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


