import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const content = fs.readFileSync(filePath, 'utf8')
  const parsed = {}
  for (const rawLine of content.split(/\r?\n/)) {
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
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase env vars')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
  const id = 'f580f125-81ed-412a-8d25-f187605a6a69'
  const newSlug = 'bajabulile-day-care-centre'

  console.log(`Updating slug for ID ${id} to "${newSlug}"...`)

  const { data, error } = await supabase
    .from('ecd_centres')
    .update({ slug: newSlug })
    .eq('id', id)
    .select('id, name, slug')
    .single()

  if (error) {
    console.error('Error updating slug:', error.message)
  } else {
    console.log('Update successful!')
    console.log('ID:', data.id)
    console.log('NAME:', data.name)
    console.log('NEW SLUG:', data.slug)
  }
}

main()
