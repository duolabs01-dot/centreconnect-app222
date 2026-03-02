'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { readSupabasePublicEnv } from '@/lib/supabase/env'
import { evaluateApplicationDocumentChecklist } from '@/lib/admissions/application-documents'

const schema = z.object({
  ecd_id: z.string().uuid(),
  child_id: z.string().uuid(),
  share_multiple_flag: z.boolean().default(false),
  parent_message: z.string().max(1000).optional(),
  access_token: z.string().min(16).optional(),
})

function createApplicationNumber() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
  return `APP-${y}${m}${d}-${nonce}`
}

export async function submitApplicationAction(input: unknown) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid application data' }
  }

  const supabase = await createClient()

  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ])
  let user = userData.user ?? sessionData.session?.user ?? null

  if (!user && parsed.data.access_token) {
    const { data: tokenUserData } = await supabase.auth.getUser(parsed.data.access_token)
    user = tokenUserData.user ?? null
  }

  if (!user) {
    return { error: 'Please log in to apply' }
  }

  const hasSessionContext = Boolean(userData.user || sessionData.session?.user)
  const usingTokenScopedClient = !hasSessionContext && Boolean(parsed.data.access_token)

  const { supabaseUrl, supabaseAnonKey } = readSupabasePublicEnv()
  if (usingTokenScopedClient && (!supabaseUrl || !supabaseAnonKey)) {
    return { error: 'Server configuration error. Please contact support.' }
  }

  const db = usingTokenScopedClient
    ? createSupabaseClient(supabaseUrl as string, supabaseAnonKey as string, {
        global: {
          headers: {
            Authorization: `Bearer ${parsed.data.access_token}`,
          },
        },
      })
    : supabase

  // Keep parent records present even when profile setup is still partial.
  // This ensures ECD teams can still resolve parent context for pipeline items.
  await db.from('parents').upsert({ id: user.id }, { onConflict: 'id' })

  const { data: child } = await db
    .from('children')
    .select('id,parent_id,first_name,last_name,date_of_birth,gender')
    .eq('id', parsed.data.child_id)
    .eq('parent_id', user.id)
    .maybeSingle()

  if (!child) {
    return { error: 'Child not found' }
  }

  const { data: documents } = await db.from('parent_documents').select('doc_type').eq('parent_id', user.id).limit(80)
  const documentChecklist = evaluateApplicationDocumentChecklist((documents ?? []).map((doc) => doc.doc_type))
  const hasMissingDocuments = documentChecklist.missingCodes.length > 0
  const nextStatus = hasMissingDocuments ? 'partial' : 'submitted'

  const { data: duplicate } = await db
    .from('applications')
    .select('id,status')
    .eq('parent_id', user.id)
    .eq('child_id', parsed.data.child_id)
    .eq('ecd_id', parsed.data.ecd_id)
    .not('status', 'in', '(withdrawn,rejected)')
    .limit(1)
    .maybeSingle()

  if (duplicate?.id) {
    return { error: 'An active application already exists for this child at this centre' }
  }

  let applicationId: string | null = null
  let insertError: { code?: string; message?: string } | null = null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await db
      .from('applications')
      .insert({
        application_number: createApplicationNumber(),
        ecd_id: parsed.data.ecd_id,
        parent_id: user.id,
        child_id: parsed.data.child_id,
        status: nextStatus,
        missing_documents: documentChecklist.missingCodes,
        share_multiple_flag: parsed.data.share_multiple_flag,
        parent_message: parsed.data.parent_message ?? null,
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (!error) {
      applicationId = data?.id ?? null
      insertError = null
      break
    }

    insertError = error
    if (error.code !== '23505') {
      break
    }
  }

  if (insertError) {
    if (insertError.message?.includes('infinite recursion')) {
      return { error: 'Server configuration error. Please contact support.' }
    }
    if (insertError.message?.toLowerCase().includes('row-level security')) {
      return { error: 'Your session expired. Please sign in again and retry.' }
    }
    return { error: 'Could not submit application. Please try again.' }
  }

  // Notify ECD team immediately when a new application lands.
  // This runs out-of-band and should never block submission success.
  try {
    const admin = createAdminClient()
    const [{ data: childInfo }, { data: centreInfo }, { data: parentProfile }] = await Promise.all([
      admin
        .from('children')
        .select('first_name,last_name')
        .eq('id', parsed.data.child_id)
        .maybeSingle(),
      admin
        .from('ecd_centres')
        .select('name')
        .eq('id', parsed.data.ecd_id)
        .maybeSingle(),
      admin
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle(),
    ])

    const childName = [childInfo?.first_name, childInfo?.last_name].filter(Boolean).join(' ').trim() || 'a child'
    const centreName = centreInfo?.name?.trim() || 'your centre'
    const parentName = parentProfile?.full_name?.trim() || user.email?.split('@')[0] || 'A parent'
    const notificationTitle = nextStatus === 'partial' ? 'Partial application in pipeline' : 'New application submitted'
    const notificationMessage =
      nextStatus === 'partial'
        ? `${parentName} started a partial application for ${childName} at ${centreName}. Missing docs: ${documentChecklist.missingLabels.join(', ')}.`
        : `${parentName} submitted an application for ${childName} at ${centreName}.`

    await admin.from('ecd_notifications').insert({
      ecd_id: parsed.data.ecd_id,
      application_id: applicationId,
      title: notificationTitle,
      message: notificationMessage,
      metadata: {
        kind: nextStatus === 'partial' ? 'application_partial_submitted' : 'application_submitted',
        application_id: applicationId,
        parent_id: user.id,
        child_id: parsed.data.child_id,
        missing_documents: documentChecklist.missingCodes,
      },
      is_read: false,
    })

    if (nextStatus === 'partial' && applicationId) {
      const missingSummary = documentChecklist.missingLabels.slice(0, 5).join(', ')
      await admin.from('parent_notifications').insert({
        parent_id: user.id,
        ecd_id: parsed.data.ecd_id,
        application_id: applicationId,
        template_key: 'missing_documents',
        title: 'Almost there! 📄✨',
        message: `Great start, ${parentName}! We saved ${childName}'s application at ${centreName}. Please upload the remaining documents (${missingSummary}) so the crèche can review quickly 😊.`,
        is_read: false,
      })
    }
  } catch {
    // Non-blocking: ECD notifications should not fail application submission.
  }

  return {
    success: true,
    applicationId,
    status: nextStatus,
    missingDocuments: documentChecklist.missingLabels,
    uploadedDocumentsCount: documentChecklist.uploadedCount,
    totalRequiredDocuments: documentChecklist.totalRequired,
  }
}
