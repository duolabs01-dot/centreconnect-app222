'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitApplicationAction } from '@/lib/actions/admissions/submit-application'
import { CreateChildInput, createChildAction, createChildSchema } from '@/lib/actions/parents/create-child'
import { cn, calculateAge } from '@/lib/utils'

type ParentChild = {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
}

type CentreSummary = {
  id: string
  slug: string
  name: string
  tagline?: string | null
  city?: string | null
  suburb?: string | null
}

type ApplyFlowProps = {
  centre: CentreSummary
  childProfiles: ParentChild[]
}

type ChildFormValues = CreateChildInput

export function ApplyFlow({ centre, childProfiles }: ApplyFlowProps) {
  const [childList, setChildList] = useState(childProfiles)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(childProfiles[0]?.id ?? null)
  const [step, setStep] = useState<'existing' | 'new'>(childProfiles.length > 0 ? 'existing' : 'new')
  const [shareMultiple, setShareMultiple] = useState(true)
  const [parentMessage, setParentMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [isPending, startTransition] = useTransition()
  const [isChildPending, startAddChild] = useTransition()

  useEffect(() => {
    if (!selectedChildId && childList[0]) {
      setSelectedChildId(childList[0].id)
      setStep('existing')
    }
  }, [childList, selectedChildId])

  const selectedChild = useMemo(() => childList.find((child) => child.id === selectedChildId) ?? null, [childList, selectedChildId])

  const childForm = useForm<ChildFormValues>({
    resolver: zodResolver(createChildSchema),
    defaultValues: { first_name: '', last_name: '', date_of_birth: '', gender: undefined },
  })

  async function handleAddChild(data: ChildFormValues) {
    startAddChild(async () => {
      const result = await createChildAction(data)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      if (result.child) {
        setChildList((prev) => [...prev, result.child])
        setSelectedChildId(result.child.id)
        setStep('existing')
        childForm.reset()
        toast.success(`${result.child.first_name} added. Now submit your application.`)
      }
    })
  }

  async function handleSubmit() {
    if (!selectedChildId) {
      toast.error('Select or add a child first.')
      return
    }
    startTransition(async () => {
      setStatus('submitting')
      const result = await submitApplicationAction({
        ecd_id: centre.id,
        child_id: selectedChildId,
        share_multiple_flag: shareMultiple,
        parent_message: parentMessage.trim() || undefined,
      })
      if (result?.error) {
        toast.error(result.error)
        setStatus('idle')
        return
      }
      setStatus('success')
      toast.success('Application submitted. We will update you via email.')
    })
  }

  if (status === 'success') {
    return (
      <Card className="border-cyan-600/40 bg-gradient-to-br from-cyan-700/40 to-slate-900/80">
        <CardContent className="space-y-4 text-center text-white">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">Next step</p>
          <h3 className="text-3xl font-bold">Application sent</h3>
          <p className="text-sm text-cyan-100">We have forwarded your application to {centre.name}. Expect a confirmation email soon.</p>
          <div className="flex flex-col gap-2 md:flex-row md:justify-center">
            <Button asChild>
              <Link href="/parent/applications">Go to Application Journey</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/directory">Browse other centres</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/50">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300">Step 1 • child selection</p>
        <h2 className="text-2xl font-bold text-white">Who is applying?</h2>
        <p className="text-sm text-slate-300">
          We automatically read the children linked to your account. Select who is applying or add a new profile.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={cn(
              'rounded-2xl border px-4 py-2 text-sm font-semibold transition',
              step === 'existing'
                ? 'border-cyan-400 bg-cyan-500/10 text-white'
                : 'border-transparent bg-white/10 text-slate-300 hover:bg-white/20'
            )}
            onClick={() => setStep('existing')}
          >
            Use existing child
          </button>
          <button
            type="button"
            className={cn(
              'rounded-2xl border px-4 py-2 text-sm font-semibold transition',
              step === 'new'
                ? 'border-cyan-400 bg-cyan-500/10 text-white'
                : 'border-transparent bg-white/10 text-slate-300 hover:bg-white/20'
            )}
            onClick={() => setStep('new')}
          >
            Add new child
          </button>
        </div>

        {step === 'existing' ? (
          childList.length === 0 ? (
            <p className="text-sm text-slate-300">No child profiles yet. Create one to continue.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {childList.map((child) => {
                const age = child.date_of_birth ? calculateAge(child.date_of_birth) : null
                const isActive = selectedChildId === child.id
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => {
                      setSelectedChildId(child.id)
                      setStep('existing')
                    }}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-3 text-left transition',
                      isActive
                        ? 'border-cyan-400 bg-cyan-500/10 text-white shadow-inner shadow-cyan-500/20'
                        : 'border-white/10 bg-white/5 text-slate-200 hover:border-cyan-500/40 hover:bg-white/10'
                    )}
                  >
                    <p className="text-lg font-semibold">{child.first_name} {child.last_name}</p>
                    <p className="text-xs text-slate-400">{age ? `${age} years old` : 'Age pending'}</p>
                  </button>
                )
              })}
            </div>
          )
        ) : (
          <form className="space-y-4" onSubmit={childForm.handleSubmit(handleAddChild)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="first_name">First name</Label>
                <Input id="first_name" {...childForm.register('first_name')} />
                {childForm.formState.errors.first_name && (
                  <p className="text-xs text-destructive">{childForm.formState.errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="last_name">Last name</Label>
                <Input id="last_name" {...childForm.register('last_name')} />
                {childForm.formState.errors.last_name && (
                  <p className="text-xs text-destructive">{childForm.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="date_of_birth">Date of birth</Label>
              <Input id="date_of_birth" type="date" {...childForm.register('date_of_birth')} />
              {childForm.formState.errors.date_of_birth && (
                <p className="text-xs text-destructive">{childForm.formState.errors.date_of_birth.message}</p>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
              <p>Add the child and we’ll carry their profile through every application.</p>
              <Button type="submit" disabled={isChildPending} size="sm">
                {isChildPending ? 'Adding…' : 'Add child'}
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-white/5 bg-gradient-to-br from-white/5 to-white/3 p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300">Step 2 • application details</p>
          <h3 className="text-xl font-bold text-white">Submit to {centre.name}</h3>
          <p className="text-sm text-slate-300">We’ll notify {centre.name} and share any updates you need.</p>
        </div>
        <div className="space-y-3">
          <Textarea
            placeholder="Share anything that matters to the centre (special circumstances, siblings, etc.)"
            value={parentMessage}
            rows={4}
            onChange={(event) => setParentMessage(event.target.value)}
            className="bg-slate-900 text-white placeholder:text-slate-500"
          />
          <label className="flex items-center gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={shareMultiple}
              onChange={(event) => setShareMultiple(event.target.checked)}
              className="h-4 w-4 rounded border border-white/40 bg-transparent"
            />
            Share this application across other qualified centres (if you have similar preferences)
          </label>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-400">
            <p className="font-semibold text-white">Selected child</p>
            {selectedChild ? (
              <p className="text-sm text-slate-300">
                {selectedChild.first_name} {selectedChild.last_name}
                {selectedChild.date_of_birth ? ` • ${calculateAge(selectedChild.date_of_birth)} years old` : ''}
              </p>
            ) : (
              <p className="text-sm text-slate-400">Please add a child to proceed.</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Ready?</p>
            <p className="text-sm text-slate-300">One submission per child per centre.</p>
          </div>
          <Button onClick={handleSubmit} disabled={isPending || !selectedChild} size="lg">
            {isPending ? 'Submitting…' : 'Submit Application'}
          </Button>
        </div>
      </div>
    </div>
  )
}
