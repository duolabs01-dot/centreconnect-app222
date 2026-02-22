'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, calculateAge, formatDate } from '@/lib/utils'
import { ApplyForm } from './apply-form'
import { createChildAction, createChildSchema, CreateChildInput } from '@/lib/actions/parents/create-child'

type ChildProfile = {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender?: string | null
}

type ApplyFlowProps = {
  centreId: string
  centreSlug: string
  centreName: string
  childProfiles: ChildProfile[]
}

export function ApplyFlow({ centreId, centreSlug, centreName, childProfiles }: ApplyFlowProps) {
  const [childList, setChildList] = useState<ChildProfile[]>(childProfiles)
  const [mode, setMode] = useState<'existing' | 'new'>(childProfiles.length > 0 ? 'existing' : 'new')
  const [selectedChildId, setSelectedChildId] = useState<string>(childProfiles[0]?.id ?? '')
  const [autoSelectChildId, setAutoSelectChildId] = useState<string | undefined>(childProfiles[0]?.id)

  useEffect(() => {
    if (!selectedChildId && childList.length > 0) {
      setSelectedChildId(childList[0].id)
    }
  }, [childList, selectedChildId])

  const selectedChild = useMemo(
    () => childList.find((child) => child.id === selectedChildId),
    [childList, selectedChildId]
  )

  const childCount = childList.length

  const handleChildAdded = (child: ChildProfile) => {
    setChildList((prev) => [child, ...prev.filter((item) => item.id !== child.id)])
    setSelectedChildId(child.id)
    setAutoSelectChildId(child.id)
    setMode('existing')
    toast.success(`${child.first_name} has been saved. Now finish your application.`)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">Do you already have a child profile?</p>
        <p className="mt-1 text-xs text-slate-500">
          We can re-use their information to make applying to {centreName} faster and more accurate.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className={cn(
              'px-4 py-2 rounded-full text-sm font-semibold transition',
              mode === 'existing'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : 'border border-border text-slate-600 hover:border-slate-400'
            )}
            onClick={() => setMode('existing')}
            disabled={!childCount}
          >
            Use existing child
          </button>
          <button
            type="button"
            className={cn(
              'px-4 py-2 rounded-full text-sm font-semibold transition',
              mode === 'new'
                ? 'bg-cyan-50 text-cyan-700 border border-cyan-300 shadow-inner'
                : 'border border-border text-slate-600 hover:border-slate-400'
            )}
            onClick={() => setMode('new')}
          >
            Add new child
          </button>
        </div>
      </div>

      {mode === 'existing' && childCount > 0 ? (
        <>
          <ChildSummary child={selectedChild} />
          <ApplyForm
            centreId={centreId}
            centreSlug={centreSlug}
            childProfiles={childList}
            selectedChildId={selectedChildId}
            onChildSelect={setSelectedChildId}
            autoSelectChildId={autoSelectChildId}
          />
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Add the child you are applying for. We will save their profile for future applications and auto-populate this page.
          </p>
          <InlineChildForm onSuccess={handleChildAdded} />
          <p className="text-xs text-muted-foreground">
            Already have a child profile? Switch to the <span className="font-semibold text-slate-900">Use existing child</span> option above to auto-populate the application form.
          </p>
        </div>
      )}
    </div>
  )
}

function ChildSummary({ child }: { child?: ChildProfile }) {
  if (!child) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
        Select a child from the dropdown below to continue.
      </div>
    )
  }

  const age = calculateAge(child.date_of_birth)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Auto-picked child</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <h3 className="text-lg font-semibold text-slate-900">
          {child.first_name} {child.last_name}
        </h3>
        <span className="text-sm text-slate-500">Age {age}</span>
      </div>
      <p className="text-sm text-slate-500">
        DOB {formatDate(child.date_of_birth)} • {child.gender ? child.gender : 'Gender not set'}
      </p>
    </div>
  )
}

function InlineChildForm({ onSuccess }: { onSuccess: (child: ChildProfile) => void }) {
  const form = useForm<CreateChildInput>({
    resolver: zodResolver(createChildSchema),
    mode: 'onTouched',
  })

  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true)
    try {
      const result = await createChildAction(values)
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      if (result.child) {
        form.reset()
        onSuccess(result.child)
      }
    } catch (error) {
      toast.error('Could not save child. Please try again.')
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="first_name">First name</Label>
          <Input id="first_name" {...form.register('first_name')} />
          {form.formState.errors.first_name && (
            <p className="text-xs text-destructive">{form.formState.errors.first_name.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="last_name">Last name</Label>
          <Input id="last_name" {...form.register('last_name')} />
          {form.formState.errors.last_name && (
            <p className="text-xs text-destructive">{form.formState.errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="date_of_birth">Date of birth</Label>
          <Input id="date_of_birth" type="date" {...form.register('date_of_birth')} />
          {form.formState.errors.date_of_birth && (
            <p className="text-xs text-destructive">{form.formState.errors.date_of_birth.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            {...form.register('gender')}
            className="cc-native-field w-full"
          >
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {form.formState.errors.gender && (
            <p className="text-xs text-destructive">{form.formState.errors.gender.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Creating profile…' : 'Save child and continue'}
      </Button>
    </form>
  )
}
