import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'
import path from 'node:path'

const BUCKET_NAME = 'ecd-media-testing'

async function parseEnvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    const parsed = {}
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      parsed[key] = value;
    }
    return parsed;
  } catch {
    return {}
  }
}

async function loadMergedEnv() {
  const root = process.cwd()
  const localEnv = await parseEnvFile(path.join(root, '.env.local'))
  const globalEnv = await parseEnvFile(path.join(root, '.env'))
  return { ...globalEnv, ...localEnv, ...process.env }
}


async function main() {
  const args = new Set(process.argv.slice(2))
  const isCleanup = args.has('--cleanup')
  const env = await loadMergedEnv()

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials.')
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey)

  if (isCleanup) {
    console.log(`Attempting to delete bucket: ${BUCKET_NAME}...`)
    const { error } = await admin.storage.deleteBucket(BUCKET_NAME)
    if (error) {
      console.error(`Failed to delete bucket: ${error.message}`)
    } else {
      console.log(`Bucket ${BUCKET_NAME} deleted successfully.`)
    }
  } else {
    console.log(`Attempting to create bucket: ${BUCKET_NAME}...`)
    const { data, error } = await admin.storage.createBucket(BUCKET_NAME, {
      public: true, // Make it public for easier testing
    })
    if (error) {
      console.error(`Failed to create bucket: ${error.message}`)
    } else {
      console.log(`Bucket ${BUCKET_NAME} created successfully.`)
    }
  }
}

main().catch(console.error)
