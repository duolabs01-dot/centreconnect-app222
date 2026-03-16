import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const content = fs.readFileSync(filePath, 'utf8')
  const parsed = {}
  for (const rawLine of content.split(/?
/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    parsed[key] = value
  }
  return parsed
}

function loadMergedEnv() {
  const root = process.cwd()
  return {
    ...parseEnvFile(path.join(root, '.env')),
    ...parseEnvFile(path.join(root, '.env.local')),
    ...process.env,
  }
}

async function main() {
  const env = loadMergedEnv()
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase
      .from('public_ecd_centres')
      .select('*')
      .ilike('name', `%Bajabulile%`)
      .maybeSingle()

    if (error) {
      console.error(`DB Error: ${error.message}`)
      process.exit(1)
    } else if (!data) {
      console.error(`Bajabulile not found in public_ecd_centres`)
      process.exit(1)
    } else {
      console.log(JSON.stringify(data, null, 2))
    }
  } else {
    console.warn(`Skipping DB check (missing Supabase env vars)`)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
