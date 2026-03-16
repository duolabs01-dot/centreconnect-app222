'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ensureParentReady } from '@/lib/auth/ensure-parent-ready'
import { toFriendlyClientError } from '@/lib/supabase/client-errors'
import { trackAnalyticsEvent } from '@/lib/analytics/client-events'
import { reportParentSubmitFailure } from '@/lib/telemetry/parent-submit-failures.client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { triggerFirstTimeConfetti } from '@/lib/ui/confetti'
import { fetchManualChildAction, completeManualChildProfileAction } from './actions'

const childSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  allergies: z.string().optional(),
  medical_conditions: z.string().optional(),
  special_needs: z.string().optional(),
})

type ChildFormValues = z.infer<typeof childSchema>

function parseListField(value: string | undefined) {
  if (!value) return null
  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  return entries.length > 0 ? entries : null
}

function NewChildForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const manualChildId = searchParams.get('manualChildId')
  const supabase = createClient()
  const [submitting, setSubmitting] = useState(false)
  const [loadingChild, setLoadingChild] = useState(Boolean(manualChildId))

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ChildFormValues>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      allergies: '',
      medical_conditions: '',
      special_needs: '',
    },
  })

  useEffect(() => {
    async function fetchManualChild() {
      if (!manualChildId) return
      
      try {
        const result = await fetchManualChildAction(manualChildId)
        if (!result.success || !result.child) {
          toast.error(result.message || 'Could not find the child profile.')
          return
        }

        const data = result.child
        setValue('first_name', data.first_name || '')
        setValue('last_name', data.last_name || '')
        if (data.date_of_birth) {
          setValue('date_of_birth', data.date_of_birth)
        }
        setValue('gender', data.gender || '')
        setValue('allergies', Array.isArray(data.allergies) ? data.allergies.join(', ') : '')
        setValue('medical_conditions', Array.isArray(data.medical_conditions) ? data.medical_conditions.join(', ') : '')
        setValue('special_needs', data.special_needs || '')
      } catch (err) {
        console.error('Fetch error:', err)
        toast.error('An unexpected error occurred while fetching the profile.')
      } finally {
        setLoadingChild(false)
      }
    }

    fetchManualChild()
  }, [manualChildId, setValue])

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true)
    try {
      const ready = await ensureParentReady(supabase)
      if (!ready.ok) {
        reportParentSubmitFailure({
          route: '/parent/children/new',
          form: 'child_profile_create',
          failureType: 'bootstrap_failed',
          message: ready.error,
        })
        toast.error(ready.error)
        router.push('/login?next=/parent/children/new')
        return
      }

      if (manualChildId) {
        // Complete existing child profile using server action
        const result = await completeManualChildProfileAction({
          childId: manualChildId,
          ...values,
          allergies: values.allergies || null,
          medical_conditions: values.medical_conditions || null,
          special_needs: values.special_needs || null,
        })

        if (!result.success) {
          throw new Error(result.message)
        }
      } else {
        // Create new child profile
        const { error: insertError } = await supabase.from('children').insert({
          parent_id: ready.userId,
          ...values,
          allergies: parseListField(values.allergies),
          medical_conditions: parseListField(values.medical_conditions),
          special_needs: values.special_needs || null,
        })

        if (insertError) throw insertError
      }

      toast.success(manualChildId ? 'Profile completed!' : 'Child added successfully')
      void trackAnalyticsEvent({
        eventType: manualChildId ? 'parent_record_updated' : 'parent_record_created',
        actorRole: 'parent_user',
        path: '/parent/children/new',
        metadata: {
          entity: 'child_profile',
          manualChildId,
        },
      })
      triggerFirstTimeConfetti('parent-first-child', 'child')
      router.push('/parent/children')
    } catch (error: unknown) {
      const message = toFriendlyClientError(error, manualChildId ? 'Failed to complete profile' : 'Failed to add child')
      reportParentSubmitFailure({
        route: '/parent/children/new',
        form: 'child_profile_create',
        failureType: 'submit_failed',
        message,
      })
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  })

  if (loadingChild) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl pb-6">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>{manualChildId ? 'Complete Child Profile' : 'Add Child'}</CardTitle>
          <CardDescription>
            {manualChildId 
              ? 'A centre has started this profile for you. Please review and complete the details.'
              : 'Create a child profile to start applying to crèches.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input id="first_name" {...register('first_name')} />
                {errors.first_name ? <p className="text-xs text-red-600">{errors.first_name.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input id="last_name" {...register('last_name')} />
                {errors.last_name ? <p className="text-xs text-red-600">{errors.last_name.message}</p> : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
                {errors.date_of_birth ? <p className="text-xs text-red-600">{errors.date_of_birth.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  {...register('gender')}
                  className="cc-native-field"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender ? <p className="text-xs text-red-600">{errors.gender.message}</p> : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies (optional)</Label>
              <Textarea id="allergies" {...register('allergies')} placeholder="Peanuts, Egg, etc. (comma separated)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medical_conditions">Medical Conditions (optional)</Label>
              <Textarea id="medical_conditions" {...register('medical_conditions')} placeholder="Asthma, Diabetes, etc. (comma separated)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="special_needs">Special Needs (optional)</Label>
              <Textarea id="special_needs" {...register('special_needs')} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : (manualChildId ? 'Complete Profile' : 'Save Child')}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/parent/children">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

export default function NewChildPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
      </div>
    }>
      <NewChildForm />
    </Suspense>
  )
}
