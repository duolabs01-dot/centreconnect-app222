const ECD_HERO_BY_SLUG: Record<string, string> = {
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
  'happy-trails-soweto':
    'https://images.pexels.com/photos/8363565/pexels-photo-8363565.jpeg?cs=srgb&dl=pexels-rdne-8363565.jpg&fm=jpg',
  'future-champs-ecd':
    'https://images.pexels.com/photos/8363052/pexels-photo-8363052.jpeg?cs=srgb&dl=pexels-rdne-8363052.jpg&fm=jpg',
  'tiny-treetops-soweto':
    'https://images.pexels.com/photos/8363017/pexels-photo-8363017.jpeg?cs=srgb&dl=pexels-rdne-8363017.jpg&fm=jpg',
  'bright-horizons-jabulani':
    'https://images.pexels.com/photos/8363089/pexels-photo-8363089.jpeg?cs=srgb&dl=pexels-rdne-8363089.jpg&fm=jpg',
  'bajabulile':
    '/centres/bajabulile/hero.jpg',
  'bajabulile-day-care-centre':
    '/centres/bajabulile/hero.jpg',
}

/** Slugs whose hero image is curated and must NOT be overridden by a database URL */
const CURATED_HERO_SLUGS = new Set([
  'bajabulile',
  'bajabulile-day-care-centre',
])

const DEFAULT_ECD_HERO =
  'https://images.pexels.com/photos/8363783/pexels-photo-8363783.jpeg?cs=srgb&dl=pexels-rdne-8363783.jpg&fm=jpg'

function isInvalidOrPlaceholder(input?: string | null) {
  if (!input) return true
  return input === '/hero-illustration.svg'
}

export function getCentreHeroImage(slug?: string | null, input?: string | null) {
  // Curated pilot centres always use the local hero — ignore any DB value
  if (slug && CURATED_HERO_SLUGS.has(slug)) return ECD_HERO_BY_SLUG[slug]
  if (!isInvalidOrPlaceholder(input)) return input as string
  if (slug && ECD_HERO_BY_SLUG[slug]) return ECD_HERO_BY_SLUG[slug]
  return DEFAULT_ECD_HERO
}

export function getSeedCentreHeroBySlug(slug: string) {
  return ECD_HERO_BY_SLUG[slug] ?? DEFAULT_ECD_HERO
}
