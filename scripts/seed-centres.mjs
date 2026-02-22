import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadDotEnvLocal()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const centres = [
  {
    slug: 'sunshine-early-learning',
    name: 'Sunshine Early Learning Centre',
    tagline: 'Nurturing young minds in Alexandra',
    description:
      'We provide a safe, stimulating environment for children aged 0-6 years. Our experienced educators focus on holistic development through play-based learning. We have been serving the Alexandra community for over 10 years.',
    email: 'info@sunshine-elc.co.za',
    phone: '+27 11 234 5678',
    address: '123 Main Road',
    suburb: 'Alexandra',
    city: 'Johannesburg',
    province: 'Gauteng',
    postal_code: '2090',
    is_registered: true,
    registration_number: 'ECD-ALX-2015-001',
    capacity: 45,
    age_groups: ['0-2', '2-4', '4-6'],
    primary_color: '#2E7EC8',
    is_active: true,
    onboarded_at: new Date().toISOString(),
  },
  {
    slug: 'happy-hearts-daycare',
    name: 'Happy Hearts Daycare',
    tagline: 'Where every child matters',
    description:
      'Family-run daycare with focus on emotional intelligence and social skills. We believe in learning through play and creating a home away from home for your little ones.',
    email: 'contact@happyhearts.co.za',
    phone: '+27 11 345 6789',
    address: '45 Roosevelt Street',
    suburb: 'Alexandra',
    city: 'Johannesburg',
    province: 'Gauteng',
    postal_code: '2090',
    is_registered: true,
    registration_number: 'ECD-ALX-2018-045',
    capacity: 30,
    age_groups: ['2-4', '4-6'],
    primary_color: '#10B981',
    is_active: true,
    onboarded_at: new Date().toISOString(),
  },
  {
    slug: 'little-stars-preschool',
    name: 'Little Stars Preschool',
    tagline: 'Preparing children for tomorrow',
    description:
      'Grade R preparation specialists. Our curriculum focuses on school readiness, literacy, and numeracy. We have a 95% success rate for primary school placement.',
    email: 'admin@littlestars-alex.co.za',
    phone: '+27 11 456 7890',
    address: '78 London Road',
    suburb: 'Alexandra',
    city: 'Johannesburg',
    province: 'Gauteng',
    postal_code: '2090',
    is_registered: false,
    registration_number: null,
    capacity: 60,
    age_groups: ['3-4', '4-6'],
    primary_color: '#8B5CF6',
    is_active: true,
    onboarded_at: new Date().toISOString(),
  },
  {
    slug: 'bright-beginnings-alex',
    name: 'Bright Beginnings ECD',
    tagline: 'Montessori-inspired learning',
    description:
      "Child-led learning environment following Montessori principles. We focus on independence, hands-on learning, and respect for each child's unique development pace.",
    email: 'info@brightbeginnings.co.za',
    phone: '+27 11 567 8901',
    address: '12 Selborne Road',
    suburb: 'Alexandra',
    city: 'Johannesburg',
    province: 'Gauteng',
    postal_code: '2090',
    is_registered: true,
    registration_number: 'ECD-ALX-2020-089',
    capacity: 35,
    age_groups: ['2-4', '4-6'],
    primary_color: '#F59E0B',
    is_active: true,
    onboarded_at: new Date().toISOString(),
  },
  {
    slug: 'rainbow-kids-care',
    name: 'Rainbow Kids Care Centre',
    tagline: 'Diversity is our strength',
    description:
      'Inclusive childcare celebrating diversity. We accommodate children with special needs and provide individualized learning plans. Multilingual staff (English, Zulu, Sotho, Afrikaans).',
    email: 'hello@rainbowkids.co.za',
    phone: '+27 11 678 9012',
    address: '56 16th Avenue',
    suburb: 'Alexandra',
    city: 'Johannesburg',
    province: 'Gauteng',
    postal_code: '2090',
    is_registered: true,
    registration_number: 'ECD-ALX-2019-067',
    capacity: 50,
    age_groups: ['0-2', '2-4', '4-6'],
    primary_color: '#EC4899',
    is_active: true,
    onboarded_at: new Date().toISOString(),
  },
  {
    slug: 'soweto-sunrise-preschool',
    name: 'Soweto Sunrise Preschool',
    tagline: 'Excellence in early education',
    description:
      'Award-winning preschool in the heart of Soweto. We combine traditional values with modern teaching methods.',
    email: 'info@sowetosunrise.co.za',
    phone: '+27 11 789 0123',
    address: '234 Vilakazi Street',
    suburb: 'Orlando West',
    city: 'Soweto',
    province: 'Gauteng',
    postal_code: '1804',
    is_registered: true,
    registration_number: 'ECD-SOW-2017-023',
    capacity: 70,
    age_groups: ['2-4', '4-6'],
    primary_color: '#EF4444',
    is_active: true,
    onboarded_at: new Date().toISOString(),
  },
]

