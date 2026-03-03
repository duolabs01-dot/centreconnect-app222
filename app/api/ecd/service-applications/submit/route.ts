import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendServiceApplicationNotification } from '@/lib/email/service-application-notification'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { getClientAgent, getClientIp } from '@/lib/security/request-context'
import { verifyTurnstileToken } from '@/lib/security/turnstile'

const submitSchema = z.object({
  fullName: z.string().min(2).max(160),
  email: z.string().email(),
  password: z.string().min(8).max(128).optional(),
  phone: z.string().max(40).optional(),
  centreName: z.string().min(2).max(160),
  centrePhone: z.string().max(40).optional(),
  centreAddress: z.string().max(255).optional(),
  centreSuburb: z.string().max(120).optional(),
  centreCity: z.string().max(120).optional(),
  centreProvince: z.string().max(120).optional(),
  operatorRole: z.string().max(80).optional(),
  registrationStatus: z.string().max(80).optional(),
  yearsOperating: z.number().int().min(0).max(100).optional(),
  currentChildren: z.number().int().min(0).max(5000).optional(),
  staffCount: z.number().int().min(0).max(2000).optional(),
  ageGroups: z.array(z.string().max(40)).max(10).optional(),
  operatingHours: z.string().max(120).optional(),
  keyNeeds: z.array(z.string().max(80)).max(20).optional(),
  additionalContext: z.string().max(1200).optional(),
  claimSlug: z.string().max(160).optional(),
  monthlyBudget: z.number().min(0).max(100000).optional(),
  expectedChildren: z.number().int().min(0).max(5000).optional(),
  selectedTier: z.enum(['pilot', 'basic', 'standard', 'premium']),
  recommendedTier: z.enum(['basic', 'standard', 'premium']),
  captchaToken: z.string().max(2048).optional(),
})

