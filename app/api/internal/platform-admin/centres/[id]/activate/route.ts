import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { queueEmail } from '@/lib/communications/emails'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const centreId = params.id
  if (!centreId) {
    return NextResponse.json({ error: 'Centre ID is required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  try {
    // 1. Set ecd_centres.is_active = true
    const { data: updatedCentre, error: updateError } = await adminClient
      .from('ecd_centres')
      .update({ is_active: true, onboarded_at: new Date().toISOString() })
      .eq('id', centreId)
      .select('id, name, slug, email, primary_contact_name')
      .single()

    if (updateError) {
      console.error('Error activating centre:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 2. Mark related admin_tasks as 'completed'
    const { error: taskUpdateError } = await adminClient
      .from('admin_tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('ecd_id', centreId)
      .eq('type', 'activate_tenant')
      .eq('status', 'pending') // Only complete pending activation tasks
      .select()

    if (taskUpdateError) {
      // Non-critical error, log it but don't fail the activation
      console.error('Error marking admin task as completed:', taskUpdateError)
    }

    // 3. Send welcome email to ECD admin with login link
    const loginLink = `https://centreconnect.co.za/login` // TODO: Make this specific to ECD admin login page if different
    const welcomeSubject = `Welcome to CentreConnect, ${updatedCentre.name}!`
    const welcomeBody = `Dear ${updatedCentre.primary_contact_name},

Your CentreConnect account for ${updatedCentre.name} has been successfully activated!

You can now log in and start using CentreConnect to manage your ECD centre:
${loginLink}

We're excited to have you on board!

Best regards,
The CentreConnect Team`

    await queueEmail(updatedCentre.email, welcomeSubject, welcomeBody)
    // TODO: Add specific logging for email queuing failure if needed

    await writePlatformActivity(adminClient, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'tenant',
      entityId: updatedCentre.id,
      action: 'activate_tenant',
      summary: `Activated tenant ${updatedCentre.name}`,
      details: { slug: updatedCentre.slug, email: updatedCentre.email },
    })

    return NextResponse.json({ message: 'Centre activated successfully', centre: updatedCentre }, { status: 200 })

  } catch (error: any) {
    console.error('API Error during activation:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
