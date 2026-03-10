const SUBURB_COORDINATES: Record<string, { lat: number; lng: number }> = {
  alexandra: { lat: -26.1052, lng: 28.0872 },
  marlboro: { lat: -26.0891, lng: 28.0997 },
  wynberg: { lat: -26.0962, lng: 28.1034 },
  bramley: { lat: -26.0831, lng: 28.0876 },
  'linbro park': { lat: -26.0674, lng: 28.1188 },
  sandringham: { lat: -26.1292, lng: 28.0947 },
  kew: { lat: -26.1253, lng: 28.1027 },
  'orange grove': { lat: -26.1529, lng: 28.0929 },
  'lombardy east': { lat: -26.1252, lng: 28.1193 },
  johannesburg: { lat: -26.2041, lng: 28.0473 },
}

const SLUG_COORDINATES: Record<string, { lat: number; lng: number }> = {
  bajabulile: { lat: -26.1038, lng: 28.0916 },
  'bajabulile-day-care-centre': { lat: -26.1038, lng: 28.0916 },
}

function normalizeKey(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function hashSeed(value: string) {
  let hash = 0
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return hash
}

function offsetFallbackCoordinate(base: { lat: number; lng: number }, seedInput: string) {
  const seed = normalizeKey(seedInput)
  if (!seed) return base

  const hash = hashSeed(seed)
  const radiusMeters = 180 + (hash % 1100)
  const angle = ((hash >>> 8) % 360) * (Math.PI / 180)
  const latOffset = (radiusMeters / 111320) * Math.cos(angle)
  const lngOffset = (radiusMeters / (111320 * Math.cos((base.lat * Math.PI) / 180))) * Math.sin(angle)

  return {
    lat: Number((base.lat + latOffset).toFixed(6)),
    lng: Number((base.lng + lngOffset).toFixed(6)),
  }
}

export function toFiniteCoordinate(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function resolveCentreCoordinates(input: {
  latitude?: unknown
  longitude?: unknown
  slug?: string | null
  suburb?: string | null
  city?: string | null
  address?: string | null
}) {
  const latitude = toFiniteCoordinate(input.latitude)
  const longitude = toFiniteCoordinate(input.longitude)

  if (latitude != null && longitude != null) {
    return { latitude, longitude, source: 'exact' as const }
  }

  const slugMatch = SLUG_COORDINATES[normalizeKey(input.slug)]
  if (slugMatch) {
    return { latitude: slugMatch.lat, longitude: slugMatch.lng, source: 'slug-fallback' as const }
  }

  const suburbMatch = SUBURB_COORDINATES[normalizeKey(input.suburb)]
  if (suburbMatch) {
    const offset = offsetFallbackCoordinate(suburbMatch, input.slug || input.address || input.suburb || input.city || '')
    return { latitude: offset.lat, longitude: offset.lng, source: 'suburb-fallback' as const }
  }

  const cityMatch = SUBURB_COORDINATES[normalizeKey(input.city)]
  if (cityMatch) {
    const offset = offsetFallbackCoordinate(cityMatch, input.slug || input.address || input.city || '')
    return { latitude: offset.lat, longitude: offset.lng, source: 'city-fallback' as const }
  }

  const addressKey = normalizeKey(input.address)
  const addressMatch = Object.entries(SUBURB_COORDINATES).find(([key]) => key && addressKey.includes(key))?.[1]
  if (addressMatch) {
    const offset = offsetFallbackCoordinate(addressMatch, input.slug || input.address || '')
    return { latitude: offset.lat, longitude: offset.lng, source: 'address-fallback' as const }
  }

  return { latitude: null, longitude: null, source: 'missing' as const }
}

export function getLocationReference(input: { suburb?: string | null; city?: string | null }) {
  const suburbMatch = SUBURB_COORDINATES[normalizeKey(input.suburb)]
  if (suburbMatch) return [suburbMatch.lng, suburbMatch.lat] as [number, number]

  const cityMatch = SUBURB_COORDINATES[normalizeKey(input.city)]
  if (cityMatch) return [cityMatch.lng, cityMatch.lat] as [number, number]

  return [SUBURB_COORDINATES.alexandra.lng, SUBURB_COORDINATES.alexandra.lat] as [number, number]
}
