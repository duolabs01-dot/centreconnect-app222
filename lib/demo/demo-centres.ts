import type { Centre, ExistingApplication, WebsiteContentState } from '@/app/c/[slug]/centre-client'
import type { DirectoryCentre } from '@/types/directory-centre'

const demoWebsiteContent: WebsiteContentState = {
  aboutText:
    'A warm local creche where children learn through play, routine, and caring attention. Parents can compare the basics quickly, then apply or message without starting from zero each time.',
  programCards: [
    {
      title: 'Play, learning, and daily rhythm',
      description: 'A clear day with play, learning, meals, rest, and caring support.',
    },
    {
      title: 'An easier parent experience',
      description: 'Applications, updates, and next steps stay in one place instead of getting lost.',
    },
  ],
  galleryUrls: [],
  visibleSections: ['hero', 'about', 'programs', 'contact'],
}

export const demoDirectoryCentres: DirectoryCentre[] = [
  {
    id: 'demo-bajabulile',
    slug: 'bajabulile-day-care-centre',
    name: 'Bajabulile Day Care Centre',
    tagline: 'Warm care, clear routines, and an easier parent journey.',
    suburb: 'Alexandra',
    city: 'Johannesburg',
    age_groups: ['1-2 years', '3-5 years'],
    is_registered: true,
    logo_url: '/centres/bajabulile/logo.jpg',
    cover_image_url: '/centres/bajabulile/hero.jpg',
    capacity: 64,
    fees_display_mode: 'range',
    monthly_fee_min: 600,
    monthly_fee_max: 650,
    registration_fee: 250,
    subsidy_accepted: true,
    is_claimed: true,
    is_pilot: true,
    is_featured: true,
    operating_schedule: null,
    operating_hours_summary: 'Mon to Fri, 06:30 to 17:30',
    latitude: -26.105,
    longitude: 28.093,
    coordinate_source: 'exact',
    coordinate_confidence: 'high',
    contact_whatsapp: '27712345678',
    contact_phone: '0111234567',
    phone: '0111234567',
    existingApplicationId: null,
    existingApplicationStatus: null,
  },
  {
    id: 'demo-little-stars',
    slug: 'little-stars-creche',
    name: 'Little Stars Creche',
    tagline: 'A simple public listing while the centre finishes joining CentreConnect.',
    suburb: 'Marlboro',
    city: 'Johannesburg',
    age_groups: ['2-5 years'],
    is_registered: false,
    logo_url: null,
    cover_image_url: null,
    capacity: 40,
    fees_display_mode: 'contact',
    monthly_fee_min: null,
    monthly_fee_max: null,
    registration_fee: null,
    subsidy_accepted: false,
    is_claimed: false,
    is_pilot: false,
    is_featured: false,
    operating_schedule: null,
    operating_hours_summary: 'Mon to Fri, 07:00 to 17:00',
    latitude: -26.118,
    longitude: 28.108,
    coordinate_source: 'exact',
    coordinate_confidence: 'medium',
    contact_whatsapp: '27719876543',
    contact_phone: '0117654321',
    phone: '0117654321',
    existingApplicationId: null,
    existingApplicationStatus: null,
  },
]

export const demoCentrePageBySlug: Record<
  string,
  { centre: Centre; websiteContent: WebsiteContentState; userRole: string | null; existingApplication: ExistingApplication | null }
> = {
  'bajabulile-day-care-centre': {
    centre: {
      id: 'demo-bajabulile',
      slug: 'bajabulile-day-care-centre',
      name: 'Bajabulile Day Care Centre',
      tagline: 'Warm care, clear routines, and an easier parent journey.',
      description:
        'A caring local creche where children learn through play, routine, and close attention. Parents can apply online, message the centre, and keep updates together.',
      email: 'hello@bajabulile.example',
      phone: '0111234567',
      address: '123 2nd Avenue, Alexandra, Johannesburg',
      suburb: 'Alexandra',
      city: 'Johannesburg',
      province: 'Gauteng',
      age_groups: ['1-2 years', '3-5 years'],
      logo_url: '/centres/bajabulile/logo.jpg',
      cover_image_url: '/centres/bajabulile/hero.jpg',
      is_registered: true,
      capacity: 64,
      fees_display_mode: 'range',
      monthly_fee_min: 600,
      monthly_fee_max: 650,
      registration_fee: 250,
      subsidy_accepted: true,
      fees_notes: null,
      fees_last_updated_at: null,
      contact_whatsapp: '27712345678',
      contact_phone: '0111234567',
      operating_schedule: null,
      operating_hours_summary: 'Mon to Fri, 06:30 to 17:30',
      communication_automation_settings: {
        location: { source: 'exact', confidence: 'high' },
      },
      aftercare_available: true,
      aftercare_end_time: '17:30',
      classrooms: [
        { id: 'demo-class-a', name: 'Busy Bees', age_group: '1-2 years', practitioner_name: 'Teacher Zanele' },
        { id: 'demo-class-b', name: 'Rainbow Room', age_group: '3-4 years', practitioner_name: 'Teacher Lerato' },
        { id: 'demo-class-c', name: 'School Ready', age_group: '4-5 years', practitioner_name: 'Teacher Ayanda' },
      ],
      owner_id: 'demo-owner',
      onboarding_complete: true,
      website_published: true,
    },
    websiteContent: demoWebsiteContent,
    userRole: null,
    existingApplication: null,
  },
}

export function shouldUseDemoCentreData() {
  return (
    process.env.NODE_ENV !== 'production' &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
}
