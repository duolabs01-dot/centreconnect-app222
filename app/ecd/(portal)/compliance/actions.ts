'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const markDocumentSchema = z.object({
  id: z.string().uuid(),
  current_status: z.enum(['missing', 'uploaded', 'verified', 'expired']),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
})

const addStaffCheckSchema = z.object({
  staff_name: z.string().min(2).max(120),
  staff_role: z.string().max(120).optional(),
  medical_clearance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  criminal_clearance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  first_aid_cert_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  first_aid_cert_expires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  form_29_submitted: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
})

export async function markDocumentUploadedAction(formData: FormData) {
  const session = await requireEcdPortalSession({ cached: false })
  if (session.role !== 'ecd_admin' && session.role !== 'ecd_supervisor') return

  const parsed = markDocumentSchema.safeParse({
    id: String(formData.get('id') ?? '').trim(),
    current_status: String(formData.get('current_status') ?? 'missing').trim(),
    expires_at: String(formData.get('expires_at') ?? '').trim(),
    notes: String(formData.get('notes') ?? '').trim(),
  })
  if (!parsed.success) return

  const nextStatus = parsed.data.current_status === 'verified' ? 'verified' : 'uploaded'
  await session.supabase
    .from('compliance_documents')
    .update({
      status: nextStatus,
      expires_at: parsed.data.expires_at || null,
      notes: parsed.data.notes || null,
      uploaded_by: session.user.id,
    })
    .eq('id', parsed.data.id)
    .eq('ecd_id', session.ecdId)

  revalidatePath('/ecd/compliance')
}

export async function addStaffCheckAction(formData: FormData) {
  const session = await requireEcdPortalSession({ cached: false })
  if (session.role !== 'ecd_admin' && session.role !== 'ecd_supervisor') return

  const parsed = addStaffCheckSchema.safeParse({
    staff_name: String(formData.get('staff_name') ?? '').trim(),
    staff_role: String(formData.get('staff_role') ?? '').trim(),
    medical_clearance_date: String(formData.get('medical_clearance_date') ?? '').trim(),
    criminal_clearance_date: String(formData.get('criminal_clearance_date') ?? '').trim(),
    first_aid_cert_date: String(formData.get('first_aid_cert_date') ?? '').trim(),
    first_aid_cert_expires: String(formData.get('first_aid_cert_expires') ?? '').trim(),
    form_29_submitted: String(formData.get('form_29_submitted') ?? '') === 'on',
    notes: String(formData.get('notes') ?? '').trim(),
  })

  if (!parsed.success) return

  await session.supabase.from('compliance_staff_checks').insert({
    ecd_id: session.ecdId,
    staff_name: parsed.data.staff_name,
    staff_role: parsed.data.staff_role || null,
    medical_clearance_date: parsed.data.medical_clearance_date || null,
    criminal_clearance_date: parsed.data.criminal_clearance_date || null,
    first_aid_cert_date: parsed.data.first_aid_cert_date || null,
    first_aid_cert_expires: parsed.data.first_aid_cert_expires || null,
    form_29_submitted: parsed.data.form_29_submitted,
    notes: parsed.data.notes || null,
  })

  revalidatePath('/ecd/compliance')
}

