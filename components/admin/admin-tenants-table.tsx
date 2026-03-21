'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  buildDefaultOperatingSchedule,
  OPERATING_DAYS,
  summarizeOperatingSchedule,
  type CentreOperatingSchedule,
  type OperatingDayKey,
} from '@/lib/time/centre-operating-schedule'
import { type CentreClassroomDraft } from '@/lib/ecd/centre-public-profile'
import { X } from 'lucide-react'
import type { CentreCoordinateConfidence, CentreCoordinateSource } from '@/lib/geo/centre-location-metadata'

type FeeDisplayMode = 'exact' | 'range' | 'contact'
type SubscriptionTier = 'none' | 'basic' | 'standard' | 'premium'
type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended'
type DsdStatus = 'pending' | 'registered' | 'expired' | 'suspended' | 'not_required'
type TenantUserPrivilege = 'owner' | 'ecd_admin' | 'ecd_supervisor' | 'ecd_staff'
type TenantUserDraftPrivilege = TenantUserPrivilege | 'parent_user'

export type AdminTenantTableRow = {
  id: string
  name: string
  slug: string
  ownerEmail: string
  ownerPhone: string
  status: 'Claimed' | 'Unclaimed' | 'Inactive'
  claimedDate: string | null
  primaryContactName: string
  primaryContactFirstName: string
  primaryContactSurname: string
  email: string
  phone: string
  contactPhone: string
  contactWhatsapp: string
  address: string
  suburb: string
  city: string
  province: string
  postalCode: string
  latitude: string
  longitude: string
  coordinateSource: CentreCoordinateSource
  coordinateConfidence: CentreCoordinateConfidence
  logoUrl: string
  coverImageUrl: string
  feesDisplayMode: FeeDisplayMode
  monthlyFeeMin: string
  monthlyFeeMax: string
  registrationFee: string
  subsidyAccepted: boolean
  age0to2: string
  age2to4: string
  age4to6: string
  age6plus: string
  ageRangeStart: string
  ageRangeEnd: string
  operatingSchedule: CentreOperatingSchedule
  operatingHoursSummary: string
  aftercareAvailable: boolean
  aftercareEndTime: string
  classrooms: CentreClassroomDraft[]
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

type TenantUserRow = {
  userId: string
  membershipId: string | null
  role: 'ecd_admin' | 'ecd_supervisor' | 'ecd_staff'
  effectiveRole: TenantUserPrivilege
  isOwner: boolean
  fullName: string | null
  phone: string | null
  email: string | null
  invitedAt: string | null
  acceptedAt: string | null
}

type TenantPendingInvitation = {
  invitationId: string
  email: string
  role: 'ecd_admin' | 'ecd_supervisor' | 'ecd_staff'
  invitedAt: string
  acceptedAt: string | null
}

const darkInputClass =
  'border-cyan-500/20 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-400/70'

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-ZA', { dateStyle: 'medium' })
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
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

function parseWholeAge(value: string, fallback: number) {
  const parsed = Number.parseInt(value.trim(), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function buildAgeGroupsFromRange(startValue: string, endValue: string) {
  const start = Math.max(0, parseWholeAge(startValue, 0))
  const end = Math.max(start, parseWholeAge(endValue, 6))
  const groups: string[] = []

  const addBoundedGroup = (from: number, to: number) => {
    if (to < from) return
    groups.push(`${from}-${to}`)
  }

  if (start < 2) addBoundedGroup(start, Math.min(end, 2))
  if (end > 2 && start < 4) addBoundedGroup(Math.max(start, 2), Math.min(end, 4))
  if (end > 4 && start < 6) addBoundedGroup(Math.max(start, 4), Math.min(end, 6))
  if (end > 6) groups.push(`${Math.max(start, 6)}+`)

  if (groups.length === 0) {
    return [end > 6 ? `${start}+` : `${start}-${end}`]
  }

  return groups
}

function buildAgeBucketLabels(startValue: string, endValue: string) {
  const start = Math.max(0, parseWholeAge(startValue, 0))
  const end = Math.max(start, parseWholeAge(endValue, 6))
  return {
    '0-2': `${start < 2 ? start : 0}-${Math.min(end, 2)} years`,
    '2-4': `${Math.max(start, 2)}-${Math.min(end, 4)} years`,
    '4-6': `${Math.max(start, 4)}-${Math.min(end, 6)} years`,
    '6+': end > 6 ? `${Math.max(start, 6)}+ years` : 'Aftercare (6+)',
  }
}

function formatRangePreview(startValue: string, endValue: string) {
  const start = Math.max(0, parseWholeAge(startValue, 0))
  const end = Math.max(start, parseWholeAge(endValue, 6))
  return start === end ? `${start} year` : `${start}-${end} years`
}

function updateOperatingDay(
  schedule: CentreOperatingSchedule,
  day: OperatingDayKey,
  nextValue: { open?: string; close?: string } | null
) {
  if (!nextValue) {
    return { ...schedule, [day]: null }
  }

  const existing = schedule[day] ?? { open: '07:00', close: '17:30' }
  return {
    ...schedule,
    [day]: {
      open: nextValue.open ?? existing.open,
      close: nextValue.close ?? existing.close,
    },
  }
}

function updateClassroomDraft(
  classrooms: CentreClassroomDraft[],
  index: number,
  patch: Partial<CentreClassroomDraft>
) {
  const next = classrooms.slice(0, 6)
  while (next.length <= index) {
    next.push({ id: null, name: '', ageGroup: '', practitionerName: '' })
  }
  next[index] = { ...next[index], ...patch }
  return next
}

function classroomAgeLabel(room: CentreClassroomDraft) {
  return room.ageGroup.trim() || 'All ages'
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

function statusBadgeClass(status: AdminTenantTableRow['status']) {
  if (status === 'Claimed') return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
  if (status === 'Inactive') return 'border-slate-600 bg-slate-800 text-slate-300'
  return 'border-amber-500/30 bg-amber-500/15 text-amber-200'
}

function buildContactName(firstName: string, surname: string, fallback: string) {
  const combined = [firstName.trim(), surname.trim()].filter(Boolean).join(' ').trim()
  if (combined) return combined
  return fallback.trim()
}

function hasPackageChanged(
  before: AdminTenantTableRow | null,
  after: AdminTenantTableRow | null
) {
  if (!before || !after) return false
  return (
    before.subscriptionTier !== after.subscriptionTier ||
    before.subscriptionStatus !== after.subscriptionStatus ||
    before.subscriptionMonthlyPrice !== after.subscriptionMonthlyPrice
  )
}

export function AdminTenantsTable({ tenants }: AdminTenantsTableProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState<'all' | 'exact' | 'missing'>('all')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'claimedDate', desc: true }])
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersBusy, setUsersBusy] = useState(false)
  const [editTenantId, setEditTenantId] = useState<string | null>(null)
  const [form, setForm] = useState<AdminTenantTableRow | null>(null)
  const [initialForm, setInitialForm] = useState<AdminTenantTableRow | null>(null)
  const [tenantUsers, setTenantUsers] = useState<TenantUserRow[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<TenantPendingInvitation[]>([])
  const [userRoleDrafts, setUserRoleDrafts] = useState<Record<string, TenantUserDraftPrivilege>>({})
  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    role: 'ecd_staff' as TenantUserPrivilege,
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkInvitesBusy, setBulkInvitesBusy] = useState(false)
  const [bulkUpgradeBusy, setBulkUpgradeBusy] = useState(false)
  const [rowUpgrading, setRowUpgrading] = useState<Record<string, boolean>>({})
  const [rowInviting, setRowInviting] = useState<Record<string, boolean>>({})
  const [welcomePackBusy, setWelcomePackBusy] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setSelectedIds(new Set())
  }, [tenants])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleVisibleSelection = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allSelected = ids.every((id) => next.has(id))
      if (allSelected) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }
      return next
    })
  }, [])

  const sendOwnerInvite = useCallback(async (tenantId: string) => {
    const response = await fetch(`/api/internal/platform-admin/centres/${tenantId}/send-owner-invite`, {
      method: 'POST',
    })
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to send owner invite.')
    }
  }, [])

  const upgradeTenant = useCallback(async (tenantId: string) => {
    const response = await fetch(`/api/internal/platform-admin/centres/${tenantId}/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'premium' }),
    })
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to upgrade tenant.')
    }
  }, [])

  const handleBulkInvite = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one centre to send invites.')
      return
    }
    setBulkInvitesBusy(true)
    try {
      const settle = await Promise.allSettled(Array.from(selectedIds).map((id) => sendOwnerInvite(id)))
      const successCount = settle.filter((entry) => entry.status === 'fulfilled').length
      const failureCount = settle.length - successCount
      if (failureCount > 0) {
        toast.warning(`Invites sent to ${successCount} centres (${failureCount} failed).`)
      } else {
        toast.success(`Invites sent to ${successCount} centres.`)
      }
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Bulk invite failed.')
    } finally {
      setBulkInvitesBusy(false)
      setSelectedIds(new Set())
    }
  }, [router, selectedIds, sendOwnerInvite])

  const handleRowInvite = useCallback(
    async (tenantId: string) => {
      setRowInviting((prev) => ({ ...prev, [tenantId]: true }))
      try {
        await sendOwnerInvite(tenantId)
        toast.success('Password / access email sent.')
        router.refresh()
      } catch (error: any) {
        toast.error(error?.message || 'Failed to send password / access email.')
      } finally {
        setRowInviting((prev) => ({ ...prev, [tenantId]: false }))
      }
    },
    [router, sendOwnerInvite]
  )

  const handleBulkUpgrade = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one centre to upgrade.')
      return
    }
    setBulkUpgradeBusy(true)
    try {
      const settle = await Promise.allSettled(Array.from(selectedIds).map((id) => upgradeTenant(id)))
      const successCount = settle.filter((entry) => entry.status === 'fulfilled').length
      const failureCount = settle.length - successCount
      if (failureCount > 0) {
        toast.warning(`Upgraded ${successCount} centres (${failureCount} failed).`)
      } else {
        toast.success(`Upgraded ${successCount} centres to premium.`)
      }
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Bulk upgrade failed.')
    } finally {
      setBulkUpgradeBusy(false)
      setSelectedIds(new Set())
    }
  }, [router, selectedIds, upgradeTenant])

  const handleRowUpgrade = useCallback(
    async (tenantId: string) => {
      setRowUpgrading((prev) => ({ ...prev, [tenantId]: true }))
      try {
        await upgradeTenant(tenantId)
        toast.success('Centre upgraded to premium.')
        router.refresh()
      } catch (error: any) {
        toast.error(error?.message || 'Upgrade failed.')
      } finally {
        setRowUpgrading((prev) => ({ ...prev, [tenantId]: false }))
      }
    },
    [router, upgradeTenant]
  )

  const deleteTenant = useCallback(
    async (tenantId: string) => {
      if (!confirm('Are you sure you want to move this centre to the bin?')) return
      setDeletingIds((prev) => ({ ...prev, [tenantId]: true }))
      try {
        const response = await fetch(`/api/internal/platform-admin/centres/${tenantId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete' }),
        })
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        if (!response.ok) throw new Error(payload.error || 'Failed to delete centre.')
        toast.success('Centre moved to bin.')
        router.refresh()
      } catch (error: any) {
        toast.error(error?.message || 'Delete failed.')
      } finally {
        setDeletingIds((prev) => {
          const next = { ...prev }
          delete next[tenantId]
          return next
        })
      }
    },
    [router]
  )

  const revalidateTenantPages = useCallback(async (tenantId: string) => {
    const response = await fetch('/api/internal/platform-admin/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: [`/admin/tenants/${tenantId}`, '/admin/tenants'] }),
    })
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to refresh tenant pages.')
    }
  }, [])

  const sendWelcomePackRequest = useCallback(async (tenantId: string, ownerEmail: string) => {
    const response = await fetch('/api/ecd/resend-welcome-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ecdId: tenantId, ownerEmail }),
    })
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to send welcome pack.')
    }
  }, [])

  const runWelcomePack = useCallback(
    async (tenantId: string, ownerEmail: string, successMessage = 'Welcome pack sent!') => {
      setWelcomePackBusy(true)
      try {
        await sendWelcomePackRequest(tenantId, ownerEmail)
        toast.success(successMessage)
      } catch (error: any) {
        toast.error(error?.message || 'Failed to send welcome pack.')
      } finally {
        setWelcomePackBusy(false)
      }
    },
    [sendWelcomePackRequest]
  )

  const handleResendWelcomePack = useCallback(async () => {
    if (!editTenantId) return
    const ownerEmail = form?.email?.trim()
    if (!ownerEmail) {
      toast.error('Owner email is required to send the welcome pack.')
      return
    }
    await runWelcomePack(editTenantId, ownerEmail, ' Welcome pack sent successfully!')
  }, [editTenantId, form?.email, runWelcomePack])

  const loadTenantUsers = useCallback(async (tenantId: string) => {
    setUsersLoading(true)
    try {
      const response = await fetch(`/api/internal/platform-admin/centres/${tenantId}/users`)
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        users?: TenantUserRow[]
        pendingInvitations?: TenantPendingInvitation[]
      }
      if (!response.ok) throw new Error(payload.error || 'Failed to load tenant users')

      const users = payload.users ?? []
      const invites = payload.pendingInvitations ?? []
      setTenantUsers(users)
      setPendingInvitations(invites)
      setUserRoleDrafts(
        Object.fromEntries(users.map((user) => [user.userId, user.effectiveRole] as const))
      )
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load tenant users')
      setTenantUsers([])
      setPendingInvitations([])
      setUserRoleDrafts({})
    } finally {
      setUsersLoading(false)
    }
  }, [])

  const openEdit = useCallback((tenant: AdminTenantTableRow) => {
    setEditTenantId(tenant.id)
    setForm({ ...tenant })
    setInitialForm(tenant)
    setTenantUsers([])
    setPendingInvitations([])
    setUserRoleDrafts({})
    setInviteForm({ email: '', fullName: '', role: 'ecd_staff' })
    setEditOpen(true)
    void loadTenantUsers(tenant.id)
  }, [loadTenantUsers])

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setEditOpen(open)
    if (!open) {
      setEditTenantId(null)
      setForm(null)
      setInitialForm(null)
    }
  }, [])

  const columns = useMemo<ColumnDef<AdminTenantTableRow>[]>(
    () => [
      {
        id: 'select',
        header: () => <span className="sr-only">Select</span>,
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => toggleSelection(row.original.id)}
            className="h-4 w-4 rounded border border-slate-700 bg-slate-900 accent-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400"
            aria-label={`Select ${row.original.name}`}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => <span className="font-semibold text-slate-100">{row.original.name}</span>,
      },
      {
        accessorKey: 'ownerEmail',
        header: 'Owner Email',
        cell: ({ row }) => <span className="text-slate-300">{row.original.ownerEmail}</span>,
      },
      {
        accessorKey: 'ownerPhone',
        header: 'Owner Phone',
        cell: ({ row }) => <span className="text-slate-300">{row.original.ownerPhone}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge className={statusBadgeClass(row.original.status)}>{row.original.status}</Badge>,
      },
      {
        id: 'claimedDate',
        accessorFn: (row: any) => row.claimedDate ?? '',
        sortingFn: (a, b) => {
          const left = a.original.claimedDate ? new Date(a.original.claimedDate).getTime() : 0
          const right = b.original.claimedDate ? new Date(b.original.claimedDate).getTime() : 0
          return left - right
        },
        header: 'Claimed Date',
        cell: ({ row }) => <span className="text-slate-300">{formatDate(row.original.claimedDate)}</span>,
      },
      {
        id: 'package',
        accessorFn: (row: any) => `${row.subscriptionTier} ${row.subscriptionStatus}`,
        header: 'Package',
        cell: ({ row }) => (
          <span className="text-slate-300">
            {row.original.subscriptionTier === 'none'
              ? 'NO PLAN'
              : `${row.original.subscriptionTier.toUpperCase()} / ${row.original.subscriptionStatus}`}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Quick Actions',
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800"
              onClick={() => openEdit(row.original)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/30 bg-slate-900 text-emerald-200 hover:bg-slate-800"
              onClick={() => void handleRowUpgrade(row.original.id)}
              disabled={Boolean(rowUpgrading[row.original.id])}
            >
              {rowUpgrading[row.original.id] ? 'Upgrading…' : 'Upgrade'}
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800"
            >
              <Link href={`/admin/tenants/${row.original.id}`}>View</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/30 bg-slate-900 text-amber-200 hover:bg-slate-800"
              onClick={() => void handleRowInvite(row.original.id)}
              disabled={Boolean(rowInviting[row.original.id]) || !row.original.email?.trim()}
            >
              {rowInviting[row.original.id] ? 'Sending…' : 'Password'}
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800"
            >
              <Link href={`/admin/tenants/${row.original.id}#invite`}>Invite</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-rose-500/30 bg-slate-900 text-rose-200 hover:bg-slate-800"
              onClick={() => void deleteTenant(row.original.id)}
              disabled={Boolean(deletingIds[row.original.id])}
            >
              {deletingIds[row.original.id] ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        ),
      },
    ],
    [openEdit, selectedIds, toggleSelection, rowUpgrading, rowInviting, handleRowUpgrade, handleRowInvite, deleteTenant, deletingIds]
  )

  const filteredTenants = useMemo(() => {
    if (locationFilter === 'all') return tenants
    return tenants.filter((tenant) =>
      locationFilter === 'exact' ? tenant.coordinateSource === 'exact' : tenant.coordinateSource !== 'exact'
    )
  }, [locationFilter, tenants])

  const table = useReactTable({
    data: filteredTenants,
    columns,
    state: {
      sorting,
      globalFilter: query,
    },
    onSortingChange: setSorting,
    globalFilterFn: (row, _, value) => {
      const q = String(value ?? '').trim().toLowerCase()
      if (!q) return true
      const searchable = [
        row.original.name,
        row.original.slug,
        row.original.ownerEmail,
        row.original.ownerPhone,
        row.original.city,
        row.original.suburb,
      ]
        .join(' ')
        .toLowerCase()
      return searchable.includes(q)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  async function saveEdit() {
    if (!form || !editTenantId) return
    const primaryContactFirstName = form.primaryContactFirstName.trim()
    const primaryContactSurname = form.primaryContactSurname.trim()
    const primaryContactName = buildContactName(
      primaryContactFirstName,
      primaryContactSurname,
      form.primaryContactName
    )
    if (!form.name.trim() || !form.slug.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error('Name, slug, email and phone are required.')
      return
    }
    if (!primaryContactFirstName) {
      toast.error('Primary contact first name is required.')
      return
    }

    setSaving(true)
    try {
      const hasSubscriptionPlan = form.subscriptionTier !== 'none'
      const payload = {
        action: 'set_profile',
        name: form.name.trim(),
        slug: slugify(form.slug),
        primaryContactName: primaryContactName || null,
        primaryContactFirstName: primaryContactFirstName || null,
        primaryContactSurname: primaryContactSurname || null,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        contactPhone: form.contactPhone.trim() || null,
        contactWhatsapp: form.contactWhatsapp.trim() || null,
        address: form.address.trim() || '',
        suburb: form.suburb.trim() || '',
        city: form.city.trim() || 'Johannesburg',
        province: form.province.trim() || 'Gauteng',
        postalCode: form.postalCode.trim() || null,
        latitude: parseNumberOrNull(form.latitude),
        longitude: parseNumberOrNull(form.longitude),
        logoUrl: form.logoUrl.trim() || null,
        coverImageUrl: form.coverImageUrl.trim() || null,
        feesDisplayMode: form.feesDisplayMode,
        monthlyFeeMin: parseNumberOrNull(form.monthlyFeeMin),
        monthlyFeeMax: parseNumberOrNull(form.monthlyFeeMax),
        registrationFee: parseNumberOrNull(form.registrationFee),
        subsidyAccepted: form.subsidyAccepted,
        ageGroups: buildAgeGroupsFromRange(form.ageRangeStart, form.ageRangeEnd),
        ageGroupPricing: (() => {
          const ageBucketLabels = buildAgeBucketLabels(form.ageRangeStart, form.ageRangeEnd)
          return {
            '0-2': { label: ageBucketLabels['0-2'], monthly_fee_cents: ageFeeToCents(form.age0to2) },
            '2-4': { label: ageBucketLabels['2-4'], monthly_fee_cents: ageFeeToCents(form.age2to4) },
            '4-6': { label: ageBucketLabels['4-6'], monthly_fee_cents: ageFeeToCents(form.age4to6) },
            '6+': { label: ageBucketLabels['6+'], monthly_fee_cents: ageFeeToCents(form.age6plus) },
          }
        })(),
        operatingSchedule: form.operatingSchedule,
        operatingHours: summarizeOperatingSchedule(form.operatingSchedule),
        aftercareAvailable: form.aftercareAvailable,
        aftercareEndTime: form.aftercareAvailable ? form.aftercareEndTime.trim() || null : null,
        classrooms: form.classrooms.filter((room) => room.name.trim()).map((room) => ({
          id: room.id ?? null,
          name: room.name.trim(),
          ageGroup: room.ageGroup.trim(),
          practitionerName: room.practitionerName.trim(),
        })),
        dsdStatus: form.dsdStatus,
        marketplaceUpgrades: form.marketplaceUpgrades
          .split(/[\n,;]+/g)
          .map((item) => item.trim())
          .filter(Boolean),
        isActive: form.isActive,
        isRegistered: form.isRegistered,
        subscriptionTier: hasSubscriptionPlan ? form.subscriptionTier : undefined,
        subscriptionStatus: hasSubscriptionPlan ? form.subscriptionStatus : undefined,
        subscriptionMonthlyPrice: hasSubscriptionPlan ? parseNumberOrNull(form.subscriptionMonthlyPrice) ?? 0 : undefined,
      }

      const response = await fetch(`/api/internal/platform-admin/centres/${editTenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(body.error || 'Failed to update tenant.')

      const packageChanged = hasPackageChanged(initialForm, form)
      try {
        await revalidateTenantPages(editTenantId)
      } catch (error: any) {
        toast.warning(error?.message || 'Tenant pages refreshed separately.')
      }
      if (packageChanged) {
        await runWelcomePack(editTenantId, form.email.trim(), 'Welcome pack requeued with updated package.')
      }

      toast.success('Tenant profile updated.')
      setEditOpen(false)
      setEditTenantId(null)
      setForm(null)
      setInitialForm(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update tenant.')
    } finally {
      setSaving(false)
    }
  }

  function applyUsersPayload(payload: {
    users?: TenantUserRow[]
    pendingInvitations?: TenantPendingInvitation[]
  }) {
    const users = payload.users ?? []
    const pending = payload.pendingInvitations ?? []
    setTenantUsers(users)
    setPendingInvitations(pending)
    setUserRoleDrafts(
      Object.fromEntries(users.map((user) => [user.userId, user.effectiveRole] as const))
    )
  }

  async function createTenantUser() {
    if (!editTenantId) return

    const email = inviteForm.email.trim().toLowerCase()
    if (!email) {
      toast.error('User email is required.')
      return
    }

    setUsersBusy(true)
    try {
      const inviteRole = inviteForm.role === 'owner' ? 'ecd_admin' : inviteForm.role
      const inviteResponse = await fetch('/api/internal/platform-admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ecdId: editTenantId,
          email,
          role: inviteRole,
          fullName: inviteForm.fullName.trim() || undefined,
        }),
      })
      const invitePayload = (await inviteResponse.json().catch(() => ({}))) as {
        error?: string
        userId?: string | null
        invitedEmail?: string
      }
      if (!inviteResponse.ok) throw new Error(invitePayload.error || 'Failed to invite user')

      if (inviteForm.role === 'owner') {
        if (!invitePayload.userId) {
          toast.warning(
            'Invite sent, but ownership could not be assigned yet. Assign owner after the user account is linked.'
          )
        } else {
          const ownerResponse = await fetch(`/api/internal/platform-admin/centres/${editTenantId}/users`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'set_user_privileges',
              userId: invitePayload.userId,
              role: 'owner',
            }),
          })
          const ownerPayload = (await ownerResponse.json().catch(() => ({}))) as {
            error?: string
            users?: TenantUserRow[]
            pendingInvitations?: TenantPendingInvitation[]
          }
          if (!ownerResponse.ok) throw new Error(ownerPayload.error || 'Failed to assign owner privileges')
          applyUsersPayload(ownerPayload)
        }
      }

      setInviteForm({ email: '', fullName: '', role: 'ecd_staff' })
      if (inviteForm.role !== 'owner') {
        await loadTenantUsers(editTenantId)
      }
      router.refresh()
      toast.success(`User invite sent to ${invitePayload.invitedEmail ?? email}`)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create tenant user')
    } finally {
      setUsersBusy(false)
    }
  }

  async function saveUserPrivileges(user: TenantUserRow) {
    if (!editTenantId) return
    const role = userRoleDrafts[user.userId] ?? user.effectiveRole

    setUsersBusy(true)
    try {
      const payloadBody =
        role === 'parent_user'
          ? {
              action: 'downgrade_to_parent',
              userId: user.userId,
              reason: 'Role changed to parent by CentreConnect admin.',
            }
          : {
              action: 'set_user_privileges',
              userId: user.userId,
              role,
            }
      const response = await fetch(`/api/internal/platform-admin/centres/${editTenantId}/users`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBody),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        warning?: string | null
        users?: TenantUserRow[]
        pendingInvitations?: TenantPendingInvitation[]
      }
      if (!response.ok) throw new Error(payload.error || 'Failed to update user privileges')
      applyUsersPayload(payload)
      router.refresh()
      if (role === 'parent_user') {
        toast.success('User downgraded to Parent. Activation email queued.')
      } else {
        toast.success('User privileges updated.')
      }
      if (payload.warning) {
        toast.warning(payload.warning)
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update user privileges')
    } finally {
      setUsersBusy(false)
    }
  }

  async function removeTenantUser(user: TenantUserRow) {
    if (!editTenantId) return
    const userLabel = user.fullName?.trim() || user.email?.trim() || user.userId
    const confirmed = window.confirm(
      `This will permanently delete the CentreConnect account for ${userLabel}, remove all centre access, and cancel any pending staff invites. This action is irreversible. Continue?`
    )
    if (!confirmed) return

    setUsersBusy(true)
    try {
      const response = await fetch(`/api/internal/platform-admin/centres/${editTenantId}/users`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_user',
          userId: user.userId,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        warning?: string | null
        users?: TenantUserRow[]
        pendingInvitations?: TenantPendingInvitation[]
      }
      if (!response.ok) throw new Error(payload.error || 'Failed to remove user')
      applyUsersPayload(payload)
      router.refresh()
      toast.success('Tenant user permanently deleted.')
      if (payload.warning) {
        toast.warning(payload.warning)
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to remove user')
    } finally {
      setUsersBusy(false)
    }
  }

  async function removePendingInvitation(invitationId: string) {
    if (!editTenantId) return

    setUsersBusy(true)
    try {
      const response = await fetch(`/api/internal/platform-admin/centres/${editTenantId}/users`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_invitation',
          invitationId,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        users?: TenantUserRow[]
        pendingInvitations?: TenantPendingInvitation[]
      }
      if (!response.ok) throw new Error(payload.error || 'Failed to remove invitation')
      applyUsersPayload(payload)
      toast.success('Pending invite removed.')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to remove invitation')
    } finally {
      setUsersBusy(false)
    }
  }

  const visibleRowIds = table.getRowModel().rows.map((row: any) => row.original.id)
  const selectedCount = selectedIds.size
  const visibleSelected = visibleRowIds.length > 0 && visibleRowIds.every((id) => selectedIds.has(id))

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Bulk actions</p>
            <p className="text-sm font-semibold text-white">{selectedCount} selected</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              onClick={() => toggleVisibleSelection(visibleRowIds)}
              disabled={visibleRowIds.length === 0}
            >
              {visibleSelected ? 'Deselect visible' : `Select all visible (${visibleRowIds.length})`}
            </Button>
            <Button
              size="sm"
              className="bg-cyan-500 text-black hover:bg-cyan-400"
              onClick={() => void handleBulkInvite()}
              disabled={selectedCount === 0 || bulkInvitesBusy}
            >
              {bulkInvitesBusy ? 'Sending…' : 'Send owner invites'}
            </Button>
            <Button
              size="sm"
              className="bg-emerald-500 text-black hover:bg-emerald-400"
              onClick={() => void handleBulkUpgrade()}
              disabled={selectedCount === 0 || bulkUpgradeBusy}
            >
              {bulkUpgradeBusy ? 'Upgrading…' : 'Upgrade to premium'}
            </Button>
          </div>
        </div>
        <Card className="border-cyan-500/20 bg-slate-950/70">
        <CardHeader className="space-y-3">
          <CardTitle className="text-white">All Tenants</CardTitle>
          <CardDescription className="text-slate-400">
            Full tenant operations table with one-click edit modal.
          </CardDescription>
          <div className="flex max-w-2xl flex-col gap-3 sm:flex-row">
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                table.setPageIndex(0)
              }}
              placeholder="Search centres, owners, suburbs..."
              className={darkInputClass}
            />
            <Select value={locationFilter} onValueChange={(value) => { setLocationFilter(value as 'all' | 'exact' | 'missing'); table.setPageIndex(0) }}>
              <SelectTrigger className={`${darkInputClass} w-full sm:w-[220px] [&_span]:text-slate-100`}><SelectValue /></SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                <SelectItem value="all">All centres</SelectItem>
                <SelectItem value="exact">Exact location set</SelectItem>
                <SelectItem value="missing">Missing exact coordinates</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/30">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-slate-800 hover:bg-transparent">
                    {headerGroup.headers.map((header) => {
                      const sorted = header.column.getIsSorted()
                      const sortIcon = sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : ''
                      return (
                        <TableHead
                          key={header.id}
                          className={`text-xs uppercase tracking-[0.18em] text-slate-500 ${header.column.id === 'actions' ? 'text-right' : ''}`}
                        >
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <button
                              type="button"
                              className={`inline-flex items-center gap-1 ${header.column.id === 'actions' ? 'justify-end' : ''}`}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <span className="text-slate-400">{sortIcon}</span>
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={columns.length} className="py-10 text-center text-sm text-slate-500">
                      No tenants found.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row: any) => (
                    <TableRow key={row.id} className="border-slate-800">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className={cell.column.id === 'actions' ? 'text-right' : ''}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} tenants
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <span className="text-xs text-slate-500">
                Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="relative max-h-[92vh] overflow-y-auto border-cyan-500/30 bg-slate-950 text-slate-100 sm:max-w-5xl [&>button]:hidden">
          <div className="absolute right-4 top-4 z-10">
            <DialogClose asChild>
              <button type="button" aria-label="Close dialog" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100">
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
          <DialogHeader>
            <DialogTitle className="text-cyan-200">Edit Tenant</DialogTitle>
            <DialogDescription className="text-slate-300">
              Update package, branding, pricing, marketplace upgrades, operating profile and compliance details.
            </DialogDescription>
          </DialogHeader>

          {form ? (
            <Tabs defaultValue="general" className="space-y-4">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 border border-cyan-500/20 bg-slate-900/80 p-1 sm:grid-cols-6">
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
                <TabsTrigger value="users" className="text-slate-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-100">
                  Users
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
                    <Label className="text-slate-300">Primary Contact First Name</Label>
                    <Input
                      className={darkInputClass}
                      value={form.primaryContactFirstName}
                      onChange={(event) =>
                        setForm((prev) => (prev ? { ...prev, primaryContactFirstName: event.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Primary Contact Surname</Label>
                    <Input
                      className={darkInputClass}
                      value={form.primaryContactSurname}
                      onChange={(event) =>
                        setForm((prev) => (prev ? { ...prev, primaryContactSurname: event.target.value } : prev))
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
                  <div className="space-y-2">
                    <Label className="text-slate-300">Exact Latitude</Label>
                    <Input
                      className={darkInputClass}
                      value={form.latitude}
                      placeholder="-26.1038"
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, latitude: event.target.value } : prev))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Exact Longitude</Label>
                    <Input
                      className={darkInputClass}
                      value={form.longitude}
                      placeholder="28.0916"
                      onChange={(event) => setForm((prev) => (prev ? { ...prev, longitude: event.target.value } : prev))}
                    />
                  </div>
                  <div className="sm:col-span-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                    <p>Location accuracy: {form.coordinateSource === 'exact' || (form.latitude.trim() && form.longitude.trim()) ? 'Exact pin set' : form.coordinateSource === 'geocoded' ? 'Geocoded from address' : 'Approximate only until you save exact coordinates'}</p>
                    <p className="mt-1 text-[11px] text-cyan-50/80">Leave the pin blank if you only know the street address. CentreConnect will geocode it through Pelias when you save.</p>
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
                        <SelectItem value="none">No Plan</SelectItem>
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
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-sm font-semibold text-white">Public parent summary</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Ages</p>
                      <p className="mt-1 text-sm font-semibold text-white">{formatRangePreview(form.ageRangeStart, form.ageRangeEnd)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Open</p>
                      <p className="mt-1 text-sm font-semibold text-white">{summarizeOperatingSchedule(form.operatingSchedule)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Registration fee</p>
                      <p className="mt-1 text-sm font-semibold text-white">{form.registrationFee.trim() ? `R${form.registrationFee.trim()}` : 'Not listed yet'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Subsidy</p>
                      <p className="mt-1 text-sm font-semibold text-white">{form.subsidyAccepted ? 'Yes' : 'Not listed'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Distance accuracy</p>
                      <p className="mt-1 text-sm font-semibold text-white">{form.coordinateSource === 'exact' || (form.latitude.trim() && form.longitude.trim()) ? 'Exact location set' : form.coordinateSource === 'geocoded' ? 'Geocoded from address' : 'Approximate only'}</p>
                      {form.latitude.trim() && form.longitude.trim() ? (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(form.latitude.trim())}&mlon=${encodeURIComponent(form.longitude.trim())}#map=18/${encodeURIComponent(form.latitude.trim())}/${encodeURIComponent(form.longitude.trim())}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                        >
                          Preview pin on OpenStreetMap
                        </a>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Aftercare</p>
                      <p className="mt-1 text-sm font-semibold text-white">{form.aftercareAvailable ? `Until ${form.aftercareEndTime || '17:30'}` : 'Not offered'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Classes</p>
                      <p className="mt-1 text-sm font-semibold text-white">{form.classrooms.filter((room) => room.name.trim()).length || 0} listed</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="space-y-2 sm:col-span-1">
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
                  <div className="space-y-2">
                    <Label className="text-slate-300">Registration Fee (R)</Label>
                    <Input
                      type="number"
                      min={0}
                      className={darkInputClass}
                      value={form.registrationFee}
                      onChange={(event) =>
                        setForm((prev) => (prev ? { ...prev, registrationFee: event.target.value } : prev))
                      }
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="mb-4 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Starts from</Label>
                      <Input
                        type="number"
                        min={0}
                        className={darkInputClass}
                        value={form.ageRangeStart}
                        onChange={(event) => setForm((prev) => (prev ? { ...prev, ageRangeStart: event.target.value } : prev))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Up to</Label>
                      <Input
                        type="number"
                        min={0}
                        className={darkInputClass}
                        value={form.ageRangeEnd}
                        onChange={(event) => setForm((prev) => (prev ? { ...prev, ageRangeEnd: event.target.value } : prev))}
                      />
                    </div>
                    <div className="sm:col-span-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                      Public preview: {formatRangePreview(form.ageRangeStart, form.ageRangeEnd)}
                    </div>
                    <p className="sm:col-span-2 text-xs text-slate-400">Use whole years only. This drives the public age promise, while the fee buckets below stay separate for pricing.</p>
                  </div>
                  <p className="mb-3 text-sm font-medium text-white">Pricing by age bucket (R/month)</p>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">0-2 years</Label>
                      <Input type="number" min={0} className={darkInputClass} value={form.age0to2} onChange={(event) => setForm((prev) => (prev ? { ...prev, age0to2: event.target.value } : prev))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">2-4 years</Label>
                      <Input type="number" min={0} className={darkInputClass} value={form.age2to4} onChange={(event) => setForm((prev) => (prev ? { ...prev, age2to4: event.target.value } : prev))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">4-6 years</Label>
                      <Input type="number" min={0} className={darkInputClass} value={form.age4to6} onChange={(event) => setForm((prev) => (prev ? { ...prev, age4to6: event.target.value } : prev))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">6+ / Aftercare</Label>
                      <Input type="number" min={0} className={darkInputClass} value={form.age6plus} onChange={(event) => setForm((prev) => (prev ? { ...prev, age6plus: event.target.value } : prev))} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                  <Label className="text-slate-300">DSD Subsidy Accepted</Label>
                  <Switch checked={form.subsidyAccepted} onCheckedChange={(checked) => setForm((prev) => (prev ? { ...prev, subsidyAccepted: checked } : prev))} />
                </div>
              </TabsContent>

              <TabsContent value="operations" className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Open days and times</p>
                      <p className="text-xs text-slate-400">Default is weekdays only. Saturday stays off unless you turn it on.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900"
                      onClick={() => setForm((prev) => (prev ? { ...prev, operatingSchedule: buildDefaultOperatingSchedule(), operatingHoursSummary: summarizeOperatingSchedule(buildDefaultOperatingSchedule()) } : prev))}
                    >
                      Use Mon-Fri only
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {OPERATING_DAYS.map((day) => {
                      const window = form.operatingSchedule[day]
                      const dayLabel = day.charAt(0).toUpperCase() + day.slice(1)
                      return (
                        <div key={day} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 sm:grid-cols-[120px_1fr_1fr_auto] sm:items-center">
                          <Label className="text-slate-200">{dayLabel}</Label>
                          <Input
                            type="time"
                            className={darkInputClass}
                            value={window?.open ?? '07:00'}
                            disabled={!window}
                            onChange={(event) =>
                              setForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      operatingSchedule: updateOperatingDay(prev.operatingSchedule, day, { open: event.target.value }),
                                    }
                                  : prev
                              )
                            }
                          />
                          <Input
                            type="time"
                            className={darkInputClass}
                            value={window?.close ?? '17:30'}
                            disabled={!window}
                            onChange={(event) =>
                              setForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      operatingSchedule: updateOperatingDay(prev.operatingSchedule, day, { close: event.target.value }),
                                    }
                                  : prev
                              )
                            }
                          />
                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <span className="text-xs text-slate-400">{window ? 'Open' : 'Closed'}</span>
                            <Switch
                              checked={Boolean(window)}
                              onCheckedChange={(checked) =>
                                setForm((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        operatingSchedule: checked
                                          ? updateOperatingDay(prev.operatingSchedule, day, { open: '07:00', close: '17:30' })
                                          : updateOperatingDay(prev.operatingSchedule, day, null),
                                      }
                                    : prev
                                )
                              }
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                    Public preview: {summarizeOperatingSchedule(form.operatingSchedule)}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
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

              <TabsContent value="users" className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                  <p className="text-sm font-medium text-white">Create User (Invite)</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Invite employees/admins and assign ownership privileges from this panel.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.1fr_1fr_220px_auto]">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Email</Label>
                      <Input
                        type="email"
                        className={darkInputClass}
                        placeholder="teacher@centre.co.za"
                        value={inviteForm.email}
                        onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Full Name (Optional)</Label>
                      <Input
                        className={darkInputClass}
                        placeholder="Jane Nkosi"
                        value={inviteForm.fullName}
                        onChange={(event) => setInviteForm((prev) => ({ ...prev, fullName: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Privileges</Label>
                      <Select
                        value={inviteForm.role}
                        onValueChange={(value) =>
                          setInviteForm((prev) => ({ ...prev, role: value as TenantUserPrivilege }))
                        }
                      >
                        <SelectTrigger className={`${darkInputClass} [&_span]:text-slate-100`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                          <SelectItem value="ecd_staff">Staff</SelectItem>
                          <SelectItem value="ecd_supervisor">Supervisor</SelectItem>
                          <SelectItem value="ecd_admin">Admin</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      className="bg-cyan-500 text-black hover:bg-cyan-400"
                      onClick={() => void createTenantUser()}
                      disabled={usersBusy || usersLoading}
                    >
                      {usersBusy ? 'Creating...' : 'Create User'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">Tenant Users</p>
                  {usersLoading ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
                      Loading users...
                    </div>
                  ) : tenantUsers.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
                      No users linked to this tenant yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/30">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">User</TableHead>
                            <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Email</TableHead>
                            <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Current</TableHead>
                            <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Set Privileges</TableHead>
                            <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Last Invite</TableHead>
                            <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tenantUsers.map((user) => (
                            <TableRow key={user.userId} className="border-slate-800">
                              <TableCell className="font-medium text-slate-100">
                                {user.fullName || user.userId}
                                {user.isOwner ? (
                                  <span className="ml-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-cyan-200">
                                    Owner
                                  </span>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-slate-300">{user.email ?? '-'}</TableCell>
                              <TableCell className="text-slate-300">{user.effectiveRole}</TableCell>
                              <TableCell>
                                <Select
                                  value={userRoleDrafts[user.userId] ?? user.effectiveRole}
                                  onValueChange={(value) =>
                                    setUserRoleDrafts((prev) => ({
                                      ...prev,
                                      [user.userId]: value as TenantUserDraftPrivilege,
                                    }))
                                  }
                                >
                                  <SelectTrigger className={`${darkInputClass} h-9 [&_span]:text-slate-100`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                                    <SelectItem value="ecd_staff">Staff</SelectItem>
                                    <SelectItem value="ecd_supervisor">Supervisor</SelectItem>
                                    <SelectItem value="ecd_admin">Admin</SelectItem>
                                    <SelectItem value="owner">Owner</SelectItem>
                                    <SelectItem value="parent_user">Parent (requires activation)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-slate-300">{formatDateTime(user.invitedAt)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800"
                                    onClick={() => void saveUserPrivileges(user)}
                                    disabled={usersBusy || usersLoading}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="border-rose-500/30 bg-slate-900 text-rose-200 hover:bg-slate-800"
                                    onClick={() => void removeTenantUser(user)}
                                    disabled={usersBusy || user.isOwner}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">Pending Invitations</p>
                  {pendingInvitations.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
                      No pending invites.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/30">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Email</TableHead>
                            <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Role</TableHead>
                            <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Invited</TableHead>
                            <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500 text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingInvitations.map((invitation) => (
                            <TableRow key={invitation.invitationId} className="border-slate-800">
                              <TableCell className="text-slate-100">{invitation.email}</TableCell>
                              <TableCell className="text-slate-300">{invitation.role}</TableCell>
                              <TableCell className="text-slate-300">{formatDateTime(invitation.invitedAt)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-rose-500/30 bg-slate-900 text-rose-200 hover:bg-slate-800"
                                  onClick={() => void removePendingInvitation(invitation.invitationId)}
                                  disabled={usersBusy}
                                >
                                  Remove
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
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
            <Button
              variant="outline"
              className="border-emerald-500/30 bg-slate-900 text-emerald-200 hover:bg-slate-800"
              onClick={() => void handleResendWelcomePack()}
              loading={welcomePackBusy}
              disabled={welcomePackBusy || !editTenantId || !form?.email?.trim()}
            >
              Resend Welcome Pack
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
