import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = 'https://upaezyiijeqkjepppzze.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Set it in .env before running this script.')

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: { schema: 'public' }
})

const bajabulileId = 'f580f125-81ed-412a-8d25-f187605a6a69'

// SOURCE: Pages 2/3 (Beneficiaries Classification) merged with Pages 9/10 (Children Subsidized Through Grant)
// Monthly Report Bajabulile Day Care Centre — February 2026
// Format: first_name = given name, last_name = surname (SA convention: surname listed first in register)
// Gender totals confirmed: Boys 17, Girls 13 = 30 total (Page 11 Grand Total)
const childrenData = [
  // --- Children 1–20 (existing + some new admissions from page 2) ---
  { first_name: 'Khazimla',     last_name: 'Didi',        dob: '2021-07-20', gender: 'male',   income: 'R0-R4500' },
  { first_name: 'Orfile',       last_name: 'Moshato',     dob: '2021-07-17', gender: 'male',   income: 'R0-R4500' },
  { first_name: 'John',         last_name: 'Shafike',     dob: '2022-03-15', gender: 'male',   income: 'Other' },
  { first_name: 'Kharendrew',   last_name: 'Modome',      dob: '2022-07-05', gender: 'male',   income: null },
  { first_name: 'Ndaiwenhle',   last_name: 'Maseko',      dob: '2022-06-19', gender: 'female', income: 'R0-R3500' },
  { first_name: 'Khanyisile',   last_name: 'Dube',        dob: '2022-07-07', gender: 'female', income: 'R0-R4500' },
  { first_name: 'Negabuho',     last_name: 'Moyo',        dob: '2022-02-05', gender: 'male',   income: 'R0-R4500' },
  { first_name: 'Nokukhanya',   last_name: 'Khaba',       dob: '2023-05-31', gender: 'female', income: 'R0-R3500' },
  { first_name: 'Siyabonga',    last_name: 'Ndlovu',      dob: '2023-06-07', gender: 'male',   income: null },
  { first_name: 'Ofentse',      last_name: 'Makhobela',   dob: '2023-05-13', gender: 'male',   income: 'R0-R4500' },
  { first_name: 'Karabo',       last_name: 'Machetela',   dob: '2022-04-06', gender: 'female', income: 'R0-R4500' },
  { first_name: 'Khanyakahle',  last_name: 'Masango',     dob: '2023-07-07', gender: 'female', income: null },
  { first_name: 'Thando',       last_name: 'Ndlovu',      dob: '2023-09-22', gender: 'male',   income: null },
  { first_name: 'Ntsumi',       last_name: 'Ngamalana',   dob: '2023-09-22', gender: 'female', income: null },
  { first_name: 'Owami',        last_name: 'Moshidi',     dob: '2021-12-30', gender: 'female', income: null },
  { first_name: 'Nhiulo',       last_name: 'Mabasa',      dob: '2021-07-15', gender: 'male',   income: 'Other' },
  { first_name: 'Melokuhle',    last_name: 'Moyo',        dob: '2021-07-19', gender: 'female', income: null },
  { first_name: 'Ivakele',      last_name: 'Gqibixhego',  dob: '2023-10-07', gender: 'female', income: null },
  { first_name: 'Lethabo',      last_name: 'Mfulo',       dob: '2021-06-21', gender: 'male',   income: null },
  { first_name: 'Ndaiwenhle',   last_name: 'Mabasa',      dob: '2022-06-19', gender: 'female', income: null },
  // --- New admissions 21–30 (page 3, all marked as new admissions Feb 2026) ---
  { first_name: 'Nkateko',      last_name: 'Tshabalala',  dob: '2026-01-25', gender: 'male',   income: null },
  { first_name: 'Kgotso',       last_name: 'Vumisa',      dob: '2023-09-05', gender: 'female', income: null },
  { first_name: 'Anele Kotjie', last_name: 'Mokwana',     dob: '2023-03-13', gender: 'male',   income: null },
  { first_name: 'Surprise',     last_name: 'Ndebele',     dob: '2020-09-28', gender: 'male',   income: null },
  { first_name: 'Mikhenso',     last_name: 'Rikholo',     dob: '2022-03-04', gender: 'male',   income: null },
  { first_name: 'Muthiuri',     last_name: 'Makhubele',   dob: '2022-03-24', gender: 'female', income: null },
  { first_name: 'Ndzhaka',      last_name: 'Mohale',      dob: '2024-06-13', gender: 'male',   income: null },
  { first_name: 'Khensani',     last_name: 'Mabuyangwa',  dob: '2022-03-23', gender: 'male',   income: null },
  { first_name: 'Monau',        last_name: 'Mabiletsi',   dob: '2023-02-11', gender: 'female', income: null },
  { first_name: 'Sinle',        last_name: 'Molotswa',    dob: '2024-06-15', gender: 'male',   income: null },
]

async function upsertBajabulileChildren() {
  console.log('=== Upserting Bajabulile Day Care Centre — 30 Children ===')

  // Get all enrolled children at Bajabulile via applications
  const { data: enrolledApps, error: appsError } = await supabase
    .from('applications')
    .select('child_id, children(id, first_name, last_name, date_of_birth, gender)')
    .eq('ecd_id', bajabulileId)
    .in('status', ['enrolled', 'submitted', 'pending'])

  if (appsError) {
    console.error('Error fetching enrolled applications:', appsError.message)
    process.exit(1)
  }

  type ChildRow = { id: string; first_name: string; last_name: string; date_of_birth: string; gender: string | null }
  const enrolledChildren: ChildRow[] = []
  for (const app of (enrolledApps ?? [])) {
    const child = Array.isArray(app.children) ? app.children[0] : app.children
    if (child) enrolledChildren.push(child as ChildRow)
  }

  console.log(`Found ${enrolledChildren.length} enrolled children at Bajabulile.`)

  let updated = 0
  let notFound = 0

  for (const child of childrenData) {
    // Primary match: by DOB + last_name (case-insensitive)
    let match = enrolledChildren.find(
      (ec) =>
        ec.date_of_birth?.slice(0, 10) === child.dob &&
        ec.last_name?.toLowerCase() === child.last_name.toLowerCase()
    )

    // Fallback: DOB only (handles slight surname spelling variations)
    if (!match) {
      match = enrolledChildren.find((ec) => ec.date_of_birth?.slice(0, 10) === child.dob)
    }

    if (match) {
      const { error } = await supabase
        .from('children')
        .update({
          first_name: child.first_name,
          last_name: child.last_name,
          gender: child.gender,
          parent_income_category: child.income,
          is_disabled: false,
        })
        .eq('id', match.id)

      if (error) {
        console.error(`  ✗ Failed to update ${child.first_name} ${child.last_name} (${child.dob}): ${error.message}`)
      } else {
        console.log(`  ✓ Updated: ${child.first_name} ${child.last_name} (was: ${match.first_name} ${match.last_name})`)
        updated++
      }
    } else {
      console.warn(`  ? Not found in enrolled list: ${child.first_name} ${child.last_name} — DOB ${child.dob}`)
      notFound++
    }
  }

  console.log(`\n=== Done: ${updated} updated, ${notFound} not found in enrolled list ===`)
  if (notFound > 0) {
    console.log('Tip: Children not found may not have an application record at Bajabulile yet.')
  }
}

upsertBajabulileChildren().catch(console.error)
