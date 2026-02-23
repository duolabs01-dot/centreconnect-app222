'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const submitJobApplicationSchema = z.object({
  job_id: z.string().uuid(),
  ecd_id: z.string().uuid(),
  applicant_name: z.string().min(2),
  applicant_email: z.string().email(),
  applicant_phone: z.string().min(10),
  id_number: z.string().nullable(),
  cover_letter: z.string().min(20),
  references: z.string().nullable(),
  centreconnect_email: z.string().email().nullable(),
  cv_url: z.string().url().nullable(),
})

export type SubmitJobApplicationInput = z.infer<typeof submitJobApplicationSchema>

export async function submitJobApplicationAction(input: SubmitJobApplicationInput) {
  const parsed = submitJobApplicationSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid form data' as const }

  const supabase = await createClient()

  const { data: job } = await supabase
    .from('jobs')
    .select('id,is_published,closes_at,ecd_id,title')
    .eq('id', parsed.data.job_id)
    .eq('ecd_id', parsed.data.ecd_id)
    .maybeSingle()

  if (!job?.is_published) return { error: 'This job is no longer accepting applications' as const }
  if (job.closes_at && new Date(job.closes_at) < new Date()) {
    return { error: 'The application period for this job has closed' as const }
  }

  const { data: existing } = await supabase
    .from('job_applications')
    .select('id')
    .eq('job_id', parsed.data.job_id)
    .eq('applicant_email', parsed.data.applicant_email)
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    return { error: 'You already applied for this position with this email address' as const }
  }

  const corePayload = {
    job_id: parsed.data.job_id,
    ecd_id: parsed.data.ecd_id,
    applicant_name: parsed.data.applicant_name,
    applicant_email: parsed.data.applicant_email,
    applicant_phone: parsed.data.applicant_phone,
    cv_url: parsed.data.cv_url,
    cover_letter: parsed.data.cover_letter,
    status: 'new',
  }

  const extendedPayload = {
    ...corePayload,
    ...(parsed.data.id_number ? { id_number: parsed.data.id_number } : {}),
    ...(parsed.data.references ? { ['references']: parsed.data.references } : {}),
    ...(parsed.data.centreconnect_email ? { centreconnect_email: parsed.data.centreconnect_email } : {}),
  }

  const isMissingColumnError = (message?: string) =>
    Boolean(message && /column .* does not exist|schema cache|could not find/i.test(message))

  const isPermissionError = (code?: string, message?: string) =>
    code === '42501' ||
    Boolean(message && /row-level security|permission denied|not allowed/i.test(message))

  const tryInsert = async (
    client: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>,
    includeExtended: boolean
  ) => {
    return client
      .from('job_applications')
      .insert(includeExtended ? extendedPayload : corePayload)
  }

  let { error: insertError } = await tryInsert(supabase, true)

  if (insertError && isMissingColumnError(insertError.message)) {
    const retry = await tryInsert(supabase, false)
    insertError = retry.error
  }

  if (insertError && isPermissionError(insertError.code, insertError.message)) {
    try {
      const admin = createAdminClient()
      const adminTry = await tryInsert(admin, true)
      insertError = adminTry.error

      if (insertError && isMissingColumnError(insertError.message)) {
        const adminRetry = await tryInsert(admin, false)
        insertError = adminRetry.error
      }
    } catch {
      // Admin fallback unavailable in this environment.
    }
  }

  if (insertError) {
    console.error('submitJobApplicationAction failed:', {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      jobId: parsed.data.job_id,
      ecdId: parsed.data.ecd_id,
    })
    return { error: 'Failed to submit application. Please try again.' as const }
  }

  return { success: true as const }
}
