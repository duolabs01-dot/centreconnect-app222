import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { toApplicationDocumentLabel } from '@/lib/admissions/application-documents'

type DbClient = {
  from: (table: string) => any
}

type ParentProfileJoin = {
  full_name: string | null
  phone: string | null
}

type ParentProfileRow = {
  id: string
  alt_phone: string | null
  billing_email: string | null
  address: string | null
  suburb: string | null
  city: string | null
  province: string | null
  guardian_relationship: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  id_verification_status: string | null
  user_profiles: ParentProfileJoin | ParentProfileJoin[] | null
}

type ParentDocumentSelectRow = {
  id: string
  doc_type: string | null
  file_name: string | null
  verification_status?: string | null
  created_at: string
}

type ParentDocumentRow = {
  id: string
  doc_type: string | null
  file_name: string | null
  verification_status: string | null
  created_at: string
}

type GuardianLinkRow = {
  id: string
  full_name: string | null
  relationship: string | null
  phone: string | null
  email: string | null
  linked_user_id: string | null
  invite_sent_at: string | null
  invite_accepted_at: string | null
  invite_link_viewed_at: string | null
  invite_link_clicked_at: string | null
  invite_registered_at: string | null
  invite_claimed_at: string | null
  invite_token_expires_at: string | null
}

type GuardianContactSnapshot = {
  fullName: string | null
  relationship: string | null
  phone: string | null
  email: string | null
}

export type RelevantParentDocument = {
  id: string
  label: string
  fileName: string
  docType: string | null
  verificationStatus: string | null
  createdAt: string
  href: string
}

export type ParentDossierGuardian = {
  id: string
  fullName: string
  relationship: string | null
  phone: string | null
  email: string | null
  linkedUserId: string | null
  status: 'linked' | 'pending'
  timeline: {
    sentAt: string | null
    viewedAt: string | null
    clickedAt: string | null
    registeredAt: string | null
    claimedAt: string | null
    expiresAt: string | null
  }
}

export type ParentDossier = {
  parentId: string | null
  childId: string
  childName: string
  source: 'live' | 'guardian_snapshot' | 'missing'
  sourceLabel: string
  sourceDescription: string
  primaryParent: {
    userId: string | null
    fullName: string
    phone: string | null
    alternatePhone: string | null
    billingEmail: string | null
    relationship: string | null
    address: string | null
    emergencyContactName: string | null
    emergencyContactPhone: string | null
    verificationStatus: string | null
  }
  coParents: ParentDossierGuardian[]
  documents: RelevantParentDocument[]
  warnings: string[]
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function clean(value: string | null | undefined) {
  return String(value ?? '').trim()
}

function includesMissingColumnError(message: string | null | undefined) {
  const value = clean(message).toLowerCase()
  return value.includes('column') && (value.includes('does not exist') || value.includes('could not find'))
}

const RELEVANT_DOCUMENT_ALIASES = [
  { label: 'Parent ID document', aliases: ['parent_id', 'id_document', 'identity', 'passport', 'id'] },
  { label: 'Proof of address', aliases: ['proof_of_address', 'utility_bill', 'address_proof', 'proof address'] },
  { label: 'Birth certificate', aliases: ['birth_certificate', 'birth cert', 'birth'] },
  { label: 'Immunization record', aliases: ['immunization_record', 'immunisation_record', 'vaccine', 'road_to_health'] },
  { label: 'Medical certificate/card', aliases: ['medical_certificate', 'medical_card', 'clinic_card', 'health_card'] },
  { label: 'Medical aid document', aliases: ['medical_aid', 'medical aid', 'aid_number'] },
  { label: 'Guardian consent/authorization', aliases: ['guardian_consent', 'consent_form', 'authorization', 'authorisation'] },
] as const

function normalizeParentDocumentRows(rows: ParentDocumentSelectRow[], includeVerificationStatus: boolean): ParentDocumentRow[] {
  return rows.map((row) => ({
    id: row.id,
    doc_type: row.doc_type,
    file_name: row.file_name,
    verification_status: includeVerificationStatus ? row.verification_status ?? null : null,
    created_at: row.created_at,
  }))
}

async function queryParentDocumentsWithSchemaFallback(db: DbClient, parentId: string) {
  const fullSelect = await db
    .from('parent_documents')
    .select('id,doc_type,file_name,verification_status,created_at')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!fullSelect.error) {
    return {
      rows: normalizeParentDocumentRows((fullSelect.data ?? []) as ParentDocumentSelectRow[], true),
      error: null as string | null,
    }
  }

  if (!includesMissingColumnError(fullSelect.error.message)) {
    return { rows: [] as ParentDocumentRow[], error: fullSelect.error.message }
  }

  const leanSelect = await db
    .from('parent_documents')
    .select('id,doc_type,file_name,created_at')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (leanSelect.error) {
    return { rows: [] as ParentDocumentRow[], error: leanSelect.error.message }
  }

  return {
    rows: normalizeParentDocumentRows((leanSelect.data ?? []) as ParentDocumentSelectRow[], false),
    error: null as string | null,
  }
}

