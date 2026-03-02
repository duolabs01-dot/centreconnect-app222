type NullableString = string | null | undefined

export type ApplicationDocumentCode =
  | 'parent_id'
  | 'proof_of_address'
  | 'birth_certificate'
  | 'immunization_record'
  | 'medical_certificate'
  | 'medical_aid'
  | 'guardian_consent'

type RequiredApplicationDocument = {
  code: ApplicationDocumentCode
  label: string
  aliases: string[]
}

const REQUIRED_APPLICATION_DOCUMENTS: RequiredApplicationDocument[] = [
  {
    code: 'parent_id',
    label: 'Parent ID document',
    aliases: ['parent_id', 'id_document', 'identity', 'passport'],
  },
  {
    code: 'proof_of_address',
    label: 'Proof of address',
    aliases: ['proof_of_address', 'address_proof', 'utility_bill', 'proof address'],
  },
  {
    code: 'birth_certificate',
    label: 'Birth certificate',
    aliases: ['birth_certificate', 'birth cert', 'birth'],
  },
  {
    code: 'immunization_record',
    label: 'Immunization record',
    aliases: ['immunization_record', 'immunisation_record', 'vaccine', 'road_to_health'],
  },
  {
    code: 'medical_certificate',
    label: 'Medical certificate/card',
    aliases: ['medical_certificate', 'medical_card', 'clinic_card', 'health_card'],
  },
  {
    code: 'medical_aid',
    label: 'Medical aid document',
    aliases: ['medical_aid', 'medical aid', 'aid_number'],
  },
  {
    code: 'guardian_consent',
    label: 'Guardian consent/authorization',
    aliases: ['guardian_consent', 'consent_form', 'authorization', 'authorisation'],
  },
]

function normalizeDocType(value: NullableString) {
  return String(value ?? '').trim().toLowerCase()
}

function matchesAlias(docType: string, alias: string) {
  return docType === alias || docType.includes(alias)
}

function hasRequirement(docTypes: string[], aliases: string[]) {
  return docTypes.some((docType) => aliases.some((alias) => matchesAlias(docType, alias)))
}

export type ApplicationDocumentChecklistResult = {
  uploadedCount: number
  totalRequired: number
  missingCodes: ApplicationDocumentCode[]
  missingLabels: string[]
}

export function evaluateApplicationDocumentChecklist(
  docTypes: Array<NullableString>
): ApplicationDocumentChecklistResult {
  const normalized = docTypes.map(normalizeDocType).filter(Boolean)

  const completed = REQUIRED_APPLICATION_DOCUMENTS.filter((document) =>
    hasRequirement(normalized, document.aliases)
  )
  const missing = REQUIRED_APPLICATION_DOCUMENTS.filter(
    (document) => !hasRequirement(normalized, document.aliases)
  )

  return {
    uploadedCount: completed.length,
    totalRequired: REQUIRED_APPLICATION_DOCUMENTS.length,
    missingCodes: missing.map((document) => document.code),
    missingLabels: missing.map((document) => document.label),
  }
}

export function toApplicationDocumentLabel(code: string) {
  const found = REQUIRED_APPLICATION_DOCUMENTS.find((document) => document.code === code)
  if (found) return found.label
  return code.replaceAll('_', ' ')
}

export function toApplicationDocumentLabels(codes: string[]) {
  return codes.map((code) => toApplicationDocumentLabel(code))
}

