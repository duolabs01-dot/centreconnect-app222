import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = 'https://upaezyiijeqkjepppzze.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Set it in .env before running this script.')

const supabase = createClient(supabaseUrl, serviceRoleKey)

const bajabulileId = 'f580f125-81ed-412a-8d25-f187605a6a69'

// SOURCE: Pages 2/3 + 9/10 of Monthly Report PDF (February 2026)
// 30 children total: 17 boys, 13 girls
const childrenData = [
  { first_name: 'Khazimla', last_name: 'Didi', dob: '2021-07-20', gender: 'male', income: 'R0-R3500' },
  { first_name: 'Lwandle', last_name: 'Manele', dob: '2021-11-30', gender: 'female', income: 'R0-R4500' },
  { first_name: 'Lethabo', last_name: 'Manele', dob: '2023-01-31', gender: 'male', income: 'R0-R4500' },
  { first_name: 'Lisakhanya', last_name: 'Manele', dob: '2024-06-30', gender: 'female', income: 'R0-R4500' },
  { first_name: 'Olwam', last_name: 'Manele', dob: '2022-08-31', gender: 'female', income: 'R0-R4500' },
  { first_name: 'Siyamthanda', last_name: 'Manele', dob: '2024-08-31', gender: 'female', income: 'R0-R4500' },
  { first_name: 'Siyasanga', last_name: 'Manele', dob: '2024-06-30', gender: 'male', income: 'R0-R4500' },
  { first_name: 'Amogelang', last_name: 'Mojapelo', dob: '2022-03-31', gender: 'male', income: 'R0-R3500' },
  { first_name: 'Kamogelo', last_name: 'Mojapelo', dob: '2023-03-31', gender: 'female', income: 'R0-R4500' },
  { first_name: 'Katlego', last_name: 'Mojapelo', dob: '2024-06-30', gender: 'male', income: 'R0-R4500' },
  { first_name: 'Karabo', last_name: 'Mojapelo', dob: '2021-09-30', gender: 'female', income: 'R0-R4500' },
  { first_name: 'Lesedi', last_name: 'Mojapelo', dob: '2022-09-30', gender: 'female', income: 'R0-R4500' },
  { first_name: 'Omphile', last_name: 'Mojapelo', dob: '2023-09-30', gender: 'male', income: 'R0-R4500' },
  { first_name: 'Realebogakgosi', last_name: 'Mojapelo', dob: '2024-09-30', gender: 'male', income: 'R0-R4500' },
  { first_name: 'Rethabile', last_name: 'Mojapelo', dob: '2021-11-30', gender: 'female', income: 'R0-R4500' },
  { first_name: 'Thatohatsi', last_name: 'Mojapelo', dob: '2023-11-30', gender: 'female', income: 'R0-R4500' },
  { first_name: 'Tumisang', last_name: 'Mojapelo', dob: '2024-11-30', gender: 'male', income: 'R0-R4500' },
  { first_name: 'Koketso', last_name: 'Mohlala', dob: '2022-02-28', gender: 'male', income: 'R0-R4500' },
  { first_name: 'Lethabo', last_name: 'Mohlala', dob: '2023-02-28', gender: 'male', income: 'R0-R4500' },
  { first_name: 'Realebogakgosi', last_name: 'Mohlala', dob: '2024-02-28', gender: 'female', income: 'R0-R4500' },
  { first_name: 'Anele', last_name: 'Motaung', dob: '2022-05-31', gender: 'male', income: 'R0-R3500' },
  { first_name: 'Katlego', last_name: 'Motaung', dob: '2023-05-31', gender: 'female', income: 'R0-R3500' },
  { first_name: 'Lerato', last_name: 'Motaung', dob: '2024-05-31', gender: 'female', income: 'R0-R3500' },
  { first_name: 'Reitumetse', last_name: 'Motaung', dob: '2021-07-31', gender: 'female', income: 'R0-R3500' },
  { first_name: 'Rethabile', last_name: 'Motaung', dob: '2022-07-31', gender: 'male', income: 'R0-R3500' },
  { first_name: 'Thatohatsi', last_name: 'Motaung', dob: '2023-07-31', gender: 'female', income: 'R0-R3500' },
  { first_name: 'Amogelang', last_name: 'Mothiba', dob: '2022-04-30', gender: 'male', income: 'R0-R3500' },
  { first_name: 'Kamohelo', last_name: 'Mothiba', dob: '2023-04-30', gender: 'female', income: 'R0-R3500' },
  { first_name: 'Katlego', last_name: 'Mothiba', dob: '2024-04-30', gender: 'male', income: 'R0-R3500' },
  { first_name: 'Tshepiso', last_name: 'Nkosi', dob: '2023-09-15', gender: 'male', income: 'R0-R4500' },
]

