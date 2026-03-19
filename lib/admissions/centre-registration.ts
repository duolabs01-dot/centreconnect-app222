import type { DsdExportData } from '@/lib/ecd/dsd-export'

export const BAJABULILE_REGISTRATION_VERSION = 'bajabulile-registration-2025'

export const BAJABULILE_MEDICAL_CONDITIONS = [
  'Epilepsy',
  'Asthma',
  'Diabetes',
  'Migraines',
] as const

export const BAJABULILE_CHILDHOOD_ILLNESSES = [
  'Chicken Pox',
  'Measles',
  'German Measles',
  'Rosella',
  'Polio',
  'TB',
  'Hepatitis',
  'Mumps',
  'Whooping Cough',
  'Tetanus',
  'HIB Disease',
] as const

export const BAJABULILE_REQUIRED_DOCUMENTS = [
  'Copy of Birth Certificate',
  'Copy of Health Card',
  'Parent ID Copy',
  'Child ID Photo',
  'Proof of Address',
] as const

export const HOUSEHOLD_INCOME_BANDS = [
  'R0 - R3K',
  'R3K - R5K',
  'R5K - R8K',
  'R8K - R10K',
  'R10K and above',
] as const

export type HouseholdIncomeBand = (typeof HOUSEHOLD_INCOME_BANDS)[number]

export type RegistrationGuardian = {
  fullName: string
  relationship: string
  idNumber: string
  phone: string
  employer: string
  occupation: string
  salaryBand: HouseholdIncomeBand | ''
  address: string
}

export type RegistrationFormSnapshot = {
  version: string
  submittedAt: string
  centreName: string
  childPhysicalAddress: string
  admissionDate: string | null
  medicalConditions: string[]
  childhoodIllnesses: string[]
  allergies: string[]
  doctorName: string
  medicalAidName: string
  medicalAidNumber: string
  healthNotes: string
  emergencyContactName: string
  emergencyContactPhone: string
  authorisedCollectorName: string
  authorisedCollectorPhone: string
  authorisedCollectorRelationship: string
  householdIncomeBand: HouseholdIncomeBand | ''
  primaryGuardian: RegistrationGuardian
  secondaryGuardian: RegistrationGuardian | null
  requiredDocuments: string[]
  feeRulesAccepted: boolean
  hoursAccepted: boolean
  medicalConsentAccepted: boolean
  indemnityAccepted: boolean
  agreementAccepted: boolean
}

export type RegistrationFormInitialData = {
  childPhysicalAddress: string
  admissionDate: string
  medicalConditions: string[]
  childhoodIllnesses: string[]
  allergies: string
  doctorName: string
  medicalAidName: string
  medicalAidNumber: string
  healthNotes: string
  emergencyContactName: string
  emergencyContactPhone: string
  authorisedCollectorName: string
  authorisedCollectorPhone: string
  authorisedCollectorRelationship: string
  householdIncomeBand: HouseholdIncomeBand | ''
  primaryGuardianName: string
  primaryGuardianRelationship: string
  primaryGuardianIdNumber: string
  primaryGuardianPhone: string
  primaryGuardianEmployer: string
  primaryGuardianOccupation: string
  primaryGuardianSalaryBand: HouseholdIncomeBand | ''
  primaryGuardianAddress: string
  secondaryGuardianName: string
  secondaryGuardianRelationship: string
  secondaryGuardianIdNumber: string
  secondaryGuardianPhone: string
  secondaryGuardianEmployer: string
  secondaryGuardianOccupation: string
  secondaryGuardianSalaryBand: HouseholdIncomeBand | ''
  secondaryGuardianAddress: string
  feeRulesAccepted: boolean
  hoursAccepted: boolean
  medicalConsentAccepted: boolean
  indemnityAccepted: boolean
  agreementAccepted: boolean
  requiredDocuments: string[]
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function toTextList(value: unknown) {
  if (!Array.isArray(value)) return [] as string[]
  return value.map((entry) => clean(entry)).filter(Boolean)
}

function toGuardian(value: unknown): RegistrationGuardian | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  return {
    fullName: clean(record.fullName),
    relationship: clean(record.relationship),
    idNumber: clean(record.idNumber),
    phone: clean(record.phone),
    employer: clean(record.employer),
    occupation: clean(record.occupation),
    salaryBand: clean(record.salaryBand) as HouseholdIncomeBand | '',
    address: clean(record.address),
  }
}

