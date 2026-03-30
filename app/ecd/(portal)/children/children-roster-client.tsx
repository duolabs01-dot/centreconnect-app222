'use client'

import { useDeferredValue, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Mail,
  PencilLine,
  Search,
  UserRoundCheck,
  UserRoundPlus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { sendParentLinkForExistingChildAction } from './new/actions'
import { updateChildBasicsAction } from './actions'

type ChildRosterClass = {
  id: string
  name: string
  ageGroup: string | null
}

type ParentLinkRequest = {
  id: string
  childId: string
  ecdId: string
  parentEmail: string
  parentPhone: string | null
  parentName: string | null
  status: 'pending' | 'opened' | 'accepted' | 'expired' | 'cancelled'
  emailMode: 'link_profile' | 'invite'
  requestedAt: string
  sentAt: string | null
  openedAt: string | null
  acceptedAt: string | null
  linkedUserId: string | null
}

type ChildRosterItem = {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  classId: string | null
  className: string | null
  ageGroup: string | null
  enrollmentStartDate: string | null
  enrollmentStatus: string | null
  parentId: string | null
  parentName: string
  parentPhone: string
  parentEmail: string
  createdAt: string | null
  parentSource: 'synced' | 'snapshot' | 'missing'
  parentLinkRequest: ParentLinkRequest | null
  detailHref: string
}

type ChildrenRosterClientProps = {
  centreName: string
  classes: ChildRosterClass[]
  initialChildren: ChildRosterItem[]
}

type EditFormState = {
  firstName: string
  lastName: string
  dateOfBirth: string
  classId: string
}

type ParentLinkFormState = {
  parentName: string
  parentPhone: string
  parentEmail: string
}

type FilterMode = 'all' | 'needs_parent' | 'linked'

function formatDateLabel(value: string | null) {
  if (!value) return 'Not added yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getRequestTone(request: ParentLinkRequest | null) {
  if (!request) return null
  if (request.status === 'opened') {
    return {
      label: 'Parent opened invite',
      badgeClassName: 'border-cyan-200 bg-cyan-50 text-cyan-800',
      helper: 'The parent opened the invite. If nothing happens next, send a reminder.',
    }
  }
  if (request.status === 'accepted') {
    return {
      label: 'Parent connected',
      badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      helper: 'This parent is now connected to the child profile.',
    }
  }
  if (request.status === 'expired' || request.status === 'cancelled') {
    return {
      label: 'Send again',
      badgeClassName: 'border-amber-200 bg-amber-50 text-amber-800',
      helper: 'An earlier invite is no longer active. Send a fresh one.',
    }
  }
  return {
    label: 'Invite sent',
    badgeClassName: 'border-teal-200 bg-teal-50 text-teal-800',
    helper: 'The invite is out. Once the parent accepts it, this profile will connect.',
  }
}

function getParentStatus(child: ChildRosterItem) {
  if (child.parentId) {
    return {
      key: 'linked' as const,
      label: 'Parent connected',
      badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      helper: child.parentSource === 'synced'
        ? 'This child is linked to a parent who signed up on CentreConnect.'
        : 'This child is linked to a parent account.',
    }
  }

  const requestTone = getRequestTone(child.parentLinkRequest)
  if (requestTone) {
    return {
      key: 'needs_parent' as const,
      ...requestTone,
    }
  }

  if (child.parentEmail || child.parentPhone || child.parentName) {
    return {
      key: 'needs_parent' as const,
      label: 'Ready to invite',
      badgeClassName: 'border-amber-200 bg-amber-50 text-amber-800',
      helper: 'Parent details are saved. Send the invite when you are ready.',
    }
  }

  return {
    key: 'needs_parent' as const,
    label: 'Add parent details',
    badgeClassName: 'border-slate-200 bg-slate-50 text-slate-700',
    helper: 'Add the parent details now or later. The child profile is already saved.',
  }
}

function buildAttendanceHref(child: ChildRosterItem) {
  if (child.classId) return `/ecd/attendance?classId=${encodeURIComponent(child.classId)}`
  return '/ecd/attendance'
}

function sendButtonLabel(child: ChildRosterItem) {
  if (child.parentLinkRequest) return 'Send invite again'
  if (child.parentEmail) return 'Send parent invite'
  return 'Add parent details'
}

function ChildCardItem({
  child,
  onOpenEdit,
  onOpenParentLink,
}: {
  child: ChildRosterItem
  onOpenEdit: (child: ChildRosterItem) => void
  onOpenParentLink: (child: ChildRosterItem) => void
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const parentStatus = getParentStatus(child)

  return (
    <Card className="rounded-[1.8rem] border-slate-200 bg-white shadow-sm">
      <CardContent className="space-y-4 p-5">
        {/* Name + status badge */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-xl font-black tracking-tight text-slate-900">
              {child.firstName} {child.lastName}
            </h2>
            <p className="text-sm font-medium text-slate-500">
              {child.className ?? 'No class yet'}
              {child.enrollmentStartDate ? ` \u00b7 Started ${formatDateLabel(child.enrollmentStartDate)}` : ''}
            </p>
          </div>
          <Badge className={parentStatus.badgeClassName}>{parentStatus.label}</Badge>
        </div>

        {/* Action buttons — always visible, flex-wrap for mobile */}
        <div className="flex flex-wrap gap-2">
          {!child.parentId ? (
            <Button
              type="button"
              className="h-10 rounded-2xl bg-teal-600 text-sm text-white hover:bg-teal-700"
              onClick={() => onOpenParentLink(child)}
            >
              <Mail className="mr-2 h-4 w-4" />
              {sendButtonLabel(child)}
            </Button>
          ) : (
            <Button asChild type="button" className="h-10 rounded-2xl bg-teal-600 text-sm text-white hover:bg-teal-700">
              <Link href={child.detailHref}>
                <UserRoundCheck className="mr-2 h-4 w-4" />
                Open child
              </Link>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            onClick={() => onOpenEdit(child)}
          >
            <PencilLine className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button asChild type="button" variant="outline" size="sm" className="h-10 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
            <Link href={buildAttendanceHref(child)}>
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
              Attendance
            </Link>
          </Button>
        </div>

        {/* Details toggle */}
        <button
          type="button"
          onClick={() => setDetailsOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-600"
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
              detailsOpen && 'rotate-180'
            )}
          />
          {detailsOpen ? 'Hide details' : 'Parent & class details'}
        </button>

        {/* Collapsible detail panels */}
        {detailsOpen && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Child</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  Birthday: {formatDateLabel(child.dateOfBirth)}
                </p>
                <p className="mt-1 text-sm text-slate-500">Added {formatDateLabel(child.createdAt)}</p>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Class</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{child.className ?? 'Add class later'}</p>
                <p className="mt-1 text-sm text-slate-500">{child.ageGroup ?? 'Age group not set yet'}</p>
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-slate-800">
                {child.parentId ? (
                  <UserRoundCheck className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Mail className="h-4 w-4 text-teal-600" />
                )}
                <p className="text-sm font-black">Parent</p>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-700">
                <p>{child.parentName || 'Parent name not added yet'}</p>
                <p>{child.parentEmail || 'Parent email not added yet'}</p>
                <p>{child.parentPhone || 'Phone number optional'}</p>
              </div>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {child.parentSource === 'synced'
                  ? 'Connected to parent account'
                  : child.parentLinkRequest?.status === 'opened'
                    ? `Opened ${formatDateLabel(child.parentLinkRequest.openedAt)}`
                    : child.parentLinkRequest?.status === 'pending'
                      ? `Sent ${formatDateLabel(child.parentLinkRequest.sentAt)}`
                      : child.parentSource === 'snapshot'
                        ? 'Contact details on file'
                        : 'No parent linked yet'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{parentStatus.helper}</p>
            </div>
            <Button asChild type="button" variant="outline" className="h-10 w-full rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              <Link href={child.detailHref}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Full child profile
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ChildrenRosterClient({ centreName, classes, initialChildren }: ChildrenRosterClientProps) {
  const router = useRouter()
  const [children, setChildren] = useState(initialChildren)
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [editingChildId, setEditingChildId] = useState<string | null>(null)
  const [linkingChildId, setLinkingChildId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFormState>({ firstName: '', lastName: '', dateOfBirth: '', classId: 'none' })
  const [parentForm, setParentForm] = useState<ParentLinkFormState>({ parentName: '', parentPhone: '', parentEmail: '' })
  const [isSavingEdit, startEditTransition] = useTransition()
  const [isSendingParentLink, startParentLinkTransition] = useTransition()

  const totalChildren = children.length
  const linkedChildrenCount = children.filter((child) => Boolean(child.parentId)).length
  const needsParentCount = totalChildren - linkedChildrenCount

  const ageGroupCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Baby': 0, 'Toddler': 0, 'Preschool': 0, 'School': 0, 'No DOB': 0 }
    const now = new Date()

    children.forEach(child => {
      if (!child.dateOfBirth) {
        counts['No DOB']++
        return
      }
      const dob = new Date(child.dateOfBirth)
      const ageMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
      
      if (ageMonths < 18) counts['Baby']++
      else if (ageMonths < 36) counts['Toddler']++
      else if (ageMonths < 72) counts['Preschool']++
      else counts['School']++
    })
    
    return Object.entries(counts).filter(([, count]) => count > 0).map(([label, count]) => ({ label, count }))
  }, [children])

  const filteredChildren = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase()

    return children.filter((child) => {
      const status = getParentStatus(child)
      const matchesFilter =
        filterMode === 'all'
          ? true
          : filterMode === 'linked'
            ? status.key === 'linked'
            : status.key !== 'linked'

      if (!matchesFilter) return false
      if (!normalizedQuery) return true

      return [
        child.firstName,
        child.lastName,
        child.className ?? '',
        child.parentName,
        child.parentPhone,
        child.parentEmail,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [children, deferredSearchQuery, filterMode])

  const editingChild = editingChildId ? children.find((child) => child.id === editingChildId) ?? null : null
  const linkingChild = linkingChildId ? children.find((child) => child.id === linkingChildId) ?? null : null

  function openEditDialog(child: ChildRosterItem) {
    setEditingChildId(child.id)
    setEditForm({
      firstName: child.firstName,
      lastName: child.lastName,
      dateOfBirth: child.dateOfBirth ?? '',
      classId: child.classId ?? 'none',
    })
  }

  function openParentDialog(child: ChildRosterItem) {
    setLinkingChildId(child.id)
    setParentForm({
      parentName: child.parentName ?? child.parentLinkRequest?.parentName ?? '',
      parentPhone: child.parentPhone ?? child.parentLinkRequest?.parentPhone ?? '',
      parentEmail: child.parentEmail ?? child.parentLinkRequest?.parentEmail ?? '',
    })
  }

  function updateLocalChild(childId: string, patch: Partial<ChildRosterItem>) {
    setChildren((current) => current.map((child) => (child.id === childId ? { ...child, ...patch } : child)))
  }

  function handleEditSave() {
    if (!editingChild) return

    startEditTransition(async () => {
      const selectedClass = classes.find((row: any) => row.id === (editForm.classId === 'none' ? null : editForm.classId)) ?? null
      const result = await updateChildBasicsAction({
        child_id: editingChild.id,
        first_name: editForm.firstName.trim(),
        last_name: editForm.lastName.trim(),
        date_of_birth: editForm.dateOfBirth.trim() || null,
        class_id: editForm.classId === 'none' ? null : editForm.classId,
      })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      updateLocalChild(editingChild.id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        dateOfBirth: editForm.dateOfBirth.trim() || null,
        classId: editForm.classId === 'none' ? null : editForm.classId,
        className: selectedClass?.name ?? null,
        ageGroup: selectedClass?.ageGroup ?? null,
      })
      toast.success(result.message)
      setEditingChildId(null)
      router.refresh()
    })
  }

  function handleParentLinkSave() {
    if (!linkingChild) return
    if (!parentForm.parentEmail.trim()) {
      toast.error('Add the parent email before sending the family link.')
      return
    }

    startParentLinkTransition(async () => {
      const result = await sendParentLinkForExistingChildAction({
        child_id: linkingChild.id,
        parent_name: parentForm.parentName.trim() || null,
        parent_phone: parentForm.parentPhone.trim() || null,
        parent_email: parentForm.parentEmail.trim(),
      })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      updateLocalChild(linkingChild.id, {
        parentName: parentForm.parentName.trim(),
        parentPhone: parentForm.parentPhone.trim(),
        parentEmail: parentForm.parentEmail.trim(),
        parentLinkRequest: result.request ?? linkingChild.parentLinkRequest,
        enrollmentStatus: 'pending_parent',
      })

      toast.success(result.message, {
        description: result.whatsappHref
          ? 'Email is the official path. A WhatsApp reminder is also ready if you want to nudge the parent.'
          : undefined,
      })
      setLinkingChildId(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <Card className="rounded-[1.8rem] border-slate-200 bg-white shadow-sm">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl font-black tracking-tight text-slate-900">Children</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6 text-slate-600">
              View child profiles, send the family email when needed, and keep parent details tidy from one screen.
            </CardDescription>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{centreName}</p>
          </div>
           <div className="flex flex-col gap-3 sm:w-auto sm:min-w-[230px]">
             <Button asChild className="rounded-2xl bg-teal-600 font-black text-white hover:bg-teal-700">
               <Link href="/ecd/children/new#quick-add">Add Children</Link>
             </Button>
              <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50">
                <Link href="/ecd/children/new#full-child-profile">
                  <span>Detailed form</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50">
                <Link href="/ecd/employment">Employment →</Link>
              </Button>
           </div>
        </CardHeader>
      </Card>

      <Card className="rounded-[1.8rem] border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
              {totalChildren} children
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
              {linkedChildrenCount} linked
            </div>
            <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800">
              {needsParentCount} need parent
            </div>
            {ageGroupCounts.map(({ label, count }) => (
              <div key={label} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-800">
                {count} {label}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search child, class, or parent email"
                className="h-11 rounded-2xl border-slate-200 pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all' as const, label: 'All' },
                { key: 'needs_parent' as const, label: 'Needs parent' },
                { key: 'linked' as const, label: 'Linked' },
              ].map((option) => (
                <Button
                  key={option.key}
                  type="button"
                  variant={filterMode === option.key ? 'default' : 'outline'}
                  className={filterMode === option.key ? 'rounded-full bg-teal-600 text-white hover:bg-teal-700' : 'rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}
                  onClick={() => setFilterMode(option.key)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">
            {filteredChildren.length === totalChildren
              ? 'Showing all child profiles.'
              : `Showing ${filteredChildren.length} matching children.`}
          </p>
        </CardContent>
      </Card>

      {totalChildren === 0 ? (
        <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-4 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700">
              <UserRoundPlus className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">No children yet.</h2>
              <p className="mx-auto max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                Start with a few children first. You can add the rest later.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="rounded-2xl bg-teal-600 font-black text-white hover:bg-teal-700">
                <Link href="/ecd/children/new#quick-add">Add First 5 Children</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-2xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50">
                <Link href="/ecd/welcome?onboarding=1">Open Welcome Guide</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {filteredChildren.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredChildren.map((child) => (
            <ChildCardItem
              key={child.id}
              child={child}
              onOpenEdit={openEditDialog}
              onOpenParentLink={openParentDialog}
            />
          ))}
        </div>
      ) : totalChildren > 0 ? (
        <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-3 p-8 text-center">
            <h2 className="text-xl font-black tracking-tight text-slate-900">Nothing matched that search.</h2>
            <p className="text-sm leading-7 text-slate-600">
              Try another child name, parent email, or switch the filter back to all children.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={Boolean(editingChild)} onOpenChange={(open) => !open && setEditingChildId(null)}>
        <DialogContent className="rounded-[1.8rem] border-slate-200 bg-white p-0 sm:max-w-xl">
          <DialogClose className="absolute right-4 top-4 rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Close child dialog">
            <X className="h-4 w-4" />
          </DialogClose>
          <div className="p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Edit child details</DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-slate-600">
                Keep this simple: update the child basics now. You can always come back for more detail later.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="child-first-name">First name</Label>
                  <Input
                    id="child-first-name"
                    value={editForm.firstName}
                    onChange={(event) => setEditForm((current) => ({ ...current, firstName: event.target.value }))}
                    className="h-11 rounded-2xl border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="child-last-name">Surname</Label>
                  <Input
                    id="child-last-name"
                    value={editForm.lastName}
                    onChange={(event) => setEditForm((current) => ({ ...current, lastName: event.target.value }))}
                    className="h-11 rounded-2xl border-slate-200"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="child-date-of-birth">Birthday</Label>
                  <Input
                    id="child-date-of-birth"
                    type="date"
                    value={editForm.dateOfBirth}
                    onChange={(event) => setEditForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
                    className="h-11 rounded-2xl border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={editForm.classId} onValueChange={(value) => setEditForm((current) => ({ ...current, classId: value }))}>
                    <SelectTrigger className="h-11 rounded-2xl border-slate-200">
                      <SelectValue placeholder="Choose a class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Add class later</SelectItem>
                      {classes.map((classItem) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.name}{classItem.ageGroup ? ` (${classItem.ageGroup})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 gap-3 sm:gap-2">
              <Button type="button" variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => setEditingChildId(null)}>
                Cancel
              </Button>
              <Button type="button" className="rounded-2xl bg-teal-600 text-white hover:bg-teal-700" disabled={isSavingEdit} onClick={handleEditSave}>
                {isSavingEdit ? 'Saving...' : 'Save child details'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(linkingChild)} onOpenChange={(open) => !open && setLinkingChildId(null)}>
        <DialogContent className="rounded-[1.8rem] border-slate-200 bg-white p-0 sm:max-w-xl">
          <DialogClose className="absolute right-4 top-4 rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Close family email dialog">
            <X className="h-4 w-4" />
          </DialogClose>
          <div className="p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Send parent invite</DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-slate-600">
                Add the parent email below. CentreConnect will send the invite so the parent can connect the child profile, and you can still follow up on WhatsApp if needed.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="parent-name">Parent name</Label>
                <Input
                  id="parent-name"
                  value={parentForm.parentName}
                  onChange={(event) => setParentForm((current) => ({ ...current, parentName: event.target.value }))}
                  placeholder="Optional, but helpful"
                  className="h-11 rounded-2xl border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent-email">Parent email</Label>
                <Input
                  id="parent-email"
                  type="email"
                  value={parentForm.parentEmail}
                  onChange={(event) => setParentForm((current) => ({ ...current, parentEmail: event.target.value }))}
                  placeholder="name@example.com"
                  className="h-11 rounded-2xl border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent-phone">Parent phone (optional)</Label>
                <Input
                  id="parent-phone"
                  value={parentForm.parentPhone}
                  onChange={(event) => setParentForm((current) => ({ ...current, parentPhone: event.target.value }))}
                  placeholder="071 234 5678"
                  className="h-11 rounded-2xl border-slate-200"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 gap-3 sm:gap-2">
              <Button type="button" variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => setLinkingChildId(null)}>
                Cancel
              </Button>
              <Button type="button" className="rounded-2xl bg-teal-600 text-white hover:bg-teal-700" disabled={isSendingParentLink} onClick={handleParentLinkSave}>
                {isSendingParentLink ? 'Sending...' : 'Send parent invite'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
