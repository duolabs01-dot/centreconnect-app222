'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type FeeDisplayMode = 'exact' | 'range' | 'contact'
type SubscriptionTier = 'pilot' | 'basic' | 'standard' | 'premium'
type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended'
type DsdStatus = 'pending' | 'registered' | 'expired' | 'suspended' | 'not_required'

export type AdminTenantTableRow = {
  id: string
  name: string
  slug: string
  ownerEmail: string
  ownerPhone: string
  status: 'Claimed' | 'Unclaimed' | 'Inactive'
  claimedDate: string | null
  primaryContactName: string
  email: string
  phone: string
  contactPhone: string
  contactWhatsapp: string
  address: string
  suburb: string
  city: string
  province: string
  postalCode: string
  logoUrl: string
  coverImageUrl: string
  feesDisplayMode: FeeDisplayMode
  monthlyFeeMin: string
  monthlyFeeMax: string
  subsidyAccepted: boolean
  age0to2: string
  age2to4: string
  age4to6: string
  age6plus: string
  operatingHours: string
  dsdStatus: DsdStatus
  marketplaceUpgrades: string
  isActive: boolean
  isRegistered: boolean
  subscriptionTier: SubscriptionTier
  subscriptionStatus: SubscriptionStatus
  subscriptionMonthlyPrice: string
}

type AdminTenantsTableProps = {
  tenants: AdminTenantTableRow[]
}

const darkInputClass =
  'border-cyan-500/20 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-400/70'

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-ZA', { dateStyle: 'medium' })
}

function parseNumberOrNull(value: string) {
  const normalized = value.trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return parsed
}