function normalizeRequestedTier(tier: 'pilot' | 'basic' | 'standard' | 'premium') {
  return tier === 'pilot' ? 'basic' : tier
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function createTemporaryPassword() {
  return `Cc!${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}a1`
}

function isEmailAlreadyRegisteredError(message?: string | null) {
  const value = (message ?? '').toLowerCase()
  return value.includes('already been registered') || value.includes('already registered') || value.includes('already exists')
}

async function findAuthUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const { data, error } = await admin
    .schema('auth')
    .from('users')
    .select('id,email')
    .ilike('email', email)
    .limit(1)
    .maybeSingle()

  if (error) return null
  return data?.id ?? null
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const agent = getClientAgent(request)
    const ipRateLimit = await enforceRateLimit({
      scope: 'ecd-submit-ip',
      key: `${ip}:${agent}`,
      max: 8,
      windowMs: 15 * 60 * 1000,
    })
    if (!ipRateLimit.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipRateLimit.retryAfterSec) } }
      )
    }

    const payload = await request.json().catch(() => null)
    const parsed = submitSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data
    const admin = createAdminClient()
    const email = normalizeEmail(data.email)
    const emailRateLimit = await enforceRateLimit({
      scope: 'ecd-submit-email',
      key: email,
      max: 4,
      windowMs: 60 * 60 * 1000,
    })
    if (!emailRateLimit.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(emailRateLimit.retryAfterSec) } }
      )
    }

    const captchaResult = await verifyTurnstileToken({
      token: data.captchaToken ?? '',
      remoteIp: ip,
    })
    if (!captchaResult.ok) {
      return NextResponse.json({ error: 'Security verification failed' }, { status: 400 })
    }

    const { data: existingApplication } = await admin
      .from('ecd_service_applications')
      .select('id,status')
      .eq('applicant_email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingApplication && ['pending_review', 'approved', 'provisioned'].includes(existingApplication.status)) {
      return NextResponse.json(
        {
          ok: true,
          message: 'Application received. If eligible, we will contact you with next steps.',
        },
        { status: 202 }
      )
    }

    let userId: string | null = null
    let createdNewUser = false

    const createUserResult = await admin.auth.admin.createUser({
      email,
      password: data.password?.trim() || createTemporaryPassword(),
      email_confirm: false,
      user_metadata: {
        role: 'ecd_admin',
        full_name: data.fullName.trim(),
        phone: data.phone?.trim() || null,
        centre_name: data.centreName.trim(),
        centre_phone: data.centrePhone?.trim() || null,
        centre_address: data.centreAddress?.trim() || null,
        centre_suburb: data.centreSuburb?.trim() || null,
        centre_city: data.centreCity?.trim() || 'Johannesburg',
        centre_province: data.centreProvince?.trim() || 'Gauteng',
        operator_role: data.operatorRole?.trim() || null,
        registration_status: data.registrationStatus?.trim() || null,
        years_operating: data.yearsOperating ?? null,
        current_children: data.currentChildren ?? null,
        staff_count: data.staffCount ?? null,
        age_groups: data.ageGroups ?? [],
        operating_hours: data.operatingHours?.trim() || null,
        key_needs: data.keyNeeds ?? [],
        additional_context: data.additionalContext?.trim() || null,
      },
    })

    if (createUserResult.data.user?.id) {
      userId = createUserResult.data.user.id
      createdNewUser = true
    } else if (isEmailAlreadyRegisteredError(createUserResult.error?.message)) {
      userId = await findAuthUserIdByEmail(admin, email)
      if (!userId) {
        return NextResponse.json(
          {
            ok: true,
            message: 'Application received. If eligible, we will contact you with next steps.',
          },
          { status: 202 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Failed to process application' },
        { status: 400 }
      )
    }

    const { error: profileUpsertError } = await admin.from('user_profiles').upsert(
      {
        id: userId,
        role: 'ecd_admin',
        full_name: data.fullName.trim(),
        phone: data.phone?.trim() || null,
      },
      { onConflict: 'id' }
    )
    if (profileUpsertError) {
      if (createdNewUser && userId) {
        await admin.auth.admin.deleteUser(userId)
      }
      return NextResponse.json(
        { error: `Failed to create profile: ${profileUpsertError.message}` },
        { status: 500 }
      )
    }

    const applicationNotes = {
      operatorRole: data.operatorRole?.trim() || null,
      registrationStatus: data.registrationStatus?.trim() || null,
      yearsOperating: data.yearsOperating ?? null,
      currentChildren: data.currentChildren ?? null,
      staffCount: data.staffCount ?? null,
      ageGroups: data.ageGroups ?? [],
      operatingHours: data.operatingHours?.trim() || null,
      keyNeeds: data.keyNeeds ?? [],
      additionalContext: data.additionalContext?.trim() || null,
      claimSlug: data.claimSlug?.trim() || null,
      requestedPlan: data.selectedTier,
      pilotRequested: data.selectedTier === 'pilot',
    }

    const normalizedSelectedTier = normalizeRequestedTier(data.selectedTier)

    const { data: insertedApplication, error: insertApplicationError } = await admin
      .from('ecd_service_applications')
      .insert({
        user_id: userId,
        applicant_email: email,
        applicant_full_name: data.fullName.trim(),
        applicant_phone: data.phone?.trim() || null,
        centre_name: data.centreName.trim(),
        centre_phone: data.centrePhone?.trim() || null,
        centre_address: data.centreAddress?.trim() || null,
        centre_suburb: data.centreSuburb?.trim() || null,
        centre_city: data.centreCity?.trim() || 'Johannesburg',
        centre_province: data.centreProvince?.trim() || 'Gauteng',
        monthly_budget: data.monthlyBudget ?? null,
        expected_children: data.expectedChildren ?? null,
        selected_tier: normalizedSelectedTier,
        recommended_tier: data.recommendedTier,
        admin_notes: `ECD intake profile\n${JSON.stringify(applicationNotes, null, 2)}`,
        status: 'pending_review',
      })
      .select('id,created_at')
      .single()

    if (insertApplicationError || !insertedApplication) {
      if (createdNewUser && userId) {
        await admin.auth.admin.deleteUser(userId)
      }
      return NextResponse.json({ error: insertApplicationError?.message || 'Failed to create application' }, { status: 400 })
    }

    const notificationResult = await sendServiceApplicationNotification({
      applicationId: insertedApplication.id,
      submittedAt: insertedApplication.created_at,
      applicantFullName: data.fullName.trim(),
      applicantEmail: email,
      applicantPhone: data.phone?.trim() || null,
      centreName: data.centreName.trim(),
      centrePhone: data.centrePhone?.trim() || null,
      centreAddress: data.centreAddress?.trim() || null,
      centreSuburb: data.centreSuburb?.trim() || null,
      centreCity: data.centreCity?.trim() || 'Johannesburg',
      centreProvince: data.centreProvince?.trim() || 'Gauteng',
      selectedTier: normalizedSelectedTier,
      recommendedTier: data.recommendedTier,
      requestedPlan: data.selectedTier,
      monthlyBudget: data.monthlyBudget ?? null,
      expectedChildren: data.expectedChildren ?? null,
    })

    const message = notificationResult.ok
      ? 'Application submitted. Our team will review and contact you with next steps.'
      : 'Application submitted and saved to dashboard. Email notification failed; please check SMTP settings.'

    return NextResponse.json({
      ok: true,
      message,
      notificationSent: notificationResult.ok,
      notificationError: notificationResult.error ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
