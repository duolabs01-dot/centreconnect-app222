import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const TARGET_EMAIL = 'duolabs01@gmail.com'
const TARGET_CENTRE_SLUG = 'sunshine-early-learning'
const TODAY_KEY = new Date().toISOString().slice(0, 10)

const FIRST_NAMES = [
  'Anele',
  'Bokamoso',
  'Chuma',
  'Dineo',
  'Enzo',
  'Fikile',
  'Gugulethu',
  'Hlompho',
  'Imani',
  'Jabari',
  'Koketso',
  'Lethabo',
]

const LAST_NAMES = [
  'Mokoena',
  'Ndlovu',
  'Khumalo',
  'Dlamini',
  'Pillay',
  'Naidoo',
  'Mabaso',
  'Sithole',
  'Mthembu',
  'Mahlangu',
  'Molefe',
  'Nkosi',
]

function loadDotEnvLocal() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const envPath = path.resolve(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return

  const content = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

function isoHoursAgo(hoursAgo) {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
}

function dateYearsAgo(years, monthOffset = 0) {
  const d = new Date()
  d.setUTCFullYear(d.getUTCFullYear() - years)
  d.setUTCMonth((d.getUTCMonth() + monthOffset + 12) % 12)
  return d.toISOString().slice(0, 10)
}

function makeId(suffix) {
  return `9f7a0000-0000-4000-8000-${String(suffix).padStart(12, '0')}`
}

async function main() {
  loadDotEnvLocal()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const usersRes = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (usersRes.error) throw usersRes.error
  const authUser = usersRes.data.users.find((u) => (u.email ?? '').toLowerCase() === TARGET_EMAIL.toLowerCase())
  if (!authUser) {
    throw new Error(`Auth user not found for ${TARGET_EMAIL}`)
  }

  let { data: centre } = await supabase
    .from('ecd_centres')
    .select('id,slug,name')
    .eq('slug', TARGET_CENTRE_SLUG)
    .maybeSingle()

  if (!centre) {
    const { data: fallbackCentre, error: fallbackErr } = await supabase
      .from('ecd_centres')
      .select('id,slug,name')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (fallbackErr || !fallbackCentre) {
      throw fallbackErr ?? new Error('No active ECD centre found for demo seeding')
    }
    centre = fallbackCentre
  }

  const profileUpsert = await supabase.from('user_profiles').upsert(
    {
      id: authUser.id,
      role: 'ecd_admin',
      full_name: authUser.user_metadata?.full_name ?? 'ECD Admin Demo',
      phone: authUser.phone ?? null,
    },
    { onConflict: 'id' }
  )
  if (profileUpsert.error) throw profileUpsert.error

  const parentUpsert = await supabase.from('parents').upsert(
    {
      id: authUser.id,
      alt_phone: authUser.phone ?? '+27 82 000 0000',
      city: 'Johannesburg',
      province: 'Gauteng',
    },
    { onConflict: 'id' }
  )
  if (parentUpsert.error) throw parentUpsert.error

  const adminLink = await supabase.from('ecd_admins').upsert(
    {
      ecd_id: centre.id,
      user_id: authUser.id,
      role: 'ecd_admin',
      invited_at: new Date().toISOString(),
      accepted_at: new Date().toISOString(),
    },
    { onConflict: 'ecd_id,user_id' }
  )
  if (adminLink.error) throw adminLink.error

  const childRows = Array.from({ length: 12 }).map((_, idx) => ({
    id: makeId(1000 + idx),
    parent_id: authUser.id,
    first_name: FIRST_NAMES[idx % FIRST_NAMES.length],
    last_name: LAST_NAMES[idx % LAST_NAMES.length],
    date_of_birth: dateYearsAgo(3 + (idx % 3), idx),
    gender: idx % 2 === 0 ? 'female' : 'male',
    allergies: idx % 5 === 0 ? 'None' : null,
    medical_conditions: null,
    special_needs: idx % 6 === 0 ? 'Speech support' : null,
    full_name: `${FIRST_NAMES[idx % FIRST_NAMES.length]} ${LAST_NAMES[idx % LAST_NAMES.length]}`,
  }))

  const childUpsert = await supabase.from('children').upsert(childRows, { onConflict: 'id' })
  if (childUpsert.error) throw childUpsert.error

  const statusPlan = [
    'submitted',
    'submitted',
    'submitted',
    'submitted',
    'in_review',
    'in_review',
    'in_review',
    'waitlisted',
    'waitlisted',
    'approved',
    'enrolled',
    'rejected',
  ]
  const submittedHoursAgo = [4, 9, 18, 30, 40, 76, 92, 55, 26, 120, 150, 200]

  const applicationRows = childRows.map((child, idx) => {
    const submittedAt = isoHoursAgo(submittedHoursAgo[idx] ?? 24)
    const status = statusPlan[idx] ?? 'submitted'
    const reviewable = ['in_review', 'waitlisted', 'approved', 'enrolled', 'rejected'].includes(status)
    return {
      id: makeId(2000 + idx),
      application_number: `DEMO-ECD-${String(idx + 1).padStart(3, '0')}`,
      ecd_id: centre.id,
      parent_id: authUser.id,
      child_id: child.id,
      status,
      submitted_at: submittedAt,
      reviewed_at: reviewable ? isoHoursAgo(Math.max(2, submittedHoursAgo[idx] - 8)) : null,
      decided_at: ['waitlisted', 'approved', 'enrolled', 'rejected'].includes(status)
        ? isoHoursAgo(Math.max(1, submittedHoursAgo[idx] - 3))
        : null,
      admin_notes:
        status === 'submitted'
          ? 'Awaiting initial review'
          : status === 'in_review'
            ? 'Documents verified, capacity check in progress'
            : status === 'waitlisted'
              ? 'Waitlist due to current class balance'
              : status === 'approved'
                ? 'Offer sent to parent'
                : status === 'enrolled'
                  ? 'Enrollment finalized'
                  : 'Application declined after interview',
      parent_message: idx % 3 === 0 ? 'Looking forward to your feedback.' : null,
      share_multiple_flag: idx % 2 === 0,
    }
  })

  const appUpsert = await supabase.from('applications').upsert(applicationRows, { onConflict: 'application_number' })
  if (appUpsert.error) throw appUpsert.error

  const guardianRows = childRows.map((child, idx) => ({
    id: makeId(3000 + idx),
    parent_id: authUser.id,
    child_id: child.id,
    full_name: `${child.first_name} ${child.last_name} Guardian`,
    relationship: idx % 2 === 0 ? 'Mother' : 'Father',
    phone: `+2782${String(300000 + idx).padStart(6, '0')}`,
    is_verified: idx % 4 !== 0,
    verified_by: idx % 4 !== 0 ? authUser.id : null,
    verified_at: idx % 4 !== 0 ? isoHoursAgo(12) : null,
  }))
  const guardianUpsert = await supabase.from('guardians').upsert(guardianRows, { onConflict: 'id' })
  if (guardianUpsert.error) throw guardianUpsert.error

  const attendanceRows = childRows.slice(0, 10).map((child, idx) => ({
    id: makeId(4000 + idx),
    ecd_id: centre.id,
    child_id: child.id,
    date: TODAY_KEY,
    checked_in: true,
    checked_in_at: isoHoursAgo(10 - idx * 0.3),
    checked_in_by: authUser.id,
    picked_up: idx < 7,
    picked_up_at: idx < 7 ? isoHoursAgo(2 + idx * 0.2) : null,
    notes: idx < 7 ? 'Collected by authorized guardian' : 'Pending pickup',
  }))
  const attendanceUpsert = await supabase
    .from('attendance')
    .upsert(attendanceRows, { onConflict: 'ecd_id,child_id,date' })
  if (attendanceUpsert.error) throw attendanceUpsert.error

  const pickupRows = childRows.slice(0, 6).map((child, idx) => ({
    id: makeId(5000 + idx),
    ecd_id: centre.id,
    child_id: child.id,
    parent_id: authUser.id,
    code: String(710000 + idx).slice(-6),
    generated_by: authUser.id,
    generated_by_role: 'centre',
    parent_confirmed: true,
    parent_confirmed_at: isoHoursAgo(3 + idx * 0.2),
    used: idx < 2,
    used_at: idx < 2 ? isoHoursAgo(1.5 + idx * 0.2) : null,
    used_by: idx < 2 ? authUser.id : null,
    failed_attempts: 0,
    locked: false,
    expires_at: new Date(Date.now() + (30 + idx * 10) * 60 * 1000).toISOString(),
  }))
  const pickupUpsert = await supabase.from('pickup_codes').upsert(pickupRows, { onConflict: 'id' })
  if (pickupUpsert.error) throw pickupUpsert.error

  const today = new Date()
  const closesInDays = (days) => {
    const date = new Date(today)
    date.setDate(today.getDate() + days)
    return date.toISOString().slice(0, 10)
  }

  const jobRows = [
    {
      id: makeId(7001),
      ecd_id: centre.id,
      title: 'ECD Assistant Teacher',
      role_type: 'assistant',
      description: 'Support daily learning activities, classroom setup, and child supervision.',
      requirements: 'ECD Level 4 or equivalent experience. Caring attitude and strong communication.',
      is_published: true,
      published_at: new Date().toISOString(),
      closes_at: closesInDays(14),
      created_by: authUser.id,
    },
    {
      id: makeId(7002),
      ecd_id: centre.id,
      title: 'Aftercare Support Practitioner',
      role_type: 'practitioner',
      description: 'Lead aftercare routines, homework support, and parent handover updates.',
      requirements: 'Experience with ages 4-6. Reliable attendance and positive behaviour guidance.',
      is_published: true,
      published_at: new Date().toISOString(),
      closes_at: closesInDays(21),
      created_by: authUser.id,
    },
  ]
  const jobUpsert = await supabase.from('jobs').upsert(jobRows, { onConflict: 'id' })
  if (jobUpsert.error) throw jobUpsert.error

  const summary = {
    centre: `${centre.name} (${centre.slug})`,
    email: TARGET_EMAIL,
    applications: applicationRows.length,
    pending: applicationRows.filter((a) => a.status === 'submitted' || a.status === 'in_review').length,
    waitlisted: applicationRows.filter((a) => a.status === 'waitlisted').length,
    attendanceToday: attendanceRows.length,
    pickedUpToday: attendanceRows.filter((a) => a.picked_up).length,
    activePickupCodes: pickupRows.filter((p) => !p.used && !p.locked).length,
    unverifiedGuardians: guardianRows.filter((g) => !g.is_verified).length,
    publishedJobs: jobRows.length,
  }

  console.log('DEMO_SEED_SUCCESS')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error('DEMO_SEED_FAILED')
  console.error(error)
  process.exitCode = 1
})
