'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { triggerFirstTimeConfetti } from '@/lib/ui/confetti'

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

export default function NewChildPage() {
  const router = useRouter()
  const supabase = createClient()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
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

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true)
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        toast.error('Please sign in again')
        router.push('/login?next=/parent/children/new')
        return
      }

      const { error: insertError } = await supabase.from('children').insert({
        parent_id: user.id,
        ...values,
        allergies: values.allergies || null,
        medical_conditions: values.medical_conditions || null,
        special_needs: values.special_needs || null,
      })

      if (insertError) {
        throw insertError
      }

      toast.success('Child added successfully')
      triggerFirstTimeConfetti('parent-first-child', 'child')
      router.push('/parent/children')
    } catch (error: any) {
      toast.error(error.message || 'Failed to add child')
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <main className="mx-auto w-full max-w-3xl pb-6">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Add Child</CardTitle>
          <CardDescription>Create a child profile to start applying to centres.</CardDescription>
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
              <Textarea id="allergies" {...register('allergies')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medical_conditions">Medical Conditions (optional)</Label>
              <Textarea id="medical_conditions" {...register('medical_conditions')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="special_needs">Special Needs (optional)</Label>
              <Textarea id="special_needs" {...register('special_needs')} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Child'}
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
