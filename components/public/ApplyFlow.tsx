'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitApplicationAction } from '@/lib/actions/admissions/submit-application'
import { CreateChildInput, createChildAction, createChildSchema } from '@/lib/actions/parents/create-child'
import { evaluateApplicationDocumentChecklist } from '@/lib/admissions/application-documents'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { calculateAge, cn } from '@/lib/utils'

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
  initialDocumentTypes: string[]
}

type ChildFormValues = CreateChildInput

export function ApplyFlow({ centre, childProfiles, initialDocumentTypes }: ApplyFlowProps) {
  const [childList, setChildList] = useState(childProfiles)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(childProfiles[0]?.id ?? null)
  const [step, setStep] = useState<'existing' | 'new'>(childProfiles.length > 0 ? 'existing' : 'new')
  const [shareMultiple, setShareMultiple] = useState(true)
  const [parentMessage, setParentMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [submissionState, setSubmissionState] = useState<'submitted' | 'partial'>('submitted')
  const [submittedMissingDocuments, setSubmittedMissingDocuments] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [isChildPending, startAddChild] = useTransition()

  useEffect(() => {
    if (!selectedChildId && childList[0]) {
      setSelectedChildId(childList[0].id)
      setStep('existing')
    }
  }, [childList, selectedChildId])

  const selectedChild = useMemo(
    () => childList.find((child) => child.id === selectedChildId) ?? null,
    [childList, selectedChildId]
  )
  const centreLocation = useMemo(
    () => [centre.suburb, centre.city].filter(Boolean).join(', ') || 'Location pending',
    [centre.city, centre.suburb]
  )
  const documentChecklist = useMemo(
    () => evaluateApplicationDocumentChecklist(initialDocumentTypes),
    [initialDocumentTypes]
  )

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

      const browserSupabase = createBrowserClient()
      const {
        data: { session },
      } = await browserSupabase.auth.getSession()

      const result = await submitApplicationAction({
        ecd_id: centre.id,
        child_id: selectedChildId,
        share_multiple_flag: shareMultiple,
        parent_message: parentMessage.trim() || undefined,
        access_token: session?.access_token,
      })

      if (result?.error) {
        toast.error(result.error)
        setStatus('idle')
        return
      }

      const nextStatus = (result as { status?: 'submitted' | 'partial' }).status ?? 'submitted'
      const missingDocs = Array.isArray((result as { missingDocuments?: unknown }).missingDocuments)
        ? (((result as { missingDocuments?: string[] }).missingDocuments ?? []).filter(Boolean) as string[])
        : []

      setSubmissionState(nextStatus)
      setSubmittedMissingDocuments(missingDocs)
      setStatus('success')
      if (nextStatus === 'partial') {
        toast.success('Partial application saved. Upload the missing documents to complete it.')
      } else {
        toast.success('Application submitted. We will update you via email.')
      }
    })
  }

  if (status === 'success') {
    return (
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50">
        <CardContent className="space-y-4 px-4 py-5 text-center sm:px-6 sm:py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Next step</p>
          <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {submissionState === 'partial' ? 'Partial application saved' : 'Application sent'}
          </h3>
          {submissionState === 'partial' ? (
            <div className="space-y-2 text-sm text-slate-700">
              <p>We saved your application to {centre.name} and marked it as incomplete.</p>
              {submittedMissingDocuments.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Missing documents</p>
                  <ul className="mt-1.5 space-y-1 text-xs text-amber-900 sm:text-sm">
                    {submittedMissingDocuments.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              We have forwarded your application to {centre.name}. Expect a confirmation email soon.
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/parent/applications">Go to Application Journey</Link>
            </Button>
            {submissionState === 'partial' ? (
              <Button variant="outline" asChild>
                <Link href="/parent/profile/documents">Upload Missing Documents</Link>
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href="/directory">Browse other centres</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-elevation-1)] sm:space-y-6 sm:p-6">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Step 1 - Child profile</p>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Who is applying?</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Select one of your saved child profiles, or add a new profile before submitting.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            className={cn(
              'rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors',
              step === 'existing'
                ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
            )}
            onClick={() => setStep('existing')}
          >
            Use existing child
          </button>
          <button
            type="button"
            className={cn(
              'rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors',
              step === 'new'
                ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
            )}
            onClick={() => setStep('new')}
          >
            Add new child
          </button>
        </div>

        {step === 'existing' ? (
          childList.length === 0 ? (
            <p className="text-sm text-slate-600">No child profiles yet. Create one to continue.</p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
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
                      'w-full rounded-xl border px-3.5 py-3 text-left transition-colors',
                      isActive
                        ? 'border-cyan-300 bg-cyan-50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-cyan-50/40'
                    )}
                  >
                    <p className="text-base font-semibold leading-snug">
                      {child.first_name} {child.last_name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{age ? `${age} years old` : 'Age pending'}</p>
                  </button>
                )
              })}
            </div>
          )
        ) : (
          <form className="space-y-4" onSubmit={childForm.handleSubmit(handleAddChild)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First name</Label>
                <Input id="first_name" {...childForm.register('first_name')} />
                {childForm.formState.errors.first_name && (
                  <p className="text-xs text-destructive">{childForm.formState.errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last name</Label>
                <Input id="last_name" {...childForm.register('last_name')} />
                {childForm.formState.errors.last_name && (
                  <p className="text-xs text-destructive">{childForm.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date_of_birth">Date of birth</Label>
              <Input id="date_of_birth" type="date" {...childForm.register('date_of_birth')} />
              {childForm.formState.errors.date_of_birth && (
                <p className="text-xs text-destructive">{childForm.formState.errors.date_of_birth.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">Add the child profile, then continue your application.</p>
              <Button type="submit" disabled={isChildPending} size="sm" className="sm:w-auto">
                {isChildPending ? 'Adding...' : 'Add child'}
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Step 2 - Submit application</p>
          <h3 className="text-lg font-bold text-slate-900 sm:text-xl">Submit to {centre.name}</h3>
          <p className="text-sm leading-relaxed text-slate-600">
            Add an optional message to help the centre understand your child needs.
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="apply-centre-name">Centre name</Label>
              <Input id="apply-centre-name" value={centre.name} readOnly className="bg-slate-50" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apply-centre-location">Location</Label>
              <Input id="apply-centre-location" value={centreLocation} readOnly className="bg-slate-50" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apply-parent-message">Message to centre (optional)</Label>
            <Textarea
              id="apply-parent-message"
              placeholder="Share anything important (siblings, support needs, transport notes, etc.)"
              value={parentMessage}
              rows={4}
              onChange={(event) => setParentMessage(event.target.value)}
              className="bg-white text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={shareMultiple}
              onChange={(event) => setShareMultiple(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border border-slate-300"
            />
            Share this application across other matching centres if needed.
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-900">Selected child</p>
            {selectedChild ? (
              <p className="mt-0.5 text-slate-600">
                {selectedChild.first_name} {selectedChild.last_name}
                {selectedChild.date_of_birth ? ` - ${calculateAge(selectedChild.date_of_birth)} years old` : ''}
              </p>
            ) : (
              <p className="mt-0.5 text-slate-500">Please add or select a child to continue.</p>
            )}
          </div>
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Document progress</p>
              <p className="text-xs font-semibold text-teal-700">
                {documentChecklist.uploadedCount}/{documentChecklist.totalRequired} uploaded
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-teal-100">
              <div
                className="h-full rounded-full bg-teal-600 transition-all"
                style={{
                  width: `${Math.round(
                    (documentChecklist.uploadedCount / Math.max(1, documentChecklist.totalRequired)) * 100
                  )}%`,
                }}
              />
            </div>
            {documentChecklist.missingLabels.length > 0 ? (
              <div className="mt-2">
                <p className="text-xs text-teal-800">Missing documents can be uploaded after submitting a partial application:</p>
                <ul className="mt-1 space-y-1 text-xs sm:text-sm">
                  {documentChecklist.missingLabels.slice(0, 4).map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-2 text-xs text-teal-800">Great, your required documents are complete.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Ready to submit?</p>
            <p className="text-sm text-slate-600">
              One active application per child per centre. Incomplete documents will save as a partial application.
            </p>
          </div>
          <Button onClick={handleSubmit} disabled={isPending || !selectedChild} size="lg" className="w-full sm:w-auto">
            {isPending || status === 'submitting' ? 'Submitting...' : 'Submit Application (Allow Partial)'}
          </Button>
        </div>
      </div>
    </div>
  )
}


