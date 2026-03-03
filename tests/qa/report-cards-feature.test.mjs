import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8')
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath))
}

let hasFailure = false

function check(name, fn) {
  try {
    fn()
    console.log(`PASS ${name}`)
  } catch (error) {
    hasFailure = true
    const message = error instanceof Error ? error.message : String(error)
    console.error(`FAIL ${name}: ${message}`)
  }
}

check('report cards migration exists', () => {
  assert.ok(exists('supabase/migrations/048_report_cards_feature.sql'))
})

check('report cards hardening migration exists', () => {
  assert.ok(exists('supabase/migrations/049_report_cards_hardening.sql'))
})

check('report cards migration defines core tables', () => {
  const sql = read('supabase/migrations/048_report_cards_feature.sql')
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.report_cards/i)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.report_card_areas/i)
  assert.match(sql, /ALTER TABLE public\.report_cards ENABLE ROW LEVEL SECURITY/i)
  assert.match(sql, /ALTER TABLE public\.report_card_areas ENABLE ROW LEVEL SECURITY/i)
})

check('report cards hardening adds period range check and updated_at trigger', () => {
  const sql = read('supabase/migrations/049_report_cards_hardening.sql')
  assert.match(sql, /report_cards_period_range_check/i)
  assert.match(sql, /period_start <= period_end/i)
  assert.match(sql, /CREATE TRIGGER update_report_cards_updated_at/i)
})

check('ECD report cards page and client exist', () => {
  assert.ok(exists('app/ecd/(portal)/report-cards/page.tsx'))
  assert.ok(exists('app/ecd/(portal)/report-cards/report-cards-client.tsx'))
})

check('Parent report cards page exists', () => {
  assert.ok(exists('app/(journey)/parent/report-cards/page.tsx'))
  assert.ok(exists('app/(journey)/parent/report-cards/loading.tsx'))
})

check('report card actions include save, publish, delete', () => {
  const source = read('lib/actions/ecd/report-cards.ts')
  assert.match(source, /export async function saveReportCardAction/)
  assert.match(source, /export async function publishReportCardAction/)
  assert.match(source, /export async function deleteReportCardAction/)
})

check('report card actions validate period order', () => {
  const source = read('lib/actions/ecd/report-cards.ts')
  assert.match(source, /periodEnd && periodStart > periodEnd/)
})

check('ECD navigation places Report Cards under communication group', () => {
  const source = read('components/layout/ecd-navigation.ts')
  assert.match(source, /href: '\/ecd\/report-cards'.*group: 'communication'/s)
})

console.log('')
if (hasFailure) {
  console.error('Some report card checks FAILED.')
  process.exit(1)
}
console.log('All report card checks PASSED.')