function ageFeeToCents(value: string) {
  const parsed = parseNumberOrNull(value)
  if (parsed == null) return 0
  return Math.max(0, Math.round(parsed * 100))
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function AdminTenantsTable({ tenants }: AdminTenantsTableProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editTenantId, setEditTenantId] = useState<string | null>(null)
  const [form, setForm] = useState<AdminTenantTableRow | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tenants
    return tenants.filter((tenant) =>
      [tenant.name, tenant.slug, tenant.ownerEmail, tenant.ownerPhone, tenant.city, tenant.suburb]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [tenants, query])

  const statusBadgeClass = (status: AdminTenantTableRow['status']) => {
    if (status === 'Claimed') return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
    if (status === 'Inactive') return 'border-slate-600 bg-slate-800 text-slate-300'
    return 'border-amber-500/30 bg-amber-500/15 text-amber-200'
  }

  function openEdit(tenant: AdminTenantTableRow) {
    setEditTenantId(tenant.id)
    setForm({ ...tenant })
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!form || !editTenantId) return
    if (!form.name.trim() || !form.slug.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error('Name, slug, email and phone are required.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        action: 'set_profile',
        name: form.name.trim(),
        slug: slugify(form.slug),
        primaryContactName: form.primaryContactName.trim() || null,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        contactPhone: form.contactPhone.trim() || null,
        contactWhatsapp: form.contactWhatsapp.trim() || null,
        address: form.address.trim() || '',
        suburb: form.suburb.trim() || '',
        city: form.city.trim() || 'Johannesburg',
        province: form.province.trim() || 'Gauteng',
        postalCode: form.postalCode.trim() || null,
        logoUrl: form.logoUrl.trim() || null,
        coverImageUrl: form.coverImageUrl.trim() || null,
        feesDisplayMode: form.feesDisplayMode,
        monthlyFeeMin: parseNumberOrNull(form.monthlyFeeMin),
        monthlyFeeMax: parseNumberOrNull(form.monthlyFeeMax),
        subsidyAccepted: form.subsidyAccepted,
        ageGroupPricing: {
          '0-2': { label: '0-2 years', monthly_fee_cents: ageFeeToCents(form.age0to2) },
          '2-4': { label: '2-4 years', monthly_fee_cents: ageFeeToCents(form.age2to4) },
          '4-6': { label: '4-6 years', monthly_fee_cents: ageFeeToCents(form.age4to6) },
          '6+': { label: 'Aftercare (6+)', monthly_fee_cents: ageFeeToCents(form.age6plus) },
        },
        operatingHours: form.operatingHours.trim() || null,
        dsdStatus: form.dsdStatus,
        marketplaceUpgrades: form.marketplaceUpgrades
          .split(/[\n,;]+/g)
          .map((item) => item.trim())
          .filter(Boolean),
        isActive: form.isActive,
        isRegistered: form.isRegistered,
        subscriptionTier: form.subscriptionTier,
        subscriptionStatus: form.subscriptionStatus,
        subscriptionMonthlyPrice: parseNumberOrNull(form.subscriptionMonthlyPrice) ?? 0,
      }

      const response = await fetch(`/api/internal/platform-admin/centres/${editTenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(body.error || 'Failed to update tenant.')

      toast.success('Tenant profile updated.')
      setEditOpen(false)
      setEditTenantId(null)
      setForm(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update tenant.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card className="border-cyan-500/20 bg-slate-950/70">
        <CardHeader className="space-y-3">
          <CardTitle className="text-white">All Tenants</CardTitle>
          <CardDescription className="text-slate-400">
            Full tenant operations table with one-click edit modal.
          </CardDescription>
          <div className="max-w-sm">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search centres, owners, suburbs..."
              className={darkInputClass}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/30">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-[0.18em] text-slate-500">Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.18em] text-slate-500">Owner Email</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.18em] text-slate-500">Owner Phone</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.18em] text-slate-500">Claimed Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.18em] text-slate-500">Package</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.18em] text-slate-500 text-right">Quick Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">
                      No tenants found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((tenant) => (
                    <TableRow key={tenant.id} className="border-slate-800">
                      <TableCell className="font-semibold text-slate-100">{tenant.name}</TableCell>
                      <TableCell className="text-slate-300">{tenant.ownerEmail}</TableCell>
                      <TableCell className="text-slate-300">{tenant.ownerPhone}</TableCell>
                      <TableCell>
                        <Badge className={statusBadgeClass(tenant.status)}>{tenant.status}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">{formatDate(tenant.claimedDate)}</TableCell>
                      <TableCell className="text-slate-300">
                        {tenant.subscriptionTier.toUpperCase()} / {tenant.subscriptionStatus}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800"
                            onClick={() => openEdit(tenant)}
                          >
                            Edit
                          </Button>
                          <Button asChild size="sm" variant="outline" className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800">
                            <Link href={`/admin/tenants/${tenant.id}`}>View</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800">
                            <Link href={`/admin/tenants/${tenant.id}#invite`}>Invite</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-cyan-500/30 bg-slate-950 text-slate-100 sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-cyan-200">Edit Tenant</DialogTitle>
            <DialogDescription className="text-slate-300">
              Update package, branding, pricing, marketplace upgrades, operating profile and compliance details.
            </DialogDescription>
          </DialogHeader>

          {form ? (
            <Tabs defaultValue="general" className="space-y-4">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 border border-cyan-500/20 bg-slate-900/80 p-1 sm:grid-cols-5">
                <TabsTrigger value="general" className="text-slate-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-100">
                  General
                </TabsTrigger>
                <TabsTrigger value="package" className="text-slate-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-100">
                  Package
                </TabsTrigger>
                <TabsTrigger value="media" className="text-slate-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-100">
                  Media
                </TabsTrigger>
                <TabsTrigger value="pricing" className="text-slate-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-100">
                  Pricing
                </TabsTrigger>
                <TabsTrigger value="operations" className="text-slate-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-100">
                  Operations
                </TabsTrigger>
              </TabsList>
              <TabsContent value="general" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Centre Name</Label>
                    <Input
                      className={darkInputClass}
                      value={form.name}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Slug</Label>
                    <Input
                      className={darkInputClass}
                      value={form.slug}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, slug: event.target.value } : prev))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Primary Contact Name</Label>
                    <Input
                      className={darkInputClass}
                      value={form.primaryContactName}
                      onChange={(event) =>
                        setForm((prev) => (prev ? { ...prev, primaryContactName: event.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Owner Email</Label>
                    <Input
                      type="email"
                      className={darkInputClass}
                      value={form.email}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, email: event.target.value } : prev))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Owner Phone</Label>
                    <Input
                      className={darkInputClass}
                      value={form.phone}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, phone: event.target.value } : prev))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Contact Phone</Label>
                    <Input
                      className={darkInputClass}
                      value={form.contactPhone}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, contactPhone: event.target.value } : prev))}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-slate-300">Contact WhatsApp</Label>
                    <Input
                      className={darkInputClass}
                      value={form.contactWhatsapp}
                      onChange={(event) =>
                        setForm((prev) => (prev ? { ...prev, contactWhatsapp: event.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-slate-300">Address</Label>
                    <Input
                      className={darkInputClass}
                      value={form.address}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, address: event.target.value } : prev))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Suburb</Label>
                    <Input
                      className={darkInputClass}
                      value={form.suburb}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, suburb: event.target.value } : prev))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">City</Label>
                    <Input
                      className={darkInputClass}
                      value={form.city}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, city: event.target.value } : prev))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Province</Label>
                    <Input
                      className={darkInputClass}
                      value={form.province}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, province: event.target.value } : prev))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Postal Code</Label>
                    <Input
                      className={darkInputClass}
                      value={form.postalCode}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, postalCode: event.target.value } : prev))}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="package" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Package Tier</Label>
                    <Select
                      value={form.subscriptionTier}
                      onValueChange={(value) =>
                        setForm((prev) => (prev ? { ...prev, subscriptionTier: value as SubscriptionTier } : prev))
                      }
                    >
                      <SelectTrigger className={`${darkInputClass} [&_span]:text-slate-100`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                        <SelectItem value="pilot">Pilot</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Subscription Status</Label>
                    <Select
                      value={form.subscriptionStatus}
                      onValueChange={(value) =>
                        setForm((prev) => (prev ? { ...prev, subscriptionStatus: value as SubscriptionStatus } : prev))
                      }
                    >
                      <SelectTrigger className={`${darkInputClass} [&_span]:text-slate-100`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="past_due">Past Due</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Monthly Price (R)</Label>
                    <Input
                      type="number"
                      min={0}
                      className={darkInputClass}
                      value={form.subscriptionMonthlyPrice}
                      onChange={(event) =>
                        setForm((prev) => (prev ? { ...prev, subscriptionMonthlyPrice: event.target.value } : prev))
                      }
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="media" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Logo URL</Label>
                    <Input
                      className={darkInputClass}
                      value={form.logoUrl}
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, logoUrl: event.target.value } : prev))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Hero Image URL</Label>
                    <Input
                      className={darkInputClass}
                      value={form.coverImageUrl}
                      onChange={(event) =>
                        setForm((prev) => (prev ? { ...prev, coverImageUrl: event.target.value } : prev))
                      }
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Fees Display Mode</Label>
                    <Select
                      value={form.feesDisplayMode}
                      onValueChange={(value) =>
                        setForm((prev) => (prev ? { ...prev, feesDisplayMode: value as FeeDisplayMode } : prev))
                      }
                    >
                      <SelectTrigger className={`${darkInputClass} [&_span]:text-slate-100`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                        <SelectItem value="exact">Exact</SelectItem>
                        <SelectItem value="range">Range</SelectItem>
                        <SelectItem value="contact">Contact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Monthly Fee Min (R)</Label>
                    <Input
                      type="number"
                      min={0}
                      className={darkInputClass}
                      value={form.monthlyFeeMin}
                      onChange={(event) =>
                        setForm((prev) => (prev ? { ...prev, monthlyFeeMin: event.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Monthly Fee Max (R)</Label>
                    <Input
                      type="number"
                      min={0}
                      className={darkInputClass}
                      value={form.monthlyFeeMax}
                      onChange={(event) =>
                        setForm((prev) => (prev ? { ...prev, monthlyFeeMax: event.target.value } : prev))
                      }
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="mb-3 text-sm font-medium text-white">Pricing By Age (R/month)</p>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">0-2 years</Label>
                      <Input
                        type="number"
                        min={0}
                        className={darkInputClass}
                        value={form.age0to2}
                        onChange={(event) => setForm((prev) => (prev ? { ...prev, age0to2: event.target.value } : prev))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">2-4 years</Label>
                      <Input
                        type="number"
                        min={0}
                        className={darkInputClass}
                        value={form.age2to4}
                        onChange={(event) => setForm((prev) => (prev ? { ...prev, age2to4: event.target.value } : prev))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">4-6 years</Label>
                      <Input
                        type="number"
                        min={0}
                        className={darkInputClass}
                        value={form.age4to6}
                        onChange={(event) => setForm((prev) => (prev ? { ...prev, age4to6: event.target.value } : prev))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">6+ / Aftercare</Label>
                      <Input
                        type="number"
                        min={0}
                        className={darkInputClass}
                        value={form.age6plus}
                        onChange={(event) => setForm((prev) => (prev ? { ...prev, age6plus: event.target.value } : prev))}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                  <Label className="text-slate-300">DSD Subsidy Accepted</Label>
                  <Switch
                    checked={form.subsidyAccepted}
                    onCheckedChange={(checked) => setForm((prev) => (prev ? { ...prev, subsidyAccepted: checked } : prev))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="operations" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Operating Hours</Label>
                    <Textarea
                      className={`${darkInputClass} min-h-[108px]`}
                      value={form.operatingHours}
                      onChange={(event) =>
                        setForm((prev) => (prev ? { ...prev, operatingHours: event.target.value } : prev))
                      }
                      placeholder="Mon-Fri 06:30-17:30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Marketplace Upgrades</Label>
                    <Textarea
                      className={`${darkInputClass} min-h-[108px]`}
                      value={form.marketplaceUpgrades}
                      onChange={(event) =>
                        setForm((prev) => (prev ? { ...prev, marketplaceUpgrades: event.target.value } : prev))
                      }
                      placeholder="Bookkeeping, HR Toolkit, Marketing Boost"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">DSD Status</Label>
                    <Select
                      value={form.dsdStatus}
                      onValueChange={(value) => setForm((prev) => (prev ? { ...prev, dsdStatus: value as DsdStatus } : prev))}
                    >
                      <SelectTrigger className={`${darkInputClass} [&_span]:text-slate-100`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="registered">Registered</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="not_required">Not Required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Workspace Flags</Label>
                    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Workspace Active</span>
                        <Switch
                          checked={form.isActive}
                          onCheckedChange={(checked) => setForm((prev) => (prev ? { ...prev, isActive: checked } : prev))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">DSD Verified</span>
                        <Switch
                          checked={form.isRegistered}
                          onCheckedChange={(checked) =>
                            setForm((prev) => (prev ? { ...prev, isRegistered: checked } : prev))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()} loading={saving} className="bg-cyan-500 text-black hover:bg-cyan-400">
              Save Tenant Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
