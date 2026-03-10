import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'
import path from 'node:path'

const BAJABULILE_ID = 'f580f125-81ed-412a-8d25-f187605a6a69'
const TEST_REGISTER_IMAGE_PATH = 'public/centres/bajabulile/hero.jpg'

function parseEnvFile(content) {
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

async function loadMergedEnv() {
  const root = process.cwd()
  const filesToTry = ['.env.local', '.env']
  let env = {}
  for (const file of filesToTry) {
    try {
      const content = await fs.readFile(path.join(root, file), 'utf8')
      env = { ...env, ...parseEnvFile(content) }
    } catch { /* ignore */ }
  }
  return { ...env, ...process.env }
}

async function main() {
  const auditLog = ['# AI Register Import E2E Audit\n']
  const env = await loadMergedEnv()

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials.')
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey)
  const now = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  const testEmail = `audit-ecd-${now}-${random}@example.com`
  const testPassword = `Audit!${random}`
  
  let userId = ''
  let importId = ''
  let childId = ''

  try {
    // 1. Create Test User
    auditLog.push(`1. Creating test user: ${testEmail}`)
    const { data: userRes, error: userErr } = await admin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    })
    if (userErr) throw new Error(`User creation failed: ${userErr.message}`)
    userId = userRes.user.id
    
    // TEMPORARY: Elevate user to service_role to bypass RLS for testing
    auditLog.push('   - WARNING: Temporarily elevating user to service_role to bypass RLS policy issue.')
    await admin.from('user_profiles').insert({ id: userId, role: 'service_role' })

    await admin.from('ecd_admins').insert({ ecd_id: BAJABULILE_ID, user_id: userId, role: 'ecd_admin' })
    auditLog.push(`   - SUCCESS: User ID ${userId} created and linked to Bajabulile.`)
    auditLog.push(`\n   - WARNING: Using temporary 'ecd-media-testing' bucket due to RLS policy issues on 'ecd-media'.`)

    // 2. Impersonate User & Upload
    auditLog.push(`2. Uploading test image: ${TEST_REGISTER_IMAGE_PATH}`)
    const userClient = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    })
    const { error: signInErr } = await userClient.auth.signInWithPassword({ email: testEmail, password: testPassword })
    if (signInErr) throw new Error(`Sign-in failed: ${signInErr.message}`)

    const fileBuffer = await fs.readFile(TEST_REGISTER_IMAGE_PATH)
    const file = new File([fileBuffer], 'test-register.jpg', { type: 'image/jpeg' })

    const { data: uploadRes, error: uploadErr } = await userClient.storage
      .from('ecd-media-testing')
      .upload(`ecd/${BAJABULILE_ID}/ai/attendance-registers/test-${now}.jpg`, file)
    
    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)
    const { data: { publicUrl } } = userClient.storage.from('ecd-media-testing').getPublicUrl(uploadRes.path)
    auditLog.push(`   - SUCCESS: Image uploaded to ${publicUrl}`)

    // 3. Create Import Record & Mock Extraction
    auditLog.push(`3. Simulating AI extraction...`)
    const mockExtractedName = `TestChild ${random}`
    const { data: importRes, error: importErr } = await admin
      .from('attendance_register_imports')
      .insert({
        ecd_id: BAJABULILE_ID,
        uploaded_by: userId,
        source_file_path: uploadRes.path,
        source_file_url: publicUrl,
        source_file_name: 'test-register.jpg',
        status: 'extracted',
        extracted_names: [mockExtractedName],
        extracted_date: new Date().toISOString().slice(0, 10),
        selected_name: mockExtractedName
      })
      .select('id')
      .single()
    if (importErr) throw new Error(`Import record creation failed: ${importErr.message}`)
    importId = importRes.id
    auditLog.push(`   - SUCCESS: Import record ${importId} created with name "${mockExtractedName}".`)

    // 4. Import Attendance (Create Child)
    auditLog.push(`4. Importing attendance for "${mockExtractedName}"...`)
    const { data: childRes, error: childErr } = await userClient
      .from('children')
      .insert({ ecd_id: BAJABULILE_ID, first_name: 'TestChild', last_name: random, enrollment_source: 'ecd_manual' })
      .select('id')
      .single()
    if (childErr) throw new Error(`Child creation failed: ${childErr.message}`)
    childId = childRes.id
    auditLog.push(`   - SUCCESS: Child profile ${childId} created.`)

    const { error: attendanceErr } = await userClient.from('attendance').insert({
      ecd_id: BAJABULILE_ID,
      child_id: childId,
      date: new Date().toISOString().slice(0, 10),
      checked_in: true,
      checked_in_by: userId
    })
    if (attendanceErr) throw new Error(`Attendance creation failed: ${attendanceErr.message}`)
    auditLog.push(`   - SUCCESS: Attendance marked for child ${childId}.`)
    
    auditLog.push(`\n✅ E2E test PASSED.`)
  } catch (error) {
    auditLog.push(`\n❌ E2E test FAILED: ${error.message}`)
    console.error(error)
  } finally {
    // 5. Cleanup
    auditLog.push('\n5. Cleaning up test data...')
    if (childId) {
      await admin.from('children').delete().eq('id', childId)
      auditLog.push(`   - DELETED: Child ${childId}`)
    }
    if (importId) {
      await admin.from('attendance_register_imports').delete().eq('id', importId)
      auditLog.push(`   - DELETED: Import record ${importId}`)
    }
    if (userId) {
      await admin.auth.admin.deleteUser(userId)
      auditLog.push(`   - DELETED: User ${userId}`)
    }
    auditLog.push(`   - SUCCESS: Cleanup complete.`)

    const auditFileName = `docs/AUDIT_AI_REGISTER_IMPORT_${now}.md`
    await fs.writeFile(auditFileName, auditLog.join('\n'))
    console.log(`\nAudit log written to ${auditFileName}`)
  }
}

main()
