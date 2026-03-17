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
]

async function upsertChildren() {
  console.log('Fetching enrolled children for Bajabulile...')
  const { data: enrolledChildren, error: fetchError } = await supabase
    .from('applications')
    .select('child_id, children(id, first_name, last_name, date_of_birth, gender)')
    .eq('ecd_id', bajabulileId)
    .eq('status', 'enrolled')

  if (fetchError) {
    console.error('Error fetching enrolled children:', fetchError)
    return
  }

  console.log(`Found ${enrolledChildren.length} enrolled children`)

  for (const childInfo of childrenData) {
    // Find matching enrolled child by DOB and last name
    const match = enrolledChildren.find(row => {
      const child = row.children
      return child?.date_of_birth === childInfo.dob && 
             child?.last_name?.toLowerCase() === childInfo.last_name.toLowerCase()
    })

    if (match) {
      // Update existing child record
      const { error: updateError } = await supabase
        .from('children')
        .update({
          first_name: childInfo.first_name,
          last_name: childInfo.last_name,
          gender: childInfo.gender,
          parent_income_category: childInfo.income,
          is_disabled: false,
          disability_description: null,
        })
        .eq('id', match.child_id)

      if (updateError) {
        console.error(`Error updating child ${childInfo.first_name} ${childInfo.last_name}:`, updateError)
      } else {
        console.log(`✓ Updated: ${childInfo.first_name} ${childInfo.last_name} (${childInfo.dob})`)
      }
    } else {
      console.log(`⚠ No enrolled match found for: ${childInfo.first_name} ${childInfo.last_name} (${childInfo.dob})`)
    }
  }

  console.log('Children upsert complete!')
}

upsertChildren().catch(console.error)
