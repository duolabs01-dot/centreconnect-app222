import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'

type ServiceAction = 'approve' | 'reject' | 'provision'

const MONTHLY_PRICE_BY_TIER: Record<'basic' | 'standard' | 'premium', number> = {
  basic: 199,
  standard: 299,
  premium: 499,
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48)
}

function appendAdminNote(current: string | null, action: string, actorEmail: string | null, note?: string) {
  const time = new Date().toISOString()
  const actor = actorEmail ?? 'platform-admin'
  const suffix = note?.trim() ? ` | ${note.trim()}` : ''
  const line = `[${time}] ${action} by ${actor}${suffix}`
  return [current?.trim(), line].filter(Boolean).join('\n')
}

async function getUniqueCentreSlug(admin: ReturnType<typeof createAdminClient>, centreName: string, userId: string) {
  const baseSlug = slugify(centreName) || `ecd-${userId.slice(0, 8)}`
  let slug = baseSlug
  let counter = 1

  while (true) {
    const { data: exists, error } = await admin.from('ecd_centres').select('id').eq('slug', slug).maybeSingle()
    if (error) throw new Error(error.message)
    if (!exists) return slug
    counter += 1
    slug = `${baseSlug}-${counter}`
  }
}

type RunServiceActionInput = {
  admin: ReturnType<typeof createAdminClient>
  actorUserId: string
  actorEmail: string | null
  applicationId: string
  action: ServiceAction
  adminNotes?: string
}

type RunServiceActionResult =
  | { ok: true; status: 'approved' | 'rejected' | 'provisioned'; ecdId?: string; slug?: string; warning?: string }
  | { ok: false; error: string; statusCode?: number }

