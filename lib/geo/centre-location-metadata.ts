export type CentreCoordinateSource =
  | "exact"
  | "geocoded"
  | "slug-fallback"
  | "suburb-fallback"
  | "city-fallback"
  | "address-fallback"
  | "missing"

export type CentreCoordinateConfidence = "high" | "medium" | "low"

export type CentreLocationMetadata = {
  source: CentreCoordinateSource
  confidence: CentreCoordinateConfidence
  provider?: string | null
  label?: string | null
  geocodedAt?: string | null
}

export function isTrustedDistanceSource(
  source: CentreCoordinateSource | null | undefined,
  confidence: CentreCoordinateConfidence | null | undefined
) {
  return source === 'exact' || (source === 'geocoded' && confidence === 'high')
}

export function defaultConfidenceForSource(source: CentreCoordinateSource): CentreCoordinateConfidence {
  if (source === 'exact') return 'high'
  if (source === 'geocoded') return 'medium'
  return 'low'
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function readCentreLocationMetadata(settings: unknown): CentreLocationMetadata | null {
  const settingsRecord = asRecord(settings)
  const tenantOverrides = asRecord(settingsRecord?.tenant_admin_overrides)
  const metadata = asRecord(tenantOverrides?.location_metadata)
  if (!metadata) return null

  const source = typeof metadata.source === "string" ? metadata.source : null
  const confidence = typeof metadata.confidence === "string" ? metadata.confidence : null
  if (!source || !confidence) return null

  return {
    source: source as CentreCoordinateSource,
    confidence: confidence as CentreCoordinateConfidence,
    provider: typeof metadata.provider === "string" ? metadata.provider : null,
    label: typeof metadata.label === "string" ? metadata.label : null,
    geocodedAt: typeof metadata.geocodedAt === "string" ? metadata.geocodedAt : null,
  }
}

export function writeCentreLocationMetadata(
  settings: unknown,
  metadata: CentreLocationMetadata
): Record<string, unknown> {
  const settingsRecord = asRecord(settings) ?? {}
  const tenantOverrides = asRecord(settingsRecord.tenant_admin_overrides) ?? {}

  return {
    ...settingsRecord,
    tenant_admin_overrides: {
      ...tenantOverrides,
      location_metadata: metadata,
    },
  }
}