async function fetchRelevantDocuments(supabase: DbClient, parentId: string | null) {
  if (!parentId) return { rows: [] as RelevantParentDocument[], warnings: [] as string[] }

  try {
    const admin = createAdminClient()
    const result = await queryParentDocumentsWithSchemaFallback(admin, parentId)
    return {
      rows: toRelevantParentDocuments(result.rows),
      warnings: result.error ? [result.error] : [],
    }
  } catch {
    const fallback = await queryParentDocumentsWithSchemaFallback(supabase, parentId)
    return {
      rows: toRelevantParentDocuments(fallback.rows),
      warnings: fallback.error ? ['Document access is unavailable right now.'] : [],
    }
  }
}

function getDocumentLabel(docType: string | null, fileName: string | null) {
  const haystack = `${clean(docType).toLowerCase()} ${clean(fileName).toLowerCase()}`
  const matched = RELEVANT_DOCUMENT_ALIASES.find((item) => item.aliases.some((alias) => haystack.includes(alias)))
  if (matched) return matched.label
  if (clean(docType)) return toApplicationDocumentLabel(clean(docType).toLowerCase())
  return clean(fileName) || 'Shared document'
}

function isRelevantDocument(docType: string | null, fileName: string | null) {
  const haystack = `${clean(docType).toLowerCase()} ${clean(fileName).toLowerCase()}`
  return RELEVANT_DOCUMENT_ALIASES.some((item) => item.aliases.some((alias) => haystack.includes(alias)))
}

function toRelevantParentDocuments(rows: ParentDocumentRow[]): RelevantParentDocument[] {
  return rows
    .filter((row) => isRelevantDocument(row.doc_type, row.file_name))
    .map((row) => ({
      id: row.id,
      label: getDocumentLabel(row.doc_type, row.file_name),
      fileName: clean(row.file_name) || getDocumentLabel(row.doc_type, row.file_name),
      docType: row.doc_type,
      verificationStatus: row.verification_status,
      createdAt: row.created_at,
      href: `/api/ecd/parent-documents/${row.id}/file`,
    }))
}

function toAddress(parts: Array<string | null | undefined>) {
  return parts.map((part) => clean(part)).filter(Boolean).join(', ') || null
}

function toGuardianContactSnapshot(raw: unknown): GuardianContactSnapshot | null {
  if (!Array.isArray(raw)) return null

  const match = raw.find((entry) => {
    if (!entry || typeof entry !== 'object') return false
    const record = entry as Record<string, unknown>
    return Boolean(clean(String(record.full_name ?? '')) || clean(String(record.phone ?? '')) || clean(String(record.email ?? '')))
  })

  if (!match || typeof match !== 'object') return null

  const record = match as Record<string, unknown>
  return {
    fullName: clean(typeof record.full_name === 'string' ? record.full_name : null) || null,
    relationship: clean(typeof record.relationship === 'string' ? record.relationship : null) || null,
    phone: clean(typeof record.phone === 'string' ? record.phone : null) || null,
    email: clean(typeof record.email === 'string' ? record.email : null) || null,
  }
}

