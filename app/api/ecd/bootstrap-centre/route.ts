import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL } from '@/lib/config'
import { writeInviteLog } from '@/lib/admin/invite-logs'
import {
  assignCentreOwnerIfMissing,
  getUniqueCentreSlug,
  rollbackProvisionedCentre,
  upsertCentreSubscription,
  upsertEcdAdminLink,
} from '@/lib/ecd/provisioning'

function isPilotRequested(selectedTier: string | null | undefined, adminNotes: string | null | undefined) {
  const tier = (selectedTier ?? '').trim().toLowerCase()
  if (tier === 'pilot') return true
  const notes = (adminNotes ?? '').toLowerCase()
  return notes.includes('"pilotrequested": true') || notes.includes('"requestedplan": "pilot"')
}

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const normalizedEmail = (user.email ?? '').trim().toLowerCase()

    const { data: existingAssignment } = await admin
      .from('ecd_admins')
      .select('id,ecd_id')
      .eq('user_id', user.id)
      .order('invited_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingAssignment?.ecd_id) {
      await assignCentreOwnerIfMissing(admin, existingAssignment.ecd_id, user.id)
      return NextResponse.json({ ok: true, created: false })
    }

    const serviceApplicationQuery = admin
      .from('ecd_service_applications')
      .select(
        'id,status,centre_name,centre_phone,centre_address,centre_suburb,centre_city,centre_province,selected_tier,admin_notes,provisioned_at'
      )
      .order('created_at', { ascending: false })
      .limit(1)
    const { data: serviceApplication } = await (normalizedEmail
      ? serviceApplicationQuery.or(`user_id.eq.${user.id},applicant_email.eq.${normalizedEmail}`)
      : serviceApplicationQuery.eq('user_id', user.id)
    ).maybeSingle()

    if (!serviceApplication || !['approved', 'provisioned'].includes(serviceApplication.status)) {
      return NextResponse.json(
        { error: 'Application pending approval', code: 'APPLICATION_PENDING' },
        { status: 403 }
      )
    }

    if (serviceApplication.status === 'provisioned') {
      const centreNameHint = (serviceApplication.centre_name ?? '').trim()
      const centreLookupByEmail = normalizedEmail
        ? await admin
            .from('ecd_centres')
            .select('id')
            .eq('email', normalizedEmail)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null as null }

      const centreLookupByName =
        !centreLookupByEmail.data && centreNameHint
          ? await admin
              .from('ecd_centres')
              .select('id')
              .eq('name', centreNameHint)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : { data: null as null }

      const recoveredEcdId = centreLookupByEmail.data?.id ?? centreLookupByName.data?.id ?? null
      if (recoveredEcdId) {
        await upsertEcdAdminLink({
          admin,
          ecdId: recoveredEcdId,
          userId: user.id,
        })
        await assignCentreOwnerIfMissing(admin, recoveredEcdId, user.id)
        return NextResponse.json({ ok: true, created: false, recovered: true })
      }
    }

    const centreName = (serviceApplication.centre_name ?? '').trim() || 'New ECD Centre'
    const centrePhone = (serviceApplication.centre_phone ?? '').trim() || 'Not provided'
    const centreAddress = (serviceApplication.centre_address ?? '').trim() || 'To be updated'
    const centreSuburb = (serviceApplication.centre_suburb ?? '').trim() || 'To be updated'
    const centreCityRaw = (serviceApplication.centre_city ?? '').trim() || 'Johannesburg'
    const centreProvinceRaw = (serviceApplication.centre_province ?? '').trim() || 'Gauteng'

    const finalSlug = await getUniqueCentreSlug(admin, centreName, user.id)

    const { data: centre, error: centreError } = await admin
      .from('ecd_centres')
      .insert({
        slug: finalSlug,
        name: centreName,
        email: user.email ?? `ecd-${user.id}@example.com`,
        phone: centrePhone,
        address: centreAddress,
        suburb: centreSuburb,
        city: centreCityRaw,
        province: centreProvinceRaw,
        is_active: true,
        owner_id: user.id,
      })
      .select('id')
      .single()

    if (centreError || !centre?.id) {
      return NextResponse.json({ error: centreError?.message || 'Failed to create centre' }, { status: 400 })
    }

    const { error: adminLinkError } = await upsertEcdAdminLink({
      admin,
      ecdId: centre.id,
      userId: user.id,
    })

    if (adminLinkError) {
      await rollbackProvisionedCentre(admin, centre.id, user.id)
      return NextResponse.json({ error: adminLinkError.message }, { status: 400 })
    }

    const { error: subscriptionError } = await upsertCentreSubscription({
      admin,
      ecdId: centre.id,
      selectedTier: serviceApplication.selected_tier,
      status: 'trial',
    })
    if (subscriptionError) {
      await rollbackProvisionedCentre(admin, centre.id, user.id)
      return NextResponse.json(
        { error: `Failed to create subscription: ${subscriptionError.message}` },
        { status: 500 }
      )
    }

    const warnings: string[] = []
    // Send welcome pack to ALL new centres (not just pilot tier)
    const shouldSendWelcomePack = Boolean(user.email)

    if (shouldSendWelcomePack && user.email) {
      const appUrlRoot = APP_URL.replace(/\/$/, '')
      const welcomePackEndpoint = new URL('/api/ecd/resend-welcome-pack', `${appUrlRoot}/`)
      try {
        const welcomeResponse = await fetch(welcomePackEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ecdId: centre.id,
            ownerEmail: user.email,
          }),
        })

        if (!welcomeResponse.ok) {
          const errorText = (await welcomeResponse.text().catch(() => '')).trim()
          warnings.push(
            errorText.length > 0
              ? `Failed to send pilot welcome pack (${welcomeResponse.status}): ${errorText}`
              : `Failed to send pilot welcome pack (${welcomeResponse.status}).`
          )
        } else {
          await writeInviteLog(admin, {
            centreId: centre.id,
            ownerEmail: user.email,
            inviteType: 'welcome_pack',
            status: 'sent',
            notes: 'Welcome pack sent on first login (bootstrap-centre).',
          })
        }
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : 'Failed to queue pilot welcome pack email.')
      }
    }

    const { error: applicationUpdateError } = await admin
      .from('ecd_service_applications')
      .update({
        status: 'provisioned',
        provisioned_at: new Date().toISOString(),
      })
      .eq('id', serviceApplication.id)

    if (applicationUpdateError) {
      return NextResponse.json(
        {
          ok: true,
          created: true,
          warning: `Centre was provisioned, but application status was not updated: ${applicationUpdateError.message}`,
          warnings: warnings.length > 0 ? warnings : undefined,
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      ok: true,
      created: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      welcomePackQueued: shouldSendWelcomePack && warnings.length === 0,
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
