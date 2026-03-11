'use client'

import { useDeferredValue, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  Mail,
  PencilLine,
  Search,
  UserRoundCheck,
  UserRoundPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
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
      label: 'Email opened',
      badgeClassName: 'border-cyan-200 bg-cyan-50 text-cyan-800',
      helper: 'The parent opened the family email. If the profile is still not linked, you can resend or follow up kindly.',
    }
  }
  if (request.status === 'accepted') {
    return {
      label: 'Accepted',
      badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      helper: 'The family email was accepted. The live parent profile should now appear on the family record.',
    }
  }
  if (request.status === 'expired' || request.status === 'cancelled') {
    return {
      label: 'Needs resend',
      badgeClassName: 'border-amber-200 bg-amber-50 text-amber-800',
      helper: 'A family email was sent before, but it needs a fresh send now.',
    }
  }
  return {
    label: 'Email sent',
    badgeClassName: 'border-teal-200 bg-teal-50 text-teal-800',
    helper: 'The official family email is out. Once the parent accepts it, this child will link to the live parent profile.',
  }
}

function getParentStatus(child: ChildRosterItem) {
  if (child.parentId) {
    return {
      key: 'linked' as const,
      label: 'Parent linked',
      badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      helper: child.parentSource === 'synced'
        ? 'This child is already connected to a live parent profile.'
        : 'This child is already connected to a parent account.',
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
      label: 'Ready to send',
      badgeClassName: 'border-amber-200 bg-amber-50 text-amber-800',
      helper: 'Parent details are saved. Send the family email when you are ready.',
    }
  }

  return {
    key: 'needs_parent' as const,
    label: 'Add parent details',
    badgeClassName: 'border-slate-200 bg-slate-50 text-slate-700',
    helper: 'Add the parent email now or later. The child profile is already safe in CentreConnect.',
  }
}

function buildAttendanceHref(child: ChildRosterItem) {
  if (child.classId) return `/ecd/attendance?classId=${encodeURIComponent(child.classId)}`
  return '/ecd/attendance'
}

function sendButtonLabel(child: ChildRosterItem) {
  if (child.parentLinkRequest) return 'Resend family email'
  if (child.parentEmail) return 'Send family email'
  return 'Add parent details'
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
      const selectedClass = classes.find((row) => row.id === (editForm.classId === 'none' ? null : editForm.classId)) ?? null
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
      <Card className="rounded-[2rem] border-slate-200 bg-[linear-gradient(135deg,rgba(240,253,250,1)_0%,rgba(255,255,255,1)_62%,rgba(248,250,252,1)_100%)] shadow-[0_18px_50px_rgba(13,148,136,0.08)]">
        <CardHeader className="space-y-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">
            <Users className="h-3.5 w-3.5" />
            {centreName} child records
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Keep every child profile in one simple place.
            </CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Add children fast, send the family email when you are ready, and keep the live parent record in sync instead of chasing details across paper and WhatsApp.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-2xl bg-teal-600 font-black text-white hover:bg-teal-700">
              <Link href="/ecd/children/new#quick-add">Add First 5 Children</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-2xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50">
              <Link href="/ecd/children/new#full-child-profile">
                <span>Open Detailed Child Form</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-[1.6rem] border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Total children</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{totalChildren}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[1.6rem] border-emerald-200 bg-emerald-50/70 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Parent linked</p>
            <p className="mt-2 text-3xl font-black text-emerald-900">{linkedChildrenCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[1.6rem] border-amber-200 bg-amber-50/70 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Needs family email</p>
            <p className="mt-2 text-3xl font-black text-amber-900">{needsParentCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[1.8rem] border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
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
                { key: 'all' as const, label: 'All children' },
                { key: 'needs_parent' as const, label: 'Needs parent' },
                { key: 'linked' as const, label: 'Parent linked' },
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
              ? 'All child profiles are shown below.'
              : `${filteredChildren.length} children match your current search or filter.`}
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
                Start with the first 5 children from your paper register. You can capture the rest later, once the team feels the flow.
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
          {filteredChildren.map((child) => {
            const parentStatus = getParentStatus(child)

            return (
              <Card key={child.id} className="rounded-[1.8rem] border-slate-200 bg-white shadow-sm">
                <CardContent className="space-y-5 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="text-xl font-black tracking-tight text-slate-900">
                        {child.firstName} {child.lastName}
                      </h2>
                      <p className="text-sm font-medium text-slate-500">
                        Added {formatDateLabel(child.createdAt)}
                      </p>
                    </div>
                    <Badge className={parentStatus.badgeClassName}>{parentStatus.label}</Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Class</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {child.className ?? 'Add class later'}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{child.ageGroup ?? 'Age group not set yet'}</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Start date</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{formatDateLabel(child.enrollmentStartDate)}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Birthday: {formatDateLabel(child.dateOfBirth)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-slate-800">
                      {child.parentId ? <UserRoundCheck className="h-4 w-4 text-emerald-600" /> : <Mail className="h-4 w-4 text-teal-600" />}
                      <p className="text-sm font-black">Family link</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{parentStatus.helper}</p>
                    <div className="mt-3 space-y-1 text-sm text-slate-700">
                      <p>{child.parentName || 'Parent name not added yet'}</p>
                      <p>{child.parentEmail || 'Parent email not added yet'}</p>
                      <p>{child.parentPhone || 'Phone number optional'}</p>
                    </div>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      {child.parentSource === 'synced'
                        ? 'Live parent profile'
                        : child.parentLinkRequest?.status === 'opened'
                          ? `Opened ${formatDateLabel(child.parentLinkRequest.openedAt)}`
                          : child.parentLinkRequest?.status === 'pending'
                            ? `Sent ${formatDateLabel(child.parentLinkRequest.sentAt)}`
                            : child.parentSource === 'snapshot'
                              ? 'Saved from child record'
                              : 'No parent shared yet'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    {!child.parentId ? (
                      <Button
                        type="button"
                        className="rounded-2xl bg-teal-600 text-white hover:bg-teal-700"
                        onClick={() => openParentDialog(child)}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        {sendButtonLabel(child)}
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" className="rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" disabled>
                        <UserRoundCheck className="mr-2 h-4 w-4" />
                        Parent linked
                      </Button>
                    )}

                    <Button asChild type="button" variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                      <Link href={child.detailHref}>
                        <UserRoundCheck className="mr-2 h-4 w-4" />
                        Open family record
                      </Link>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      onClick={() => openEditDialog(child)}
                    >
                      <PencilLine className="mr-2 h-4 w-4" />
                      Edit child
                    </Button>

                    <Button asChild type="button" variant="outline" className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                      <Link href={buildAttendanceHref(child)}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Mark attendance
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
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
          <div className="p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Send the family email</DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-slate-600">
                Add the parent email below. CentreConnect will send the official link so the parent can connect the child profile, and you can still follow up on WhatsApp if you need to nudge them.
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
                {isSendingParentLink ? 'Sending...' : 'Send family email'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
