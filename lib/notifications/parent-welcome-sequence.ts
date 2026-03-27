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
    title: 'You\u2019re in, {{parent_name}}!',
    body: 'Finding the right cr\u00e8che for your child just got easier. Start by browsing cr\u00e8ches near you \u2014 no registration fee, no upfront cost. Just apply and hear back directly.',
  },
  {
    template_key: 'cc_welcome_inbox_guide',
    title: 'Add your child\u2019s details',
    body: 'Head to your profile and add your child\u2019s name and age. It takes two minutes and means applications go out looking complete and ready.',
  },
  {
    template_key: 'cc_welcome_legal',
    title: 'Apply to as many cr\u00e8ches as you like',
    body: 'There\u2019s no limit on applications. Cast a wide net \u2014 apply to a few cr\u00e8ches in your area and see who responds first. We\u2019ll keep track of everything for you.',
  },
  {
    template_key: 'cc_welcome_security',
    title: 'We keep your family\u2019s info safe',
    body: 'Your child\u2019s details and documents are stored securely. Only the cr\u00e8ches you apply to can see your information. You can review our privacy commitment under Settings any time.',
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
    title: hydrateBody(row.title, parentName),
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