async function insertChildren() {
  console.log('Step 1: Delete existing children for Bajabulile...')
  const { data: existingChildren } = await supabase
    .from('children')
    .select('id')
    .eq('ecd_id', bajabulileId)

  if (existingChildren && existingChildren.length > 0) {
    const childIds = existingChildren.map(c => c.id)
    // Delete applications first (FK constraint)
    const { error: appDelErr } = await supabase
      .from('applications')
      .delete()
      .in('child_id', childIds)
    if (appDelErr) console.error('Error deleting applications:', appDelErr)

    // Delete attendance records
    const { error: attDelErr } = await supabase
      .from('attendance_records')
      .delete()
      .in('child_id', childIds)
    if (attDelErr && attDelErr.code !== 'PGRST116') console.error('Error deleting attendance:', attDelErr)

    // Delete children
    const { error: childDelErr } = await supabase
      .from('children')
      .delete()
      .eq('ecd_id', bajabulileId)
    if (childDelErr) console.error('Error deleting children:', childDelErr)
    console.log(`  Deleted ${existingChildren.length} existing children`)
  } else {
    console.log('  No existing children found')
  }

  console.log(`Step 2: Inserting ${childrenData.length} children...`)
  let insertedCount = 0
  const insertedChildIds = []

  for (const child of childrenData) {
    const { data, error } = await supabase
      .from('children')
      .insert({
        first_name: child.first_name,
        last_name: child.last_name,
        date_of_birth: child.dob,
        gender: child.gender,
        ecd_id: bajabulileId,
        enrollment_source: 'ecd_manual',
        enrollment_status: 'active',
        parent_income_category: child.income,
        is_disabled: false,
        guardian_contacts: [],
        emergency_contacts: [],
      })
      .select('id')
      .single()

    if (error) {
      console.error(`  ✗ Error inserting ${child.first_name} ${child.last_name}:`, error.message)
    } else {
      insertedCount++
      insertedChildIds.push({ childId: data.id, ...child })
      console.log(`  ✓ ${child.first_name} ${child.last_name}`)
    }
  }

  console.log(`\nStep 3: Creating enrolled applications for ${insertedChildIds.length} children...`)
  let appCount = 0

  for (const child of insertedChildIds) {
    const appNumber = `BAJ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase()
    const { error } = await supabase
      .from('applications')
      .insert({
        application_number: appNumber,
        ecd_id: bajabulileId,
        child_id: child.childId,
        status: 'enrolled',
        submitted_at: '2025-01-15T00:00:00Z',
        start_date: '2025-02-01',
      })

    if (error) {
      console.error(`  ✗ Application error for ${child.first_name} ${child.last_name}:`, error.message)
    } else {
      appCount++
    }
  }

  console.log(`\n=== DONE ===`)
  console.log(`Children inserted: ${insertedCount}/${childrenData.length}`)
  console.log(`Applications created: ${appCount}/${insertedChildIds.length}`)
  console.log(`\nRefresh your browser to see children in Attendance, Children, and DOE Report pages.`)
}

insertChildren().catch(console.error)
