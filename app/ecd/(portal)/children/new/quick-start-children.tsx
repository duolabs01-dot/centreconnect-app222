'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Clock3, MessageCircle, Sparkles, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  quickCreateChildrenAction,
  sendParentLinkForExistingChildAction,
  type QuickAddChildResult,
} from './actions'

type QuickStartChildrenProps = {
  centreName: string
  classes: Array<{ id: string; name: string; age_group: string | null }>
  pendingParentChildren: Array<{
    id: string
    first_name: string
    last_name: string
    enrollment_start_date: string
    parent_name: string
    parent_phone: string
    parent_email: string
  }>
}

type QuickAddRow = {
  id: string
  first_name: string
  last_name: string
  class_id: string
  parent_phone: string
}

type ParentLinkFormState = {
  parent_name: string
  parent_phone: string
  parent_email: string
}

function createQuickAddRows() {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `row-${index + 1}`,
    first_name: '',
    last_name: '',
    class_id: '',
    parent_phone: '',
  }))
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function buildPendingFormMap(
  rows: Array<{
    id: string
    parent_name: string
    parent_phone: string
    parent_email: string
  }>
) {
  return rows.reduce<Record<string, ParentLinkFormState>>((acc, row) => {
    acc[row.id] = {
      parent_name: row.parent_name || '',
      parent_phone: row.parent_phone || '',
      parent_email: row.parent_email || '',
    }
    return acc
  }, {})
}