export function parseListInput(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function getRegistrationSnapshot(intakeDocuments: unknown): RegistrationFormSnapshot | null {
  if (!intakeDocuments || typeof intakeDocuments !== 'object') return null
  const registration = (intakeDocuments as Record<string, unknown>).registration_form
  if (!registration || typeof registration !== 'object') return null

  const record = registration as Record<string, unknown>
  const primaryGuardian = toGuardian(record.primaryGuardian)
  if (!primaryGuardian) return null

  const secondaryGuardian = toGuardian(record.secondaryGuardian)

  return {
    version: clean(record.version) || BAJABULILE_REGISTRATION_VERSION,
    submittedAt: clean(record.submittedAt),
    centreName: clean(record.centreName),
    childPhysicalAddress: clean(record.childPhysicalAddress),
    admissionDate: clean(record.admissionDate) || null,
    medicalConditions: toTextList(record.medicalConditions),
    childhoodIllnesses: toTextList(record.childhoodIllnesses),
    allergies: toTextList(record.allergies),
    doctorName: clean(record.doctorName),
    medicalAidName: clean(record.medicalAidName),
    medicalAidNumber: clean(record.medicalAidNumber),
    healthNotes: clean(record.healthNotes),
    emergencyContactName: clean(record.emergencyContactName),
    emergencyContactPhone: clean(record.emergencyContactPhone),
    authorisedCollectorName: clean(record.authorisedCollectorName),
    authorisedCollectorPhone: clean(record.authorisedCollectorPhone),
    authorisedCollectorRelationship: clean(record.authorisedCollectorRelationship),
    householdIncomeBand: clean(record.householdIncomeBand) as HouseholdIncomeBand | '',
    primaryGuardian,
    secondaryGuardian: secondaryGuardian && Object.values(secondaryGuardian).some(Boolean) ? secondaryGuardian : null,
    requiredDocuments: toTextList(record.requiredDocuments),
    feeRulesAccepted: record.feeRulesAccepted === true,
    hoursAccepted: record.hoursAccepted === true,
    medicalConsentAccepted: record.medicalConsentAccepted === true,
    indemnityAccepted: record.indemnityAccepted === true,
    agreementAccepted: record.agreementAccepted === true,
  }
}

export function hasSubmittedRegistrationSnapshot(intakeDocuments: unknown) {
  const snapshot = getRegistrationSnapshot(intakeDocuments)
  return Boolean(snapshot?.submittedAt)
}

export function buildRegistrationSnapshot(input: RegistrationFormInitialData, centreName: string): RegistrationFormSnapshot {
  const primaryGuardian: RegistrationGuardian = {
    fullName: input.primaryGuardianName.trim(),
    relationship: input.primaryGuardianRelationship.trim(),
    idNumber: input.primaryGuardianIdNumber.trim(),
    phone: input.primaryGuardianPhone.trim(),
    employer: input.primaryGuardianEmployer.trim(),
    occupation: input.primaryGuardianOccupation.trim(),
    salaryBand: input.primaryGuardianSalaryBand,
    address: input.primaryGuardianAddress.trim(),
  }

  const secondaryGuardian = [
    input.secondaryGuardianName,
    input.secondaryGuardianRelationship,
    input.secondaryGuardianIdNumber,
    input.secondaryGuardianPhone,
    input.secondaryGuardianEmployer,
    input.secondaryGuardianOccupation,
    input.secondaryGuardianAddress,
    input.secondaryGuardianSalaryBand,
  ].some((value) => clean(value))
    ? {
        fullName: input.secondaryGuardianName.trim(),
        relationship: input.secondaryGuardianRelationship.trim(),
        idNumber: input.secondaryGuardianIdNumber.trim(),
        phone: input.secondaryGuardianPhone.trim(),
        employer: input.secondaryGuardianEmployer.trim(),
        occupation: input.secondaryGuardianOccupation.trim(),
        salaryBand: input.secondaryGuardianSalaryBand,
        address: input.secondaryGuardianAddress.trim(),
      }
    : null

  return {
    version: BAJABULILE_REGISTRATION_VERSION,
    submittedAt: new Date().toISOString(),
    centreName,
    childPhysicalAddress: input.childPhysicalAddress.trim(),
    admissionDate: clean(input.admissionDate) || null,
    medicalConditions: input.medicalConditions.map((entry) => entry.trim()).filter(Boolean),
    childhoodIllnesses: input.childhoodIllnesses.map((entry) => entry.trim()).filter(Boolean),
    allergies: parseListInput(input.allergies),
    doctorName: input.doctorName.trim(),
    medicalAidName: input.medicalAidName.trim(),
    medicalAidNumber: input.medicalAidNumber.trim(),
    healthNotes: input.healthNotes.trim(),
    emergencyContactName: input.emergencyContactName.trim(),
    emergencyContactPhone: input.emergencyContactPhone.trim(),
    authorisedCollectorName: input.authorisedCollectorName.trim(),
    authorisedCollectorPhone: input.authorisedCollectorPhone.trim(),
    authorisedCollectorRelationship: input.authorisedCollectorRelationship.trim(),
    householdIncomeBand: input.householdIncomeBand,
    primaryGuardian,
    secondaryGuardian,
    requiredDocuments: input.requiredDocuments.map((entry) => entry.trim()).filter(Boolean),
    feeRulesAccepted: input.feeRulesAccepted,
    hoursAccepted: input.hoursAccepted,
    medicalConsentAccepted: input.medicalConsentAccepted,
    indemnityAccepted: input.indemnityAccepted,
    agreementAccepted: input.agreementAccepted,
  }
}

export function mergeRegistrationIntoIntakeDocuments(intakeDocuments: unknown, snapshot: RegistrationFormSnapshot) {
  const current = intakeDocuments && typeof intakeDocuments === 'object' && !Array.isArray(intakeDocuments)
    ? { ...(intakeDocuments as Record<string, unknown>) }
    : {}

  return {
    ...current,
    registration_form: snapshot,
  }
}

export function buildRegistrationFormInitialData(input: {
  centreName: string
  snapshot: RegistrationFormSnapshot | null
  parentName: string
  parentPhone: string
  alternatePhone: string
  guardianRelationship: string
  emergencyContactName: string
  emergencyContactPhone: string
  childAddress: string
  admissionDate: string | null
  allergies: string[]
  medicalConditions: string[]
  doctorName: string
  medicalAidName: string
  medicalAidNumber: string
  healthNotes: string
}): RegistrationFormInitialData {
  const snapshot = input.snapshot
  const primaryGuardian = snapshot?.primaryGuardian
  const secondaryGuardian = snapshot?.secondaryGuardian

  return {
    childPhysicalAddress: snapshot?.childPhysicalAddress ?? input.childAddress,
    admissionDate: snapshot?.admissionDate ?? input.admissionDate ?? '',
    medicalConditions: snapshot?.medicalConditions ?? input.medicalConditions,
    childhoodIllnesses: snapshot?.childhoodIllnesses ?? [],
    allergies: (snapshot?.allergies ?? input.allergies).join(', '),
    doctorName: snapshot?.doctorName ?? input.doctorName,
    medicalAidName: snapshot?.medicalAidName ?? input.medicalAidName,
    medicalAidNumber: snapshot?.medicalAidNumber ?? input.medicalAidNumber,
    healthNotes: snapshot?.healthNotes ?? input.healthNotes,
    emergencyContactName: snapshot?.emergencyContactName ?? input.emergencyContactName,
    emergencyContactPhone: snapshot?.emergencyContactPhone ?? input.emergencyContactPhone,
    authorisedCollectorName: snapshot?.authorisedCollectorName ?? '',
    authorisedCollectorPhone: snapshot?.authorisedCollectorPhone ?? '',
    authorisedCollectorRelationship: snapshot?.authorisedCollectorRelationship ?? '',
    householdIncomeBand: snapshot?.householdIncomeBand ?? '',
    primaryGuardianName: primaryGuardian?.fullName ?? input.parentName,
    primaryGuardianRelationship: primaryGuardian?.relationship ?? input.guardianRelationship,
    primaryGuardianIdNumber: primaryGuardian?.idNumber ?? '',
    primaryGuardianPhone: primaryGuardian?.phone ?? input.parentPhone,
    primaryGuardianEmployer: primaryGuardian?.employer ?? '',
    primaryGuardianOccupation: primaryGuardian?.occupation ?? '',
    primaryGuardianSalaryBand: primaryGuardian?.salaryBand ?? '',
    primaryGuardianAddress: primaryGuardian?.address ?? input.childAddress,
    secondaryGuardianName: secondaryGuardian?.fullName ?? '',
    secondaryGuardianRelationship: secondaryGuardian?.relationship ?? '',
    secondaryGuardianIdNumber: secondaryGuardian?.idNumber ?? '',
    secondaryGuardianPhone: secondaryGuardian?.phone ?? input.alternatePhone,
    secondaryGuardianEmployer: secondaryGuardian?.employer ?? '',
    secondaryGuardianOccupation: secondaryGuardian?.occupation ?? '',
    secondaryGuardianSalaryBand: secondaryGuardian?.salaryBand ?? '',
    secondaryGuardianAddress: secondaryGuardian?.address ?? '',
    feeRulesAccepted: snapshot?.feeRulesAccepted ?? false,
    hoursAccepted: snapshot?.hoursAccepted ?? false,
    medicalConsentAccepted: snapshot?.medicalConsentAccepted ?? false,
    indemnityAccepted: snapshot?.indemnityAccepted ?? false,
    agreementAccepted: snapshot?.agreementAccepted ?? false,
    requiredDocuments: snapshot?.requiredDocuments ?? [...BAJABULILE_REQUIRED_DOCUMENTS],
  }
}

export function buildRegistrationStatusLabel(snapshot: RegistrationFormSnapshot | null) {
  if (!snapshot?.submittedAt) return 'Registration form pending'
  return `Registration submitted ${new Date(snapshot.submittedAt).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`
}

export function buildDsdRegistrationTitle(data: Pick<DsdExportData, 'centreName'>) {
  return `Monthly Report ${data.centreName}`
}
