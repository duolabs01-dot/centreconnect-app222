import 'server-only'

type RoutePerfMeta = Record<string, string | number | boolean | null | undefined>

export function startRoutePerf(route: string) {
  return { route, startedAt: Date.now() }
}

export function logRoutePerf(
  mark: { route: string; startedAt: number },
  meta?: RoutePerfMeta
) {
  const durationMs = Date.now() - mark.startedAt
  const suffix = meta
    ? ` ${Object.entries(meta)
        .map(([k, v]) => `${k}=${v ?? 'null'}`)
        .join(' ')}`
    : ''
  console.info(`[route-perf] ${mark.route} ${durationMs}ms${suffix}`)
}
