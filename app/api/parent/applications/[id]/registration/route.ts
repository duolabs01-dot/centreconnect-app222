import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import {
  BAJABULILE_REQUIRED_DOCUMENTS,
  buildRegistrationSnapshot,
  mergeRegistrationIntoIntakeDocuments,
  parseListInput,
  type RegistrationFormInitialData,
} from '@/lib/admissions/centre-registration'
import {
  sendEcdInAppAndEmailNotification,
  sendParentInAppAndWhatsappNotification,
} from '@/lib/notifications/multi-channel'
import { createClient } from '@/lib/supabase/server'

const guardianSchema = z.object({
  fullName: z.string().trim().optional().default(''),
  relationship: z.string().trim().optional().default(''),
  idNumber: z.string().trim().optional().default(''),
  phone: z.string().trim().optional().default(''),
  employer: z.string().trim().optional().default(''),
  occupation: z.string().trim().optional().default(''),
  salaryBand: z.string().trim().optional().default(''),
  address: z.string().trim().optional().default(''),
})

const registrationSchema = z.object({
  childFirstName: z.string().trim().min(1, 'Child first name is required'),
  childLastName: z.string().trim().min(1, 'Child surname is required'),
  childDateOfBirth: z.string().trim().min(1, 'Date of birth is required'),
  childGender: z.string().trim().min(1, 'Gender is required'),
  childPhysicalAddress: z.string().trim().min(5, 'Physical address is required'),
  admissionDate: z.string().trim().optional().default(''),
  medicalConditions: z.array(z.string().trim()).default([]),
  childhoodIllnesses: z.array(z.string().trim()).default([]),
  allergies: z.string().trim().optional().default(''),
  doctorName: z.string().trim().optional().default(''),
  medicalAidName: z.string().trim().optional().default(''),
  medicalAidNumber: z.string().trim().optional().default(''),
  healthNotes: z.string().trim().optional().default(''),
  emergencyContactName: z.string().trim().min(1, 'Emergency contact name is required'),
  emergencyContactPhone: z.string().trim().min(5, 'Emergency contact phone is required'),
  authorisedCollectorName: z.string().trim().optional().default(''),
  authorisedCollectorPhone: z.string().trim().optional().default(''),
  authorisedCollectorRelationship: z.string().trim().optional().default(''),
  householdIncomeBand: z.string().trim().optional().default(''),
  primaryGuardian: guardianSchema.extend({
    fullName: z.string().trim().min(1, 'Primary guardian name is required'),
    relationship: z.string().trim().min(1, 'Relationship is required'),
    phone: z.string().trim().min(5, 'Primary guardian phone is required'),
  }),
  secondaryGuardian: guardianSchema,
  requiredDocuments: z.array(z.string().trim()).default([...BAJABULILE_REQUIRED_DOCUMENTS]),
  feeRulesAccepted: z.literal(true, { errorMap: () => ({ message: 'Please confirm the fee rules.' }) }),
  hoursAccepted: z.literal(true, { errorMap: () => ({ message: 'Please confirm the operating hours.' }) }),
  medicalConsentAccepted: z.literal(true, { errorMap: () => ({ message: 'Medical consent is required.' }) }),
  indemnityAccepted: z.literal(true, { errorMap: () => ({ message: 'Indemnity confirmation is required.' }) }),
  agreementAccepted: z.literal(true, { errorMap: () => ({ message: 'Agreement confirmation is required.' }) }),
})

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function clean(value: string | null | undefined) {
  return String(value ?? '').trim()
}

function digitsOnly(value: string | null | undefined) {
  return String(value ?? '').replace(/\D+/g, '')
}

function samePhone(a: string | null | undefined, b: string | null | undefined) {
  const left = digitsOnly(a)
  const right = digitsOnly(b)
  if (left && right) return left === right
  return clean(a) === clean(b)
}

function mergePhones(primaryInput: string | null, secondaryInput: string | null, existingPrimary: string | null, existingAlternate: string | null) {
  const primaryPhone = clean(primaryInput) || clean(existingPrimary) || clean(existingAlternate) || null
  const alternateCandidates = [clean(secondaryInput), clean(existingAlternate), clean(existingPrimary)].filter(Boolean)
  const alternatePhone = alternateCandidates.find((value) => !samePhone(value, primaryPhone)) ?? null
  return { primaryPhone, alternatePhone }
}

