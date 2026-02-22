'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { submitJobApplicationAction } from '@/lib/actions/jobs/submit-application'

const publicJobApplicationSchema = z.object({
  applicant_name: z.string().min(2, 'Full name is required'),
  applicant_email: z.string().email('Valid email is required'),
  applicant_phone: z.string().min(10, 'Phone number is required'),
  id_number: z.string().optional(),
  cover_letter: z.string().min(20, 'Please write a short cover letter'),
  references: z.string().optional(),
  centreconnect_email: z.string().optional(),
  cv_url: z.string().optional(),
})

type PublicJobApplicationValues = z.infer<typeof publicJobApplicationSchema>

type PublicJobApplyFormProps = {
  jobId: string
  ecdId: string
  jobTitle: string
  centreName: string
}

export function PublicJobApplyForm({ jobId, ecdId, jobTitle, centreName }: PublicJobApplyFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<PublicJobApplicationValues>({
    resolver: zodResolver(publicJobApplicationSchema),
    defaultValues: {
      applicant_name: '',
      applicant_email: '',
      applicant_phone: '',
      id_number: '',
      cover_letter: '',
      references: '',
      centreconnect_email: '',
      cv_url: '',
    },
  })

  async function onSubmit(values: PublicJobApplicationValues) {
    setSubmitting(true)
    try {
      const result = await submitJobApplicationAction({
        job_id: jobId,
        ecd_id: ecdId,
        applicant_name: values.applicant_name,
        applicant_email: values.applicant_email,
        applicant_phone: values.applicant_phone,
        id_number: values.id_number?.trim() ? values.id_number.trim() : null,
        cover_letter: values.cover_letter,
        references: values.references?.trim() ? values.references.trim() : null,
        centreconnect_email: values.centreconnect_email?.trim() ? values.centreconnect_email.trim() : null,
        cv_url: values.cv_url?.trim() ? values.cv_url.trim() : null,
      })
      if ('error' in result) {
        toast.error(result.error || 'Submission failed. Please try again.')
        return
      }
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle className="mx-auto h-10 w-10 text-emerald-600" />
        <h3 className="text-xl font-bold text-emerald-900">Application Submitted</h3>
        <p className="text-sm text-emerald-800">
          Thank you for applying to <strong>{jobTitle}</strong> at <strong>{centreName}</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
        <p className="text-sm font-medium text-cyan-900">
          Applying for: <span className="font-bold">{jobTitle}</span> at {centreName}
        </p>
        <p className="mt-1 text-xs text-cyan-700">No account required. Your details go directly to the centre.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Full Name *" error={form.formState.errors.applicant_name?.message}>
          <Input {...form.register('applicant_name')} />
        </Field>
        <Field label="Email Address *" error={form.formState.errors.applicant_email?.message}>
          <Input {...form.register('applicant_email')} type="email" />
        </Field>
        <Field label="Phone Number *" error={form.formState.errors.applicant_phone?.message}>
          <Input {...form.register('applicant_phone')} type="tel" />
        </Field>
        <Field label="ID Number (optional)" error={form.formState.errors.id_number?.message}>
          <Input {...form.register('id_number')} maxLength={13} />
        </Field>
        <Field label="CV Link (optional)">
          <Input {...form.register('cv_url')} placeholder="https://drive.google.com/..." />
        </Field>
        <Field label="Cover Letter *" error={form.formState.errors.cover_letter?.message}>
          <Textarea {...form.register('cover_letter')} rows={6} className="resize-none" />
        </Field>
        <Field label="References (optional)">
          <Textarea {...form.register('references')} rows={3} className="resize-none" />
        </Field>
        <Field label="CentreConnect Email (optional)">
          <Input {...form.register('centreconnect_email')} type="email" />
        </Field>
        <Button type="submit" disabled={submitting} className="h-11 w-full bg-cyan-600 hover:bg-cyan-700">
          {submitting ? 'Submitting...' : 'Submit Application'}
        </Button>
      </form>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-800">{label}</label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
