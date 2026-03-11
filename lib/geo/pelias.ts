import { CentreCoordinateConfidence } from "@/lib/geo/centre-location-metadata"

export type PeliasGeocodeResult = {
  latitude: number
  longitude: number
  label: string | null
  confidence: CentreCoordinateConfidence
}

type PeliasFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    label?: string
    confidence?: number
  }
}

function getPeliasApiUrl() {
  const raw = process.env.PELIAS_API_URL?.trim()
  if (!raw) return null
  return raw.replace(/\/$/, '')
}

function toConfidence(value: number | undefined): CentreCoordinateConfidence {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'medium'
  if (value >= 0.85) return 'high'
  if (value >= 0.6) return 'medium'
  return 'low'
}

export async function geocodeAddressWithPelias(input: {
  address?: string | null
  suburb?: string | null
  city?: string | null
  country?: string | null
}): Promise<PeliasGeocodeResult | null> {
  const apiUrl = getPeliasApiUrl()
  if (!apiUrl) return null

  const text = [input.address, input.suburb, input.city, input.country || 'South Africa']
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(', ')

  if (!text) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const url = new URL(`${apiUrl}/v1/search`)
    url.searchParams.set('text', text)
    url.searchParams.set('size', '1')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json().catch(() => null)) as { features?: PeliasFeature[] } | null
    const feature = payload?.features?.[0]
    const coordinates = feature?.geometry?.coordinates
    if (!coordinates || coordinates.length < 2) return null

    const [longitude, latitude] = coordinates
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

    return {
      latitude,
      longitude,
      label: feature?.properties?.label ?? null,
      confidence: toConfidence(feature?.properties?.confidence),
    }
  } catch (error) {
    console.error('[pelias] geocode failed', error)
    return null
  } finally {
    clearTimeout(timeout)
  }
}
