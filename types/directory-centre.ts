import type { CentreCoordinateConfidence, CentreCoordinateSource } from '@/lib/geo/centre-location-metadata'
import type { CentreOperatingSchedule } from '@/lib/time/centre-operating-schedule'

export type DirectoryCentre = {
  id: string
  slug: string
  name: string
  tagline: string | null
  suburb: string
  city: string
  age_groups: string[] | null
  is_registered: boolean
  logo_url: string | null
  cover_image_url: string | null
  capacity: number | null
  fees_display_mode: 'exact' | 'range' | 'contact' | null
  monthly_fee_min: number | null
  monthly_fee_max: number | null
  registration_fee?: number | null
  subsidy_accepted: boolean
  is_claimed: boolean
  is_pilot?: boolean
  is_featured?: boolean
  operating_schedule?: CentreOperatingSchedule | null
  operating_hours_summary?: string | null
  latitude: number | null
  longitude: number | null
  coordinate_source?: CentreCoordinateSource
  coordinate_confidence?: CentreCoordinateConfidence | null
  contact_whatsapp?: string | null
  contact_phone?: string | null
  phone?: string | null
  existingApplicationId?: string | null
  existingApplicationStatus?: string | null
}

export type RawDirectoryCentre = Omit<
  DirectoryCentre,
  'subsidy_accepted' | 'is_claimed' | 'existingApplicationId' | 'existingApplicationStatus'
> & {
  subsidy_accepted: boolean | null
  is_claimed?: boolean | null
  existingApplicationId?: string | null
  existingApplicationStatus?: string | null
}
