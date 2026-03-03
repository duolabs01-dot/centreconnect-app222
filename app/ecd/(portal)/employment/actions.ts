'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const dateInputSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Invalid date value',
  })

const dateTimeInputSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
    message: 'Invalid date-time value',
  })

const createJobSchema = z.object({
  title: z.string().trim().min(3).max(120),
  roleType: z.enum(['assistant', 'cook', 'cleaner', 'driver', 'practitioner', 'other']),
  description: z.string().trim().max(2000).optional(),
  requirements: z.string().trim().max(2000).optional(),
  closesAt: dateInputSchema,
  publishNow: z.boolean(),
})

const updateJobApplicationSchema = z.object({
  applicationId: z.string().uuid(),
  nextStatus: z.enum(['new', 'shortlisted', 'interview', 'offer', 'hired', 'rejected']),
  notes: z.string().trim().max(2000).optional(),
  interviewAt: dateTimeInputSchema,
}).superRefine((value, ctx) => {
  if (value.nextStatus === 'interview' && !value.interviewAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Interview date-time is required when status is set to interview.',
      path: ['interviewAt'],
    })
  }
})

const toggleJobPublishSchema = z.object({
  jobId: z.string().uuid(),
  nextPublished: z.boolean(),
})

async function requireEcdAdminContext() {
  const session = await requireEcdPortalSession({ cached: false })
  if (session.role !== 'ecd_admin') {
    return { supabase: session.supabase, user: session.user, ecdId: null as string | null }
  }
  return { supabase: session.supabase, user: session.user, ecdId: session.ecdId }
}

export async function createJobAction(formData: FormData) {
  const ctx = await requireEcdAdminContext()
  if (!ctx.user) redirect('/ecd/login')
  if (!ctx.ecdId) redirect('/ecd/employment?error=owner-only')

  const parsed = createJobSchema.safeParse({
    title: formData.get('title'),
    roleType: formData.get('role_type'),
    description: formData.get('description') || undefined,
    requirements: formData.get('requirements') || undefined,
    closesAt: formData.get('closes_at') || undefined,
    publishNow: formData.get('publish_now') === 'on',
  })

  if (!parsed.success) {
    redirect('/ecd/employment?error=invalid-job')
  }

  const closesAt = parsed.data.closesAt ? parsed.data.closesAt : null
  const description = parsed.data.description ? parsed.data.description : null
  const requirements = parsed.data.requirements ? parsed.data.requirements : null
  const publishedAt = parsed.data.publishNow ? new Date().toISOString() : null

  const { error } = await ctx.supabase.from('jobs').insert({
    ecd_id: ctx.ecdId,
    title: parsed.data.title,
    role_type: parsed.data.roleType,
    description,
    requirements,
    is_published: parsed.data.publishNow,
    published_at: publishedAt,
    closes_at: closesAt,
    created_by: ctx.user.id,
  })

  if (error) {
    redirect('/ecd/employment?error=create-failed')
  }

  revalidatePath('/ecd/employment')
  revalidatePath('/')
  redirect('/ecd/employment?success=job-created')
}

export async function toggleJobPublishAction(formData: FormData) {
  const ctx = await requireEcdAdminContext()
  if (!ctx.user) redirect('/ecd/login')
  if (!ctx.ecdId) redirect('/ecd/employment?error=owner-only')

  const parsed = toggleJobPublishSchema.safeParse({
    jobId: String(formData.get('job_id') ?? '').trim(),
    nextPublished: String(formData.get('next_published') ?? '').trim() === 'true',
  })
  if (!parsed.success) {
    redirect('/ecd/employment?error=invalid-job')
  }

  const { error } = await ctx.supabase
    .from('jobs')
    .update({
      is_published: parsed.data.nextPublished,
      published_at: parsed.data.nextPublished ? new Date().toISOString() : null,
    })
    .eq('id', parsed.data.jobId)
    .eq('ecd_id', ctx.ecdId)

  if (error) {
    redirect('/ecd/employment?error=publish-failed')
  }

  revalidatePath('/ecd/employment')
  revalidatePath('/')
  redirect('/ecd/employment?success=job-updated')
}

export async function updateJobApplicationStatusAction(formData: FormData) {
  const { supabase, ecdId } = await requireEcdPortalSession({ cached: false })

  const parsed = updateJobApplicationSchema.safeParse({
    applicationId: formData.get('application_id'),
    nextStatus: formData.get('next_status'),
    notes: formData.get('notes') || undefined,
    interviewAt: formData.get('interview_at') || undefined,
  })

  if (!parsed.success) {
    redirect('/ecd/employment?error=invalid-job')
  }

  const nextNotes = parsed.data.notes ? parsed.data.notes : null
  const interviewDate = parsed.data.interviewAt ? new Date(parsed.data.interviewAt) : null
  if (interviewDate && Number.isNaN(interviewDate.getTime())) {
    redirect('/ecd/employment?error=invalid-job')
  }
  const nextInterviewAt = interviewDate ? interviewDate.toISOString() : null

  const { error } = await supabase
    .from('job_applications')
    .update({
      status: parsed.data.nextStatus,
      notes: nextNotes,
      interview_at: nextInterviewAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.applicationId)
    .eq('ecd_id', ecdId)

  if (error) {
    redirect('/ecd/employment?error=update-failed')
  }

  revalidatePath('/ecd/employment')
  redirect('/ecd/employment?success=application-updated')
}