const DEFAULT_ECD_COVER =
  'https://images.pexels.com/photos/8363783/pexels-photo-8363783.jpeg?cs=srgb&dl=pexels-rdne-8363783.jpg&fm=jpg'

const ECD_COVER_BY_SLUG = {
  'sunshine-early-learning':
    'https://images.pexels.com/photos/8363783/pexels-photo-8363783.jpeg?cs=srgb&dl=pexels-rdne-8363783.jpg&fm=jpg',
  'happy-hearts-daycare':
    'https://images.pexels.com/photos/8363040/pexels-photo-8363040.jpeg?cs=srgb&dl=pexels-rdne-8363040.jpg&fm=jpg',
  'little-stars-preschool':
    'https://images.pexels.com/photos/8465506/pexels-photo-8465506.jpeg?cs=srgb&dl=pexels-anastasia-shuraeva-8465506.jpg&fm=jpg',
  'bright-beginnings-alex':
    'https://images.pexels.com/photos/8363102/pexels-photo-8363102.jpeg?cs=srgb&dl=pexels-rdne-8363102.jpg&fm=jpg',
  'rainbow-kids-care':
    'https://images.pexels.com/photos/8363745/pexels-photo-8363745.jpeg?cs=srgb&dl=pexels-rdne-8363745.jpg&fm=jpg',
  'soweto-sunrise-preschool':
    'https://images.pexels.com/photos/8363771/pexels-photo-8363771.jpeg?cs=srgb&dl=pexels-rdne-8363771.jpg&fm=jpg',
}

async function ensureEvent(ecdId) {
  const eventDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('ecd_id', ecdId)
    .eq('title', 'Open Day')
    .limit(1)
    .maybeSingle()
  if (!existing) {
    await supabase.from('calendar_events').insert({
      ecd_id: ecdId,
      title: 'Open Day',
      description: 'Visit our centre and meet our educators',
      event_date: eventDate,
      start_time: '09:00',
      end_time: '12:00',
      is_public: true,
    })
  }
}

async function ensureAnnouncement(ecdId) {
  const { data: existing } = await supabase
    .from('announcements')
    .select('id')
    .eq('ecd_id', ecdId)
    .eq('title', 'Registration Open for 2027')
    .limit(1)
    .maybeSingle()
  if (!existing) {
    await supabase.from('announcements').insert({
      ecd_id: ecdId,
      title: 'Registration Open for 2027',
      content: 'We are now accepting applications for the 2027 academic year. Limited spaces available.',
      is_published: true,
      published_at: new Date().toISOString(),
    })
  }
}

async function seedCentres() {
  console.log('Seeding ECD centres...')

  for (const centre of centres) {
    const centrePayload = {
      ...centre,
      cover_image_url: ECD_COVER_BY_SLUG[centre.slug] ?? DEFAULT_ECD_COVER,
    }
    const { data, error } = await supabase
      .from('ecd_centres')
      .upsert(centrePayload, { onConflict: 'slug' })
      .select()
      .single()

    if (error || !data) {
      console.error(`Failed to create/update ${centre.name}:`, error?.message ?? 'Unknown error')
      continue
    }

    console.log(`Created/updated ${centre.name}`)

    await supabase.from('ecd_content').upsert(
      [
        {
          ecd_id: data.id,
          section: 'about',
          content_blocks: [
            { type: 'heading', content: `Welcome to ${centre.name}` },
            { type: 'paragraph', content: centre.description },
            { type: 'heading', content: 'Our Facilities' },
            {
              type: 'paragraph',
              content: 'Modern, safe facilities with dedicated play areas, learning zones, and rest spaces.',
            },
          ],
        },
        {
          ecd_id: data.id,
          section: 'programs',
          content_blocks: [
            { type: 'heading', content: 'Our Programs' },
            { type: 'paragraph', content: 'Age-appropriate curriculum for all developmental stages.' },
          ],
        },
      ],
      { onConflict: 'ecd_id,section' }
    )

    await ensureEvent(data.id)
    await ensureAnnouncement(data.id)

    await supabase.from('subscriptions').upsert(
      {
        ecd_id: data.id,
        tier: 'standard',
        status: 'active',
        monthly_price: 299,
        setup_fee: 1500,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'ecd_id' }
    )
  }

  console.log('Seeding complete.')
}

seedCentres().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
