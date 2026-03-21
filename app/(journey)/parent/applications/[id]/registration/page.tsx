import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import {
  BAJABULILE_CHILDHOOD_ILLNESSES,
  BAJABULILE_MEDICAL_CONDITIONS,
  BAJABULILE_REQUIRED_DOCUMENTS,
  HOUSEHOLD_INCOME_BANDS,
  buildRegistrationFormInitialData,
  getRegistrationSnapshot,
} from '@/lib/admissions/centre-registration'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type PageProps = {
  params: Promise<{ id: string }>
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function clean(value: string | null | undefined) {
  return String(value ?? '').trim()
}

export default async function ParentApplicationRegistrationPage({ params }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: application } = await supabase
    .from('applications')
    .select('id,status,offer_accepted_at,start_date,ecd_centres(name,suburb),children(id,first_name,last_name,date_of_birth,gender,allergies,medical_conditions,doctor_name,medical_aid_number,emergency_contact_name,emergency_contact_phone,special_needs_notes,intake_documents),parents(alt_phone,guardian_relationship,emergency_contact_name,emergency_contact_phone,medical_aid_name,medical_aid_number,address,user_profiles(full_name,phone))')
    .eq('id', (await params).id)
    .eq('parent_id', user.id)
    .maybeSingle()

  if (!application) notFound()
  if (application.status !== 'enrolled' && !application.offer_accepted_at) redirect(`/parent/applications/${(await params).id}`)

  const centre = normalizeOne((application as any).ecd_centres)
  const child = normalizeOne((application as any).children)
  const parent = normalizeOne((application as any).parents)
  const parentProfile = normalizeOne((parent?.user_profiles ?? null) as any)

  if (!child || !parent) notFound()

  const snapshot = getRegistrationSnapshot(child.intake_documents)
  const initial = buildRegistrationFormInitialData({
    centreName: clean(centre?.name) || 'your centre',
    snapshot,
    parentName: clean(parentProfile?.full_name) || 'Parent',
    parentPhone: clean(parentProfile?.phone),
    alternatePhone: clean(parent.alt_phone),
    guardianRelationship: clean(parent.guardian_relationship),
    emergencyContactName: clean(child.emergency_contact_name) || clean(parent.emergency_contact_name),
    emergencyContactPhone: clean(child.emergency_contact_phone) || clean(parent.emergency_contact_phone),
    childAddress: clean(parent.address),
    admissionDate: application.start_date,
    allergies: Array.isArray(child.allergies) ? child.allergies : [],
    medicalConditions: Array.isArray(child.medical_conditions) ? child.medical_conditions : [],
    doctorName: clean(child.doctor_name),
    medicalAidName: clean(parent.medical_aid_name),
    medicalAidNumber: clean(child.medical_aid_number) || clean(parent.medical_aid_number),
    healthNotes: clean(child.special_needs_notes),
  })

  const centreName = clean(centre?.name) || 'Bajabulile Day Care Centre'
  const childName = `${clean(child.first_name)} ${clean(child.last_name)}`.trim() || 'your child'
  const submittedAt = snapshot?.submittedAt
  const submittedLabel = submittedAt
    ? new Date(submittedAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <main className="min-h-screen bg-surface-secondary pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href={`/parent/applications/${(await params).id}`} className="inline-flex items-center gap-2 font-semibold text-emerald-700 hover:text-emerald-800">
            <ArrowLeft className="h-4 w-4" />
            Back to application
          </Link>
          {submittedLabel ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Submitted {submittedLabel}</span> : null}
        </div>

        <section className="rounded-[2.2rem] border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">After acceptance</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Registration Form {centreName}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{centreName} accepted {childName}. Complete this once so the centre has the health, emergency, and guardian details they need from day one.</p>
        </section>

        <form action={`/api/parent/applications/${(await params).id}/registration`} method="post" className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Learner details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="childFirstName">First name</Label><Input id="childFirstName" name="childFirstName" defaultValue={clean(child.first_name)} /></div>
              <div className="space-y-2"><Label htmlFor="childLastName">Surname</Label><Input id="childLastName" name="childLastName" defaultValue={clean(child.last_name)} /></div>
              <div className="space-y-2"><Label htmlFor="childDateOfBirth">Date of birth</Label><Input id="childDateOfBirth" name="childDateOfBirth" type="date" defaultValue={child.date_of_birth ?? ''} /></div>
              <div className="space-y-2"><Label htmlFor="childGender">Gender</Label><select id="childGender" name="childGender" defaultValue={clean(child.gender)} className="cc-native-field h-11 rounded-2xl px-3 text-sm"><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1.4fr_0.6fr]">
              <div className="space-y-2"><Label htmlFor="childPhysicalAddress">Physical address</Label><Textarea id="childPhysicalAddress" name="childPhysicalAddress" defaultValue={initial.childPhysicalAddress} /></div>
              <div className="space-y-2"><Label htmlFor="admissionDate">Admission date</Label><Input id="admissionDate" name="admissionDate" type="date" defaultValue={initial.admissionDate} /></div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Medical history</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {BAJABULILE_MEDICAL_CONDITIONS.map((condition) => <label key={condition} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"><input type="checkbox" name="medicalConditions" value={condition} defaultChecked={initial.medicalConditions.includes(condition)} /> <span>{condition}</span></label>)}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {BAJABULILE_CHILDHOOD_ILLNESSES.map((illness) => <label key={illness} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"><input type="checkbox" name="childhoodIllnesses" value={illness} defaultChecked={initial.childhoodIllnesses.includes(illness)} /> <span>{illness}</span></label>)}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="allergies">Allergies</Label><Textarea id="allergies" name="allergies" defaultValue={initial.allergies} /></div><div className="space-y-2"><Label htmlFor="healthNotes">Health notes</Label><Textarea id="healthNotes" name="healthNotes" defaultValue={initial.healthNotes} /></div></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="doctorName">Doctor / clinic</Label><Input id="doctorName" name="doctorName" defaultValue={initial.doctorName} /></div><div className="space-y-2"><Label htmlFor="medicalAidName">Medical aid</Label><Input id="medicalAidName" name="medicalAidName" defaultValue={initial.medicalAidName} /></div><div className="space-y-2"><Label htmlFor="medicalAidNumber">Medical aid number</Label><Input id="medicalAidNumber" name="medicalAidNumber" defaultValue={initial.medicalAidNumber} /></div></div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Emergency and collection</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="emergencyContactName">Emergency contact name</Label><Input id="emergencyContactName" name="emergencyContactName" defaultValue={initial.emergencyContactName} /></div><div className="space-y-2"><Label htmlFor="emergencyContactPhone">Emergency contact phone</Label><Input id="emergencyContactPhone" name="emergencyContactPhone" defaultValue={initial.emergencyContactPhone} /></div><div className="space-y-2"><Label htmlFor="authorisedCollectorName">Person collecting the child</Label><Input id="authorisedCollectorName" name="authorisedCollectorName" defaultValue={initial.authorisedCollectorName} /></div><div className="space-y-2"><Label htmlFor="authorisedCollectorPhone">Collector phone</Label><Input id="authorisedCollectorPhone" name="authorisedCollectorPhone" defaultValue={initial.authorisedCollectorPhone} /></div></div>
            <div className="mt-4 space-y-2"><Label htmlFor="authorisedCollectorRelationship">Collector relationship</Label><Input id="authorisedCollectorRelationship" name="authorisedCollectorRelationship" defaultValue={initial.authorisedCollectorRelationship} /></div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Parents and guardians</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="primaryGuardianFullName">Primary guardian name</Label><Input id="primaryGuardianFullName" name="primaryGuardianFullName" defaultValue={initial.primaryGuardianName} /></div>
              <div className="space-y-2"><Label htmlFor="primaryGuardianRelationship">Relationship</Label><Input id="primaryGuardianRelationship" name="primaryGuardianRelationship" defaultValue={initial.primaryGuardianRelationship} /></div>
              <div className="space-y-2"><Label htmlFor="primaryGuardianPhone">Phone</Label><Input id="primaryGuardianPhone" name="primaryGuardianPhone" defaultValue={initial.primaryGuardianPhone} /></div>
              <div className="space-y-2"><Label htmlFor="primaryGuardianIdNumber">ID number</Label><Input id="primaryGuardianIdNumber" name="primaryGuardianIdNumber" defaultValue={initial.primaryGuardianIdNumber} /></div>
              <div className="space-y-2"><Label htmlFor="primaryGuardianEmployer">Employer</Label><Input id="primaryGuardianEmployer" name="primaryGuardianEmployer" defaultValue={initial.primaryGuardianEmployer} /></div>
              <div className="space-y-2"><Label htmlFor="primaryGuardianOccupation">Occupation</Label><Input id="primaryGuardianOccupation" name="primaryGuardianOccupation" defaultValue={initial.primaryGuardianOccupation} /></div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[0.8fr_1.2fr]"><div className="space-y-2"><Label htmlFor="primaryGuardianSalaryBand">Salary band</Label><select id="primaryGuardianSalaryBand" name="primaryGuardianSalaryBand" defaultValue={initial.primaryGuardianSalaryBand} className="cc-native-field h-11 rounded-2xl px-3 text-sm"><option value="">Select salary band</option>{HOUSEHOLD_INCOME_BANDS.map((band) => <option key={band} value={band}>{band}</option>)}</select></div><div className="space-y-2"><Label htmlFor="primaryGuardianAddress">Address</Label><Textarea id="primaryGuardianAddress" name="primaryGuardianAddress" defaultValue={initial.primaryGuardianAddress} /></div></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="secondaryGuardianFullName">Second guardian name</Label><Input id="secondaryGuardianFullName" name="secondaryGuardianFullName" defaultValue={initial.secondaryGuardianName} /></div>
              <div className="space-y-2"><Label htmlFor="secondaryGuardianRelationship">Relationship</Label><Input id="secondaryGuardianRelationship" name="secondaryGuardianRelationship" defaultValue={initial.secondaryGuardianRelationship} /></div>
              <div className="space-y-2"><Label htmlFor="secondaryGuardianPhone">Phone</Label><Input id="secondaryGuardianPhone" name="secondaryGuardianPhone" defaultValue={initial.secondaryGuardianPhone} /></div>
              <div className="space-y-2"><Label htmlFor="secondaryGuardianIdNumber">ID number</Label><Input id="secondaryGuardianIdNumber" name="secondaryGuardianIdNumber" defaultValue={initial.secondaryGuardianIdNumber} /></div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[0.8fr_1.2fr]"><div className="space-y-2"><Label htmlFor="householdIncomeBand">Household income band</Label><select id="householdIncomeBand" name="householdIncomeBand" defaultValue={initial.householdIncomeBand} className="cc-native-field h-11 rounded-2xl px-3 text-sm"><option value="">Select income band</option>{HOUSEHOLD_INCOME_BANDS.map((band) => <option key={band} value={band}>{band}</option>)}</select></div><div className="space-y-2"><Label htmlFor="secondaryGuardianAddress">Second guardian address</Label><Textarea id="secondaryGuardianAddress" name="secondaryGuardianAddress" defaultValue={initial.secondaryGuardianAddress} /></div></div>
            <input type="hidden" name="secondaryGuardianEmployer" value={initial.secondaryGuardianEmployer} />
            <input type="hidden" name="secondaryGuardianOccupation" value={initial.secondaryGuardianOccupation} />
            <input type="hidden" name="secondaryGuardianSalaryBand" value={initial.secondaryGuardianSalaryBand} />
          </section>

          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-amber-950">Documents and agreement</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">{BAJABULILE_REQUIRED_DOCUMENTS.map((document) => <label key={document} className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-950"><input type="checkbox" name="requiredDocuments" value={document} defaultChecked={initial.requiredDocuments.includes(document)} /> <span>{document}</span></label>)}</div>
            <p className="mt-4 text-sm leading-7 text-amber-950">Fees are payable monthly, collection after 17:00 may attract an extra fee, Sundays and public holidays are closed, and the centre rules still apply.</p>
            <div className="mt-4 space-y-3">{[
              ['feeRulesAccepted', 'I understand the fee rules and late-collection policy.'],
              ['hoursAccepted', 'I understand the centre operating hours and closure days.'],
              ['medicalConsentAccepted', 'I consent to necessary medical treatment in an emergency.'],
              ['indemnityAccepted', 'I accept the indemnity statement for ordinary incidents while my child is in care.'],
              ['agreementAccepted', 'I agree to the parent rules and registration conditions for this centre.'],
            ].map(([name, label]) => <label key={name} className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-950"><input type="checkbox" name={name} value="true" defaultChecked={Boolean(initial[name as keyof typeof initial])} className="mt-1" /> <span>{label}</span></label>)}</div>
            <Link href="/parent/profile/documents" className="mt-4 inline-flex text-sm font-semibold text-amber-900 underline-offset-4 hover:underline">Open document uploads</Link>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-500">CentreConnect keeps these details linked to {clean(child.first_name) || 'your child'} so pickup, daily updates, and admissions stay in one place.</p>
            <div className="flex gap-3"><Button type="button" variant="outline" className="rounded-2xl" asChild><Link href={`/parent/applications/${(await params).id}`}>Cancel</Link></Button><Button type="submit" className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700">{submittedAt ? 'Save changes' : 'Submit registration'}</Button></div>
          </div>
        </form>
      </div>
    </main>
  )
}