async function fetchParentProfileSnapshot(supabase: DbClient, parentId: string | null) {
  if (!parentId) return null

  const { data, error } = await supabase
    .from('parents')
    .select(
      'id,alt_phone,billing_email,address,suburb,city,province,guardian_relationship,emergency_contact_name,emergency_contact_phone,id_verification_status,user_profiles(full_name,phone)'
    )
    .eq('id', parentId)
    .maybeSingle()

  if (error || !data) return null
  return data as ParentProfileRow
}

function toGuardianStatus(guardian: GuardianLinkRow): 'linked' | 'pending' {
  return guardian.linked_user_id ? 'linked' : 'pending'
}

function toSourceMeta(source: ParentDossier['source']) {
  if (source === 'live') {
    return {
      label: 'Parent profile synced',
      description: 'This contact card is reading live parent details from CentreConnect.',
    }
  }

  if (source === 'guardian_snapshot') {
    return {
      label: 'Saved from child record',
      description: 'The main parent has not shared a live profile here yet, so the centre is seeing the saved contact details from the child record.',
    }
  }

  return {
    label: 'Profile not shared yet',
    description: 'No live parent profile is linked to this child yet. Use the saved guardian details and invite the family to connect their account.',
  }
}

export async function buildParentDossier(input: {
  supabase: DbClient
  ecdId: string
  childId: string
  childName: string
  parentId: string | null
  guardianContacts?: unknown
  parentSnapshot?: ParentProfileRow | null
}) {
  const warnings: string[] = []
  const parentSnapshot = input.parentSnapshot ?? (await fetchParentProfileSnapshot(input.supabase, input.parentId))

  const guardiansQuery = input.parentId
    ? input.supabase
        .from('guardians')
        .select(
          'id,full_name,relationship,phone,email,linked_user_id,invite_sent_at,invite_accepted_at,invite_link_viewed_at,invite_link_clicked_at,invite_registered_at,invite_claimed_at,invite_token_expires_at'
        )
        .eq('child_id', input.childId)
        .eq('parent_id', input.parentId)
        .order('created_at', { ascending: false })
    : input.supabase
        .from('guardians')
        .select(
          'id,full_name,relationship,phone,email,linked_user_id,invite_sent_at,invite_accepted_at,invite_link_viewed_at,invite_link_clicked_at,invite_registered_at,invite_claimed_at,invite_token_expires_at'
        )
        .eq('child_id', input.childId)
        .order('created_at', { ascending: false })

  const [documentsResult, guardiansResult] = await Promise.all([
    fetchRelevantDocuments(input.supabase, input.parentId),
    guardiansQuery,
  ])

  warnings.push(...documentsResult.warnings)
  if (guardiansResult.error?.message) {
    warnings.push(`Unable to load co-parent links right now: ${guardiansResult.error.message}`)
  }

  const guardians = ((guardiansResult.data ?? []) as GuardianLinkRow[]).map((guardian) => guardian)
  const linkedProfileIds = Array.from(
    new Set([input.parentId, ...guardians.map((guardian) => guardian.linked_user_id)].filter((value): value is string => Boolean(value)))
  )

  const linkedProfilesResult =
    linkedProfileIds.length > 0
      ? await input.supabase.from('user_profiles').select('id,full_name').in('id', linkedProfileIds)
      : { data: [] as Array<{ id: string; full_name: string | null }> }
  const linkedProfileRows = (linkedProfilesResult.data ?? []) as Array<{ id: string; full_name: string | null }>
  const linkedProfiles = new Map(linkedProfileRows.map((profile) => [profile.id, clean(profile.full_name) || null] as const))

  const parentProfile = normalizeOne(parentSnapshot?.user_profiles ?? null)
  const guardianSnapshot = toGuardianContactSnapshot(input.guardianContacts)

  const hasLivePrimary = Boolean(
    input.parentId && (
      clean(parentProfile?.full_name) ||
      clean(parentProfile?.phone) ||
      clean(parentSnapshot?.alt_phone) ||
      clean(parentSnapshot?.billing_email) ||
      linkedProfiles.get(input.parentId)
    )
  )

  const source: ParentDossier['source'] = hasLivePrimary
    ? 'live'
    : guardianSnapshot
      ? 'guardian_snapshot'
      : 'missing'

  const sourceMeta = toSourceMeta(source)

  const primaryFullName =
    clean(parentProfile?.full_name) ||
    clean(linkedProfiles.get(input.parentId ?? '') ?? null) ||
    guardianSnapshot?.fullName ||
    'Primary parent not shared yet'

  const primaryPhone = clean(parentProfile?.phone) || guardianSnapshot?.phone || null
  const alternatePhone = clean(parentSnapshot?.alt_phone) || null

  return {
    parentId: input.parentId,
    childId: input.childId,
    childName: input.childName,
    source,
    sourceLabel: sourceMeta.label,
    sourceDescription: sourceMeta.description,
    primaryParent: {
      userId: input.parentId,
      fullName: primaryFullName,
      phone: primaryPhone,
      alternatePhone,
      billingEmail: clean(parentSnapshot?.billing_email) || guardianSnapshot?.email || null,
      relationship: clean(parentSnapshot?.guardian_relationship) || guardianSnapshot?.relationship || null,
      address: toAddress([parentSnapshot?.address, parentSnapshot?.suburb, parentSnapshot?.city, parentSnapshot?.province]),
      emergencyContactName: clean(parentSnapshot?.emergency_contact_name) || null,
      emergencyContactPhone: clean(parentSnapshot?.emergency_contact_phone) || null,
      verificationStatus: clean(parentSnapshot?.id_verification_status) || null,
    },
    coParents: guardians.map((guardian) => ({
      id: guardian.id,
      fullName: clean(linkedProfiles.get(guardian.linked_user_id ?? '') ?? guardian.full_name) || 'Co-parent contact',
      relationship: clean(guardian.relationship) || null,
      phone: clean(guardian.phone) || null,
      email: clean(guardian.email) || null,
      linkedUserId: guardian.linked_user_id,
      status: toGuardianStatus(guardian),
      timeline: {
        sentAt: guardian.invite_sent_at,
        viewedAt: guardian.invite_link_viewed_at,
        clickedAt: guardian.invite_link_clicked_at,
        registeredAt: guardian.invite_registered_at,
        claimedAt: guardian.invite_claimed_at ?? guardian.invite_accepted_at,
        expiresAt: guardian.invite_token_expires_at,
      },
    })),
    documents: documentsResult.rows,
    warnings,
  } satisfies ParentDossier
}

export async function buildParentDossierForChild(input: {
  supabase: DbClient
  ecdId: string
  childId: string
  childName: string
  parentId: string | null
  guardianContacts?: unknown
}) {
  return buildParentDossier({
    supabase: input.supabase,
    ecdId: input.ecdId,
    childId: input.childId,
    childName: input.childName,
    parentId: input.parentId,
    guardianContacts: input.guardianContacts,
  })
}

export async function buildParentDossierForApplication(input: {
  supabase: DbClient
  ecdId: string
  childId: string
  childName: string
  parentId: string | null
  parentSnapshot?: ParentProfileRow | null
}) {
  return buildParentDossier({
    supabase: input.supabase,
    ecdId: input.ecdId,
    childId: input.childId,
    childName: input.childName,
    parentId: input.parentId,
    parentSnapshot: input.parentSnapshot ?? null,
  })
}
