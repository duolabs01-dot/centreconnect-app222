const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3010'

const routes = [
  '/',
  '/directory',
  '/parent/dashboard',
  '/parent/applications',
  '/parent/profile',
  '/parent/notifications',
]

async function checkRoute(path) {
  const url = `${baseUrl}${path}`
  const started = Date.now()
  const response = await fetch(url, { redirect: 'manual' })
  const elapsed = Date.now() - started
  const ok =
    response.status === 200 ||
    response.status === 307 ||
    response.status === 308 ||
    response.status === 302

  return {
    path,
    status: response.status,
    elapsed,
    ok,
  }
}

async function main() {
  const results = await Promise.all(routes.map((route) => checkRoute(route)))

  for (const row of results) {
    console.log(`[smoke-parent] ${row.path} status=${row.status} t=${row.elapsed}ms`)
  }

  const failed = results.filter((row) => !row.ok)
  if (failed.length > 0) {
    console.error('[smoke-parent] FAILED routes:', failed.map((row) => row.path).join(', '))
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('[smoke-parent] fatal', error)
  process.exit(1)
})