function uniqueContacts(entries: Array<Record<string, unknown>>) {
  const seen = new Set<string>()
  return entries.filter((entry) => {
    const name = clean(String(entry.full_name ?? entry.name ?? ''))
    const phone = clean(String(entry.phone ?? ''))
    if (!name && !phone) return false
    const key = `${name.toLowerCase()}::${digitsOnly(phone)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function parsePayload(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return { payload: await request.json(), expectsRedirect: false }
  }

  const formData = await request.formData()
  const text = (key: string) => String(formData.get(key) ?? '').trim()
  const checked = (key: string) => {
    const value = String(formData.get(key) ?? '').trim().toLowerCase()
    return value === 'true' || value === 'on'
  }
  const list = (key: string) => formData.getAll(key).map((entry) => String(entry).trim()).filter(Boolean)

  return {
    expectsRedirect: true,
    payload: {
      childFirstName: text('childFirstName'),
      childLastName: text('childLastName'),
      childDateOfBirth: text('childDateOfBirth'),
      childGender: text('childGender'),
      childPhysicalAddress: text('childPhysicalAddress'),
      admissionDate: text('admissionDate'),
      medicalConditions: list('medicalConditions'),
      childhoodIllnesses: list('childhoodIllnesses'),
      allergies: text('allergies'),
      doctorName: text('doctorName'),
      medicalAidName: text('medicalAidName'),
      medicalAidNumber: text('medicalAidNumber'),
      healthNotes: text('healthNotes'),
      emergencyContactName: text('emergencyContactName'),
      emergencyContactPhone: text('emergencyContactPhone'),
      authorisedCollectorName: text('authorisedCollectorName'),
      authorisedCollectorPhone: text('authorisedCollectorPhone'),
      authorisedCollectorRelationship: text('authorisedCollectorRelationship'),
      householdIncomeBand: text('householdIncomeBand'),
      primaryGuardian: {
        fullName: text('primaryGuardianFullName'),
        relationship: text('primaryGuardianRelationship'),
        idNumber: text('primaryGuardianIdNumber'),
        phone: text('primaryGuardianPhone'),
        employer: text('primaryGuardianEmployer'),
        occupation: text('primaryGuardianOccupation'),
        salaryBand: text('primaryGuardianSalaryBand'),
        address: text('primaryGuardianAddress'),
      },
      secondaryGuardian: {
        fullName: text('secondaryGuardianFullName'),
        relationship: text('secondaryGuardianRelationship'),
        idNumber: text('secondaryGuardianIdNumber'),
        phone: text('secondaryGuardianPhone'),
        employer: text('secondaryGuardianEmployer'),
        occupation: text('secondaryGuardianOccupation'),
        salaryBand: text('secondaryGuardianSalaryBand'),
        address: text('secondaryGuardianAddress'),
      },
      requiredDocuments: list('requiredDocuments'),
      feeRulesAccepted: checked('feeRulesAccepted'),
      hoursAccepted: checked('hoursAccepted'),
      medicalConsentAccepted: checked('medicalConsentAccepted'),
      indemnityAccepted: checked('indemnityAccepted'),
      agreementAccepted: checked('agreementAccepted'),
    },
  }
}

function errorResponse(expectsRedirect: boolean, request: Request, applicationId: string, error: string, status: number) {
  if (!expectsRedirect) return NextResponse.json({ error }, { status })
  const url = new URL(`/parent/applications/${applicationId}/registration?error=${encodeURIComponent(error)}`, request.url)
  return NextResponse.redirect(url, { status: 303 })
}

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: applicationId } = await context.params
    const { payload: rawPayload, expectsRedirect } = await parsePayload(request)
    const parsed = registrationSchema.safeParse(rawPayload)
    if (!parsed.success) {
      return errorResponse(expectsRedirect, request, applicationId, parsed.error.issues[0]?.message || 'Invalid registration form', 400)
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse(expectsRedirect, request, applicationId, 'Unauthorized', 401)
    }

    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .select('id,status,offer_accepted_at,start_date,ecd_id,parent_id,child_id,children(id,intake_documents,guardian_contacts,emergency_contacts,allergies,medical_conditions,doctor_name,medical_aid_number,emergency_contact_name,emergency_contact_phone,special_needs_notes),parents(id,alt_phone,guardian_relationship,emergency_contact_name,emergency_contact_phone,medical_aid_name,medical_aid_number,address,user_profiles(full_name,phone)),ecd_centres(name,email)')
      .eq('id', applicationId)
      .eq('parent_id', user.id)
      .maybeSingle()

    if (applicationError || !application) {
      return errorResponse(expectsRedirect, request, applicationId, 'Application not found', 404)
    }

    if (application.status !== 'enrolled' && !application.offer_accepted_at) {
      return errorResponse(expectsRedirect, request, applicationId, 'Registration opens after enrollment is confirmed.', 400)
    }

    const child = normalizeOne((application as any).children) as Record<string, unknown> | null
    const parent = normalizeOne((application as any).parents) as Record<string, unknown> | null
    const parentProfile = normalizeOne((parent?.user_profiles ?? null) as any) as Record<string, unknown> | null
    const centre = normalizeOne((application as any).ecd_centres) as Record<string, unknown> | null
    if (!child || !parent) {
      return errorResponse(expectsRedirect, request, applicationId, 'Registration details are incomplete for this application.', 400)
    }

    const payload = parsed.data
    const { primaryPhone, alternatePhone } = mergePhones(payload.primaryGuardian.phone, payload.secondaryGuardian.phone, clean(parentProfile?.phone as string | null), clean(parent?.alt_phone as string | null))

    const registrationSnapshot = buildRegistrationSnapshot({
      childPhysicalAddress: payload.childPhysicalAddress,
      admissionDate: payload.admissionDate,
      medicalConditions: payload.medicalConditions,
      childhoodIllnesses: payload.childhoodIllnesses,
      allergies: payload.allergies,
      doctorName: payload.doctorName,
      medicalAidName: payload.medicalAidName,
      medicalAidNumber: payload.medicalAidNumber,
      healthNotes: payload.healthNotes,
      emergencyContactName: payload.emergencyContactName,
      emergencyContactPhone: payload.emergencyContactPhone,
      authorisedCollectorName: payload.authorisedCollectorName,
      authorisedCollectorPhone: payload.authorisedCollectorPhone,
      authorisedCollectorRelationship: payload.authorisedCollectorRelationship,
      householdIncomeBand: payload.householdIncomeBand as RegistrationFormInitialData['householdIncomeBand'],
      primaryGuardianName: payload.primaryGuardian.fullName,
      primaryGuardianRelationship: payload.primaryGuardian.relationship,
      primaryGuardianIdNumber: payload.primaryGuardian.idNumber,
      primaryGuardianPhone: payload.primaryGuardian.phone,
      primaryGuardianEmployer: payload.primaryGuardian.employer,
      primaryGuardianOccupation: payload.primaryGuardian.occupation,
      primaryGuardianSalaryBand: payload.primaryGuardian.salaryBand as RegistrationFormInitialData['primaryGuardianSalaryBand'],
      primaryGuardianAddress: payload.primaryGuardian.address,
      secondaryGuardianName: payload.secondaryGuardian.fullName,
      secondaryGuardianRelationship: payload.secondaryGuardian.relationship,
      secondaryGuardianIdNumber: payload.secondaryGuardian.idNumber,
      secondaryGuardianPhone: payload.secondaryGuardian.phone,
      secondaryGuardianEmployer: payload.secondaryGuardian.employer,
      secondaryGuardianOccupation: payload.secondaryGuardian.occupation,
      secondaryGuardianSalaryBand: payload.secondaryGuardian.salaryBand as RegistrationFormInitialData['secondaryGuardianSalaryBand'],
      secondaryGuardianAddress: payload.secondaryGuardian.address,
      feeRulesAccepted: payload.feeRulesAccepted,
      hoursAccepted: payload.hoursAccepted,
      medicalConsentAccepted: payload.medicalConsentAccepted,
      indemnityAccepted: payload.indemnityAccepted,
      agreementAccepted: payload.agreementAccepted,
      requiredDocuments: payload.requiredDocuments.length > 0 ? payload.requiredDocuments : [...BAJABULILE_REQUIRED_DOCUMENTS],
    }, clean(centre?.name as string | null) || 'your centre')

    const nextIntakeDocuments = mergeRegistrationIntoIntakeDocuments(child.intake_documents, registrationSnapshot)
    const guardianContacts = uniqueContacts([
      { full_name: payload.primaryGuardian.fullName, relationship: payload.primaryGuardian.relationship, phone: primaryPhone, id_number: payload.primaryGuardian.idNumber, employer: payload.primaryGuardian.employer, occupation: payload.primaryGuardian.occupation, salary_band: payload.primaryGuardian.salaryBand, address: payload.primaryGuardian.address, is_primary: true },
      { full_name: payload.secondaryGuardian.fullName, relationship: payload.secondaryGuardian.relationship, phone: alternatePhone, id_number: payload.secondaryGuardian.idNumber, employer: payload.secondaryGuardian.employer, occupation: payload.secondaryGuardian.occupation, salary_band: payload.secondaryGuardian.salaryBand, address: payload.secondaryGuardian.address, is_primary: false },
    ])
    const emergencyContacts = uniqueContacts([
      { full_name: payload.emergencyContactName, phone: payload.emergencyContactPhone, relationship: 'Emergency contact', type: 'emergency' },
      { full_name: payload.authorisedCollectorName, phone: payload.authorisedCollectorPhone, relationship: payload.authorisedCollectorRelationship, type: 'authorised_collector' },
    ])

    const [userProfileResult, parentResult, childResult, applicationResult] = await Promise.all([
      supabase.from('user_profiles').update({ full_name: payload.primaryGuardian.fullName, phone: primaryPhone }).eq('id', user.id),
      supabase.from('parents').update({ guardian_relationship: payload.primaryGuardian.relationship, emergency_contact_name: payload.emergencyContactName, emergency_contact_phone: payload.emergencyContactPhone, medical_aid_name: clean(payload.medicalAidName) || null, medical_aid_number: clean(payload.medicalAidNumber) || null, address: clean(payload.primaryGuardian.address) || clean(payload.childPhysicalAddress) || clean(parent.address as string | null) || null, alt_phone: alternatePhone }).eq('id', user.id),
      supabase.from('children').update({ first_name: payload.childFirstName, last_name: payload.childLastName, date_of_birth: payload.childDateOfBirth, gender: payload.childGender, allergies: parseListInput(payload.allergies), medical_conditions: payload.medicalConditions, doctor_name: clean(payload.doctorName) || null, medical_aid_number: clean(payload.medicalAidNumber) || null, emergency_contact_name: payload.emergencyContactName, emergency_contact_phone: payload.emergencyContactPhone, special_needs_notes: clean(payload.healthNotes) || null, guardian_contacts: guardianContacts, emergency_contacts: emergencyContacts, intake_documents: nextIntakeDocuments }).eq('id', String(child.id)),
      supabase.from('applications').update({ start_date: clean(payload.admissionDate) || application.start_date || null }).eq('id', applicationId).eq('parent_id', user.id),
    ])

    const failedResult = [userProfileResult, parentResult, childResult, applicationResult].find((result) => result.error)
    if (failedResult?.error) {
      return errorResponse(expectsRedirect, request, applicationId, failedResult.error.message || 'Failed to save registration form', 400)
    }

    const centreName = clean(centre?.name as string | null) || 'your centre'
    const childName = `${payload.childFirstName} ${payload.childLastName}`.trim()
    await sendParentInAppAndWhatsappNotification(supabase as any, { parent_id: user.id, ecd_id: application.ecd_id, application_id: applicationId, template_key: 'registration_completed', title: 'Registration form received', message: `${centreName} now has ${childName}'s registration details. CentreConnect will keep the next updates in one place for you.`, parent_phone: primaryPhone, recipient_name: payload.primaryGuardian.fullName, whatsapp_event_type: 'application_status_change', whatsapp_event_key: `application_status_change:registration_completed:${applicationId}:${user.id}`, whatsapp_metadata: { centre_name: centreName, child_name: childName }, is_read: false })
    await sendEcdInAppAndEmailNotification(supabase as any, { ecd_id: application.ecd_id, application_id: applicationId, title: 'Registration form submitted', message: `${childName}'s parent completed the registration form in CentreConnect.`, metadata: { kind: 'registration_completed', application_id: applicationId, child_name: childName }, email_recipient: clean(centre?.email as string | null) || null, email_subject: `[CentreConnect] Registration form received for ${childName}`, email_body: `<p>${childName}'s parent completed the registration form in <strong>CentreConnect</strong>.</p><p>Open Admissions to review the final details.</p>` })

    revalidatePath('/parent/applications')
    revalidatePath(`/parent/applications/${applicationId}`)
    revalidatePath('/parent/dashboard')
    revalidatePath(`/ecd/applications/${applicationId}`)
    revalidatePath('/ecd/applications')

    if (!expectsRedirect) {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.redirect(new URL(`/parent/applications/${applicationId}?registration=done`, request.url), { status: 303 })
  } catch (error) {
    console.error('[parent-registration] Failed to save registration form:', error)
    return NextResponse.json({ error: 'Failed to save registration form' }, { status: 500 })
  }
}