export async function runServiceApplicationAction(input: RunServiceActionInput): Promise<RunServiceActionResult> {
  const { admin, applicationId, action, actorEmail, actorUserId, adminNotes } = input

  const { data: application, error: applicationError } = await admin
    .from('ecd_service_applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (applicationError || !application) {
    return { ok: false, error: applicationError?.message || 'Application not found', statusCode: 404 }
  }

  if (action === 'approve') {
    const { error } = await admin
      .from('ecd_service_applications')
      .update({
        status: 'approved',
        approved_at: application.approved_at ?? new Date().toISOString(),
        admin_notes: appendAdminNote(application.admin_notes, 'APPROVED', actorEmail, adminNotes),
      })
      .eq('id', application.id)
    if (error) return { ok: false, error: error.message, statusCode: 400 }

    // --- Start: Bookkeeping Assignment & Email Logic ---
    if (application.service_name === 'Bookkeeping Service') {
      const { data: assignment, error: assignmentError } = await admin
        .from('bookkeeping_assignments')
        .insert({
          ecd_id: application.ecd_id,
          service_application_id: application.id,
          status: 'pending',
          notes: `Bookkeeping service approved for ${application.centre_name}`,
        })
        .select('id')
        .single()
      
      if (assignmentError) {
        console.error('Failed to create bookkeeping assignment:', assignmentError);
        // Continue with the main flow, but log the error
      } else {
        // Send email to bookkeeper
        void sendPlatformAdminActionNotification({
          subject: `New Bookkeeping Assignment: ${application.centre_name}`,
          heading: 'A new bookkeeping service has been approved and requires assignment.',
          lines: [
            `Centre Name: ${application.centre_name}`,
            `ECD ID: ${application.ecd_id}`,
            `Service Application ID: ${application.id}`,
            `Assignment ID: ${assignment?.id}`,
            `Applicant Email: ${application.applicant_email}`,
            `Notes: ${adminNotes || 'No additional notes provided.'}`,
          ],
          details: {
            action: 'new_bookkeeping_assignment',
            applicationId: application.id,
            ecdId: application.ecd_id,
            assignmentId: assignment?.id,
          },
          recipientEmail: process.env.BOOKKEEPER_EMAIL, // Use the new env variable
        });
      }
    }
    // --- End: Bookkeeping Assignment & Email Logic ---


    await writePlatformActivity(admin, {
      actorUserId,
      actorEmail,
      entityType: 'service_application',
      entityId: application.id,
      action: 'approve',
      summary: `Approved application for ${application.centre_name}`,
      details: { status: 'approved' },
    })
    void sendPlatformAdminActionNotification({
      subject: 'Application Approved',
      heading: 'An ECD service application was approved.',
      lines: [
        `Centre: ${application.centre_name}`,
        `Application ID: ${application.id}`,
        `Applicant: ${application.applicant_full_name} (${application.applicant_email})`,
        `Actor: ${actorEmail ?? 'platform-admin'}`,
      ],
      details: {
        action: 'approve',
        selectedTier: application.selected_tier,
        recommendedTier: application.recommended_tier,
        adminNotes: adminNotes?.trim() || null,
      },
    })
    return { ok: true, status: 'approved' }
  }

  if (action === 'reject') {
    const { error } = await admin
      .from('ecd_service_applications')
      .update({
        status: 'rejected',
        admin_notes: appendAdminNote(application.admin_notes, 'REJECTED', actorEmail, adminNotes),
      })
      .eq('id', application.id)
    if (error) return { ok: false, error: error.message, statusCode: 400 }

    await writePlatformActivity(admin, {
      actorUserId,
      actorEmail,
      entityType: 'service_application',
      entityId: application.id,
      action: 'reject',
      summary: `Rejected application for ${application.centre_name}`,
      details: { status: 'rejected' },
    })
    void sendPlatformAdminActionNotification({
      subject: 'Application Rejected',
      heading: 'An ECD service application was rejected.',
      lines: [
        `Centre: ${application.centre_name}`,
        `Application ID: ${application.id}`,
        `Applicant: ${application.applicant_full_name} (${application.applicant_email})`,
        `Actor: ${actorEmail ?? 'platform-admin'}`,
      ],
      details: {
        action: 'reject',
        selectedTier: application.selected_tier,
        recommendedTier: application.recommended_tier,
        adminNotes: adminNotes?.trim() || null,
      },
    })
    return { ok: true, status: 'rejected' }
  }

  if (application.status !== 'approved' && application.status !== 'provisioned') {
    return { ok: false, error: 'Application must be approved before provisioning.', statusCode: 409 }
  }

  if (!application.user_id) {
    return { ok: false, error: 'Application has no linked user_id; cannot provision tenant.', statusCode: 409 }
  }

  const { data: existingAdminLink, error: linkCheckError } = await admin
    .from('ecd_admins')
    .select('ecd_id')
    .eq('user_id', application.user_id)
    .maybeSingle()
  if (linkCheckError) return { ok: false, error: linkCheckError.message, statusCode: 400 }

  if (existingAdminLink?.ecd_id) {
    await admin
      .from('ecd_centres')
      .update({ owner_id: application.user_id })
      .eq('id', existingAdminLink.ecd_id)
      .is('owner_id', null)

    const { error: markProvisionedError } = await admin
      .from('ecd_service_applications')
      .update({
        status: 'provisioned',
        provisioned_at: application.provisioned_at ?? new Date().toISOString(),
        admin_notes: appendAdminNote(
          application.admin_notes,
          'PROVISIONED (linked existing tenant)',
          actorEmail,
          adminNotes
        ),
      })
      .eq('id', application.id)
    if (markProvisionedError) return { ok: false, error: markProvisionedError.message, statusCode: 400 }

    await writePlatformActivity(admin, {
      actorUserId,
      actorEmail,
      entityType: 'tenant',
      entityId: existingAdminLink.ecd_id,
      action: 'provision_existing',
      summary: `Marked application as provisioned using existing tenant ${existingAdminLink.ecd_id}`,
      details: { applicationId: application.id },
    })
    void sendPlatformAdminActionNotification({
      subject: 'Application Provisioned (Existing Tenant)',
      heading: 'A service application was provisioned using an existing tenant.',
      lines: [
        `Centre: ${application.centre_name}`,
        `Application ID: ${application.id}`,
        `Tenant ID: ${existingAdminLink.ecd_id}`,
        `Actor: ${actorEmail ?? 'platform-admin'}`,
      ],
      details: {
        action: 'provision_existing',
        adminNotes: adminNotes?.trim() || null,
      },
    })

    return { ok: true, status: 'provisioned', ecdId: existingAdminLink.ecd_id }
  }

  const centreName = (application.centre_name ?? '').trim() || 'New ECD Centre'
  const centrePhone = (application.centre_phone ?? '').trim() || 'Not provided'
  const centreAddress = (application.centre_address ?? '').trim() || 'To be updated'
  const centreSuburb = (application.centre_suburb ?? '').trim() || 'To be updated'
  const centreCity = (application.centre_city ?? '').trim() || 'Johannesburg'
  const centreProvince = (application.centre_province ?? '').trim() || 'Gauteng'
  const centreEmail = (application.applicant_email ?? '').trim() || `ecd-${application.user_id}@example.com`
  const slug = await getUniqueCentreSlug(admin, centreName, application.user_id)

  const { data: centre, error: centreError } = await admin
    .from('ecd_centres')
    .insert({
      slug,
      name: centreName,
      email: centreEmail,
      phone: centrePhone,
      address: centreAddress,
      suburb: centreSuburb,
      city: centreCity,
      province: centreProvince,
      is_active: true,
      is_registered: false,
      onboarded_at: new Date().toISOString(),
      owner_id: application.user_id,
    })
    .select('id')
    .single()
  if (centreError || !centre?.id) {
    return { ok: false, error: centreError?.message || 'Failed to create centre record', statusCode: 400 }
  }

  const { error: adminLinkError } = await admin.from('ecd_admins').insert({
    ecd_id: centre.id,
    user_id: application.user_id,
    role: 'ecd_admin',
    invited_by: actorUserId,
    accepted_at: new Date().toISOString(),
  })
  if (adminLinkError) {
    await admin.from('ecd_centres').delete().eq('id', centre.id)
    return { ok: false, error: adminLinkError.message, statusCode: 400 }
  }

  const selectedTier = (application.selected_tier ?? 'basic') as 'basic' | 'standard' | 'premium'
  const { error: subscriptionError } = await admin.from('subscriptions').upsert(
    {
      ecd_id: centre.id,
      tier: selectedTier,
      status: 'trial',
      monthly_price: MONTHLY_PRICE_BY_TIER[selectedTier],
    },
    { onConflict: 'ecd_id' }
  )
  if (subscriptionError) {
    await admin.from('ecd_admins').delete().eq('ecd_id', centre.id).eq('user_id', application.user_id)
    await admin.from('ecd_centres').delete().eq('id', centre.id)
    return { ok: false, error: subscriptionError.message, statusCode: 500 }
  }

  const { error: updateApplicationError } = await admin
    .from('ecd_service_applications')
    .update({
      status: 'provisioned',
      provisioned_at: new Date().toISOString(),
      approved_at: application.approved_at ?? new Date().toISOString(),
      admin_notes: appendAdminNote(application.admin_notes, 'PROVISIONED', actorEmail, adminNotes),
    })
    .eq('id', application.id)

  await writePlatformActivity(admin, {
    actorUserId,
    actorEmail,
    entityType: 'tenant',
    entityId: centre.id,
    action: 'provision_new',
    summary: `Provisioned new tenant ${centreName}`,
    details: { applicationId: application.id, slug, tier: selectedTier },
  })
  void sendPlatformAdminActionNotification({
    subject: 'Application Provisioned (New Tenant)',
    heading: 'A new tenant was created from a service application.',
    lines: [
      `Centre: ${centreName}`,
      `Application ID: ${application.id}`,
      `Tenant ID: ${centre.id}`,
      `Tenant Slug: ${slug}`,
      `Actor: ${actorEmail ?? 'platform-admin'}`,
    ],
    details: {
      action: 'provision_new',
      selectedTier,
      adminNotes: adminNotes?.trim() || null,
    },
  })

  if (updateApplicationError) {
    return {
      ok: true,
      status: 'provisioned',
      ecdId: centre.id,
      slug,
      warning: `Tenant provisioned but application update failed: ${updateApplicationError.message}`,
    }
  }

  return { ok: true, status: 'provisioned', ecdId: centre.id, slug }
}
