import 'server-only'

const WELCOME_TEMPLATE_KEYS = [
  'cc_welcome_intro',
  'cc_welcome_inbox_guide',
  'cc_welcome_legal',
  'cc_welcome_security',
] as const

type WelcomeTemplateKey = (typeof WELCOME_TEMPLATE_KEYS)[number]

type WelcomeSequenceRow = {
  template_key: WelcomeTemplateKey
  title: string
  body: string
}

const WELCOME_TEMPLATE_ROWS: WelcomeSequenceRow[] = [
  {
    template_key: 'cc_welcome_intro',
    title: 'Welcome to CentreConnect',
    body: 'Hi {{parent_name}}, welcome aboard. CentreConnect helps families discover centres, track applications, and stay in sync with daily updates in one place.',
  },
  {
    template_key: 'cc_welcome_inbox_guide',
    title: 'Your Notifications Live Here',
    body: 'Open the bell in your top bar anytime, or go to /parent/notifications for your full inbox.',
  },
  {
    template_key: 'cc_welcome_legal',
    title: 'Quick Legal and Terms Note',
    body: 'By using CentreConnect, you agree to our Terms, Privacy Policy, and POPIA security commitments. You can review these under /terms, /privacy, and /popia-security.',
  },
  {
    template_key: 'cc_welcome_security',
    title: 'Security, With Heart',
    body: 'We use secure sessions, strict role-based access, and verified pickup workflows to protect your family data and child safety records.',
  },
]

type ParentNotificationRecord = {
  parent_id: string
  ecd_id: string | null
  template_key: WelcomeTemplateKey
  title: string
  message: string
  is_read: boolean
}

type AdminDb = {
  from: (table: 'communication_templates' | 'parent_notifications' | 'ecd_centres') => any
}

type WelcomeSequenceResult = {
  ok: boolean
  inserted: number
  error: string | null
}

function firstName(value: string | null | undefined) {
  const full = String(value ?? '').trim()
  if (!full) return 'there'
  const token = full.split(/\s+/).find(Boolean)
  return token ?? 'there'
}

function hydrateBody(template: string, name: string) {
  return template.replaceAll('{{parent_name}}', name)
}

function mapRowsForParent(parentId: string, parentName: string, fallbackCentreId: string | null): ParentNotificationRecord[] {
  return WELCOME_TEMPLATE_ROWS.map((row: any) => ({
    parent_id: parentId,
    ecd_id: fallbackCentreId,
    template_key: row.template_key,
    title: row.title,
    message: hydrateBody(row.body, parentName),
    is_read: false,
  }))
}

async function getFallbackCentreId(db: AdminDb): Promise<string | null> {
  const { data, error } = await db
    .from('ecd_centres')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    return null
  }
  return data?.id ?? null
}

function isNotNullEcdConstraint(errorMessage: string | null | undefined) {
  const message = String(errorMessage ?? '').toLowerCase()
  return message.includes('null value in column "ecd_id"') && message.includes('not-null constraint')
}

export async function enqueueParentWelcomeSequence(
  db: AdminDb,
  args: {
    parentId: string
    parentName?: string | null
  }
): Promise<WelcomeSequenceResult> {
  const parentId = args.parentId.trim()
  if (!parentId) {
    return { ok: false, inserted: 0, error: 'parentId is required.' }
  }

  const normalizedName = firstName(args.parentName)

  const { data: existingRows, error: existingError } = await db
    .from('parent_notifications')
    .select('id')
    .eq('parent_id', parentId)
    .in('template_key', [...WELCOME_TEMPLATE_KEYS])
    .limit(1)

  if (existingError) {
    return { ok: false, inserted: 0, error: existingError.message }
  }
  if ((existingRows ?? []).length > 0) {
    return { ok: true, inserted: 0, error: null }
  }

  const { error: templateError } = await db.from('communication_templates').upsert(
    WELCOME_TEMPLATE_ROWS.map((row: any) => ({
      template_key: row.template_key,
      title: row.title,
      body: row.body,
      is_active: true,
    })),
    { onConflict: 'template_key' }
  )

  if (templateError) {
    return { ok: false, inserted: 0, error: templateError.message }
  }

  const primaryPayload = mapRowsForParent(parentId, normalizedName, null)
  const primaryInsert = await db.from('parent_notifications').insert(primaryPayload)
  if (!primaryInsert.error) {
    return { ok: true, inserted: primaryPayload.length, error: null }
  }

  if (!isNotNullEcdConstraint(primaryInsert.error?.message)) {
    return { ok: false, inserted: 0, error: primaryInsert.error?.message ?? 'Failed to enqueue welcome notifications.' }
  }

  const fallbackCentreId = await getFallbackCentreId(db)
  if (!fallbackCentreId) {
    return {
      ok: false,
      inserted: 0,
      error: 'parent_notifications requires ecd_id and no fallback centre is available.',
    }
  }

  const fallbackPayload = mapRowsForParent(parentId, normalizedName, fallbackCentreId)
  const fallbackInsert = await db.from('parent_notifications').insert(fallbackPayload)
  if (fallbackInsert.error) {
    return { ok: false, inserted: 0, error: fallbackInsert.error.message }
  }

  return { ok: true, inserted: fallbackPayload.length, error: null }
}

