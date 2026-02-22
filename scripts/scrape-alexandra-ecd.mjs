import fs from 'node:fs/promises'
import path from 'node:path'

const ALEX_VIEWBOX = '28.075,-26.055,28.145,-26.115'
const OUTPUT_JSON = path.resolve(process.cwd(), 'data', 'alexandra-ecd-scrape.json')
const OUTPUT_CSV = path.resolve(process.cwd(), 'data', 'alexandra-ecd-scrape.csv')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeName(value) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function csvEscape(value) {
  const text = String(value ?? '')
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

async function fetchOverpass() {
  const query =
    '[out:json][timeout:90];(' +
    'node["amenity"~"^(kindergarten|childcare)$"](-26.115,28.075,-26.055,28.145);' +
    'way["amenity"~"^(kindergarten|childcare)$"](-26.115,28.075,-26.055,28.145);' +
    'relation["amenity"~"^(kindergarten|childcare)$"](-26.115,28.075,-26.055,28.145);' +
    ');out center tags;'

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ]

  let payload = null
  let lastError = null
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: query }),
      })
      if (!response.ok) {
        lastError = new Error(`Overpass failed (${endpoint}): ${response.status}`)
        continue
      }
      payload = await response.json()
      break
    } catch (error) {
      lastError = error
    }
  }

  if (!payload) {
    throw lastError ?? new Error('Overpass failed across all endpoints')
  }

  return (payload.elements ?? []).map((item) => {
    const lat = item.lat ?? item.center?.lat ?? null
    const lon = item.lon ?? item.center?.lon ?? null
    const tags = item.tags ?? {}
    const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city']]
      .filter(Boolean)
      .join(', ')

    return {
      name: tags.name ?? null,
      source: 'openstreetmap_overpass',
      source_url: `https://www.openstreetmap.org/${item.type}/${item.id}`,
      lat,
      lon,
      address: address || null,
      phone: tags.phone ?? tags['contact:phone'] ?? null,
      email: tags.email ?? tags['contact:email'] ?? null,
      amenity: tags.amenity ?? null,
      confidence: 'high',
      raw_tags: tags,
    }
  })
}

function parseCojNamesFromHtml(html) {
  const marker = /The following ECD centre's took part in the games;([^.\n]+)/i.exec(html)
  if (!marker) return []
  return marker[1]
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

async function fetchCojNames() {
  const url =
    'https://joburg.org.za/media_/Newsroom/Pages/2022%20News%20Articles/April/The-City-hosts-annual-Kiddies-Games-in-the-heart-of-Alex.aspx'
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'centreconnect-scraper/1.0' },
    })
    if (!response.ok) {
      throw new Error(`CoJ page failed: ${response.status}`)
    }
    const html = await response.text()
    const parsed = parseCojNamesFromHtml(html)
    if (parsed.length > 0) {
      return parsed.map((name) => ({
        name,
        source: 'coj_kiddies_games_2022',
        source_url: url,
      }))
    }
  } catch {
    // Continue with a known fallback list if the source endpoint blocks TLS in this environment.
  }

  const fallbackNames = [
    'Mojadife',
    'Bophelong',
    'Sweeto',
    'Siyabangena',
    'Alex ECD',
    'Lukhanyiso',
    'Isolihle',
    'Zakhele',
    'Little Flowers',
  ]

  return fallbackNames.map((name) => ({
    name,
    source: 'coj_kiddies_games_2022_fallback',
    source_url: url,
  }))
}

async function geocodeInAlexandra(name) {
  const query = `${name}, Alexandra, Johannesburg`
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&viewbox=${encodeURIComponent(ALEX_VIEWBOX)}` +
    `&bounded=1&addressdetails=1&q=${encodeURIComponent(query)}`
  const response = await fetch(url, {
    headers: { 'User-Agent': 'centreconnect-scraper/1.0 (contact: local-run)' },
  })
  if (!response.ok) {
    return null
  }
  const rows = await response.json()
  const best = rows?.[0]
  if (!best) return null
  return {
    lat: best.lat ? Number(best.lat) : null,
    lon: best.lon ? Number(best.lon) : null,
    address: best.display_name ?? null,
    osm_type: best.osm_type ?? null,
    osm_id: best.osm_id ?? null,
  }
}

async function main() {
  const [overpassRows, cojRows] = await Promise.all([fetchOverpass(), fetchCojNames()])

  const enrichedCoj = []
  for (const row of cojRows) {
    const geo = await geocodeInAlexandra(row.name)
    enrichedCoj.push({
      name: row.name,
      source: row.source,
      source_url: row.source_url,
      lat: geo?.lat ?? null,
      lon: geo?.lon ?? null,
      address: geo?.address ?? null,
      phone: null,
      email: null,
      amenity: 'ecd',
      confidence: geo ? 'medium' : 'low',
      raw_tags: geo ?? null,
    })
    await sleep(700)
  }

  const merged = [...overpassRows, ...enrichedCoj]
  const dedup = new Map()

  for (const row of merged) {
    const key = normalizeName(row.name) || `${row.lat},${row.lon}`
    if (!key) continue
    const prev = dedup.get(key)
    if (!prev) {
      dedup.set(key, row)
      continue
    }

    const prefer =
      (prev.confidence === 'high' ? 2 : prev.confidence === 'medium' ? 1 : 0) >=
      (row.confidence === 'high' ? 2 : row.confidence === 'medium' ? 1 : 0)
        ? prev
        : row
    dedup.set(key, { ...prefer, source: `${prev.source}|${row.source}` })
  }

  const result = Array.from(dedup.values())
    .filter((row) => row.name)
    .sort((a, b) => a.name.localeCompare(b.name))

  await fs.mkdir(path.dirname(OUTPUT_JSON), { recursive: true })
  await fs.writeFile(
    OUTPUT_JSON,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        area: 'Alexandra, Johannesburg',
        records: result,
      },
      null,
      2
    ),
    'utf8'
  )

  const header = [
    'name',
    'source',
    'source_url',
    'lat',
    'lon',
    'address',
    'phone',
    'email',
    'amenity',
    'confidence',
  ]
  const lines = [header.join(',')]
  for (const row of result) {
    lines.push(
      [
        row.name,
        row.source,
        row.source_url,
        row.lat,
        row.lon,
        row.address,
        row.phone,
        row.email,
        row.amenity,
        row.confidence,
      ]
        .map(csvEscape)
        .join(',')
    )
  }
  await fs.writeFile(OUTPUT_CSV, `${lines.join('\n')}\n`, 'utf8')

  console.log(`Saved ${result.length} records`)
  console.log(`JSON: ${OUTPUT_JSON}`)
  console.log(`CSV : ${OUTPUT_CSV}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