export function QuickStartChildren({ centreName, classes, pendingParentChildren }: QuickStartChildrenProps) {
  const [quickStartDate, setQuickStartDate] = useState(todayDate())
  const [quickRows, setQuickRows] = useState<QuickAddRow[]>(() => createQuickAddRows())
  const [createdRows, setCreatedRows] = useState<QuickAddChildResult[]>([])
  const [pendingRows, setPendingRows] = useState(pendingParentChildren)
  const [pendingForms, setPendingForms] = useState<Record<string, ParentLinkFormState>>(() =>
    buildPendingFormMap(pendingParentChildren)
  )
  const [sendingChildId, setSendingChildId] = useState<string | null>(null)
  const [isCreating, startCreateTransition] = useTransition()

  function updateQuickRow(id: string, patch: Partial<QuickAddRow>) {
    setQuickRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function updatePendingForm(childId: string, patch: Partial<ParentLinkFormState>) {
    setPendingForms((current) => ({
      ...current,
      [childId]: {
        parent_name: current[childId]?.parent_name || '',
        parent_phone: current[childId]?.parent_phone || '',
        parent_email: current[childId]?.parent_email || '',
        ...patch,
      },
    }))
  }

  function openWhatsappLink(whatsappHref: string) {
    const popup = window.open(whatsappHref, '_blank', 'noopener,noreferrer')
    if (!popup) {
      void navigator.clipboard.writeText(whatsappHref)
      toast.info('WhatsApp link copied. Paste it into WhatsApp to continue.')
    }
  }

  function handleQuickCreate() {
    const startedRows = quickRows.filter((row) =>
      Boolean(row.first_name.trim() || row.last_name.trim() || row.parent_phone.trim() || row.class_id)
    )

    if (startedRows.length === 0) {
      toast.error('Add at least one child before saving.')
      return
    }

    const hasInvalidRow = startedRows.some((row) => !row.first_name.trim() || !row.last_name.trim())
    if (hasInvalidRow) {
      toast.error('Each child needs a first name and surname.')
      return
    }

    startCreateTransition(async () => {
      const result = await quickCreateChildrenAction({
        children: startedRows.map((row) => ({
          first_name: row.first_name.trim(),
          last_name: row.last_name.trim(),
          enrollment_start_date: quickStartDate,
          class_id: row.class_id || null,
          parent_phone: row.parent_phone.trim() || null,
        })),
      })

      if (!result.success || !result.created) {
        toast.error(result.message)
        return
      }

      const created = result.created
      setCreatedRows(created)
      setQuickRows(createQuickAddRows())
      setPendingRows((current) => [
        ...created.map((row) => ({
          id: row.id,
          first_name: row.firstName,
          last_name: row.lastName,
          enrollment_start_date: row.enrollmentStartDate,
          parent_name: row.parentName || '',
          parent_phone: row.parentPhone || '',
          parent_email: row.parentEmail || '',
        })),
        ...current,
      ].slice(0, 12))
      setPendingForms((current) => ({
        ...current,
        ...created.reduce<Record<string, ParentLinkFormState>>((acc, row) => {
          acc[row.id] = {
            parent_name: row.parentName || '',
            parent_phone: row.parentPhone || '',
            parent_email: row.parentEmail || '',
          }
          return acc
        }, {}),
      }))
      toast.success(result.message)
    })
  }

  async function handleSendParentLink(childId: string) {
    const form = pendingForms[childId]
    if (!form?.parent_phone?.trim()) {
      toast.error('Add a parent WhatsApp number first.')
      return
    }

    setSendingChildId(childId)
    try {
      const result = await sendParentLinkForExistingChildAction({
        child_id: childId,
        parent_name: form.parent_name.trim() || null,
        parent_phone: form.parent_phone.trim(),
        parent_email: form.parent_email.trim() || null,
      })

      if (!result.success || !result.whatsappHref) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      openWhatsappLink(result.whatsappHref)
    } finally {
      setSendingChildId(null)
    }
  }

  return (
    <div className="space-y-6" id="quick-add">
      <Card className="rounded-[2rem] border-teal-100 bg-[linear-gradient(135deg,rgba(236,253,245,1)_0%,rgba(255,255,255,1)_62%,rgba(240,249,255,0.92)_100%)] shadow-[0_18px_50px_rgba(13,148,136,0.08)]">
        <CardHeader className="space-y-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-teal-700">
            <Sparkles className="h-3.5 w-3.5" />
            Fastest setup for {centreName}
          </div>
          <div>
            <CardTitle className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Add your first 5 children in one sitting.
            </CardTitle>
            <CardDescription className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Start with the child names first. Add the parent WhatsApp number now if you have it. If not, save the child now and send the parent link later.
            </CardDescription>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              '1. Add names from your paper register.',
              '2. Add a parent WhatsApp number now, or skip it.',
              '3. Send the parent link when you are ready.',
            ].map((item, index) => (
              <div key={item} className="rounded-[1.5rem] border border-white bg-white/90 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-black text-teal-700">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold leading-6 text-slate-700">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </CardHeader>
      </Card>

      <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-black text-slate-900 sm:text-2xl">Quick add first 5 children</CardTitle>
              <CardDescription className="mt-1 text-sm leading-6 text-slate-600">
                Keep it simple: child name, optional class, optional parent WhatsApp. Leave a row empty if you do not need all five.
              </CardDescription>
            </div>
            <div className="w-full sm:w-[220px]">
              <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Start date for this batch</label>
              <Input
                type="date"
                className="h-11 rounded-2xl"
                value={quickStartDate}
                onChange={(event) => setQuickStartDate(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {quickRows.map((row, index) => (
            <div key={row.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-black text-teal-700 shadow-sm">
                  {index + 1}
                </span>
                <p className="text-sm font-black text-slate-700">Child {index + 1}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Input
                  className="h-11 rounded-2xl bg-white"
                  placeholder="First name"
                  value={row.first_name}
                  onChange={(event) => updateQuickRow(row.id, { first_name: event.target.value })}
                />
                <Input
                  className="h-11 rounded-2xl bg-white"
                  placeholder="Surname"
                  value={row.last_name}
                  onChange={(event) => updateQuickRow(row.id, { last_name: event.target.value })}
                />
                <select
                  className="cc-native-field h-11 rounded-2xl bg-white"
                  value={row.class_id}
                  onChange={(event) => updateQuickRow(row.id, { class_id: event.target.value })}
                >
                  <option value="">Class later</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.age_group ? `(${cls.age_group})` : ''}
                    </option>
                  ))}
                </select>
                <Input
                  className="h-11 rounded-2xl bg-white"
                  placeholder="Parent WhatsApp (optional)"
                  value={row.parent_phone}
                  onChange={(event) => updateQuickRow(row.id, { parent_phone: event.target.value })}
                />
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              type="button"
              size="lg"
              className="rounded-2xl bg-teal-600 font-black text-white hover:bg-teal-700"
              onClick={handleQuickCreate}
              disabled={isCreating}
            >
              {isCreating ? 'Saving children...' : 'Save first 5 children'}
            </Button>
            <Button type="button" size="lg" variant="outline" asChild className="rounded-2xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50">
              <Link href="#full-child-profile">Need the full child profile?</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {createdRows.length > 0 ? (
        <Card className="rounded-[2rem] border-emerald-200 bg-emerald-50/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black text-emerald-900">These children are now on CentreConnect.</CardTitle>
            <CardDescription className="text-sm leading-6 text-emerald-800">
              Send the parent link now where a WhatsApp number is ready. The others can be linked later below.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {createdRows.map((child) => (
              <div key={child.id} className="rounded-[1.4rem] border border-emerald-200 bg-white p-4 shadow-sm">
                <div className="space-y-1">
                  <p className="text-base font-black text-slate-900">{child.firstName} {child.lastName}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Start date {child.enrollmentStartDate}</p>
                </div>
                <div className="mt-4">
                  {child.whatsappHref ? (
                    <Button type="button" className="w-full rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => openWhatsappLink(child.whatsappHref!)}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Open parent WhatsApp link
                    </Button>
                  ) : (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-medium leading-6 text-amber-900">
                      No parent number yet. Use the section below when you are ready.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {pendingRows.length > 0 ? (
        <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-teal-700">
              <Users className="h-5 w-5" />
              <CardTitle className="text-xl font-black text-slate-900">Link a parent later</CardTitle>
            </div>
            <CardDescription className="text-sm leading-6 text-slate-600">
              These children are already saved. Add the parent details when you have them, then open WhatsApp from here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRows.map((child) => {
              const form = pendingForms[child.id] || { parent_name: '', parent_phone: '', parent_email: '' }
              return (
                <div key={child.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-black text-slate-900">{child.first_name} {child.last_name}</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Added on {child.enrollment_start_date}</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                      <Clock3 className="h-3.5 w-3.5" />
                      Waiting for parent link
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input
                      className="h-11 rounded-2xl bg-white"
                      placeholder="Parent name (optional)"
                      value={form.parent_name}
                      onChange={(event) => updatePendingForm(child.id, { parent_name: event.target.value })}
                    />
                    <Input
                      className="h-11 rounded-2xl bg-white"
                      placeholder="Parent WhatsApp"
                      value={form.parent_phone}
                      onChange={(event) => updatePendingForm(child.id, { parent_phone: event.target.value })}
                    />
                    <Input
                      className="h-11 rounded-2xl bg-white"
                      placeholder="Parent email (optional)"
                      value={form.parent_email}
                      onChange={(event) => updatePendingForm(child.id, { parent_email: event.target.value })}
                    />
                  </div>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      className="rounded-2xl bg-teal-600 text-white hover:bg-teal-700"
                      disabled={sendingChildId === child.id}
                      onClick={() => void handleSendParentLink(child.id)}
                    >
                      {sendingChildId === child.id ? 'Preparing link...' : 'Open WhatsApp link'}
                    </Button>
                    <p className="text-sm font-medium leading-6 text-slate-500">
                      You can do this now, later today, or when the parent is standing in front of you.
                    </p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

