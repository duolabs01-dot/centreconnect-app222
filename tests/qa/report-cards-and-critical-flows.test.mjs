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

// ═══════════════════════════════════════════════════════════════
// Report Cards — DB migration
// ═══════════════════════════════════════════════════════════════
check('report_cards migration creates report_cards table', () => {
  const sql = read('supabase/migrations/20260303_001_report_cards.sql')
  assert.match(sql, /CREATE TABLE IF NOT EXISTS report_cards/)
  assert.match(sql, /ecd_id\s+UUID NOT NULL REFERENCES ecd_centres/)
  assert.match(sql, /child_id\s+UUID NOT NULL REFERENCES children/)
  assert.match(sql, /status\s+TEXT NOT NULL DEFAULT 'draft'/)
  assert.match(sql, /UNIQUE\(ecd_id, child_id, term\)/)
})

check('report_cards migration creates report_card_areas table', () => {
  const sql = read('supabase/migrations/20260303_001_report_cards.sql')
  assert.match(sql, /CREATE TABLE IF NOT EXISTS report_card_areas/)
  assert.match(sql, /report_card_id\s+UUID NOT NULL REFERENCES report_cards/)
  assert.match(sql, /rating\s+INTEGER NOT NULL CHECK \(rating >= 1 AND rating <= 5\)/)
})

check('report_cards migration enables RLS on both tables', () => {
  const sql = read('supabase/migrations/20260303_001_report_cards.sql')
  assert.match(sql, /ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY/)
  assert.match(sql, /ALTER TABLE report_card_areas ENABLE ROW LEVEL SECURITY/)
  assert.match(sql, /ALTER TABLE report_cards FORCE ROW LEVEL SECURITY/)
  assert.match(sql, /ALTER TABLE report_card_areas FORCE ROW LEVEL SECURITY/)
})

check('report_cards RLS has ECD staff policy', () => {
  const sql = read('supabase/migrations/20260303_001_report_cards.sql')
  assert.match(sql, /CREATE POLICY "report_cards_ecd_all"/)
  assert.match(sql, /ecd_admins/)
})

check('report_cards RLS has parent read policy with enrolled check', () => {
  const sql = read('supabase/migrations/20260303_001_report_cards.sql')
  assert.match(sql, /CREATE POLICY "report_cards_parent_read"/)
  assert.match(sql, /status = 'published'/)
  assert.match(sql, /a\.status = 'enrolled'/)
})

check('report_card_areas RLS inherits from parent report card', () => {
  const sql = read('supabase/migrations/20260303_001_report_cards.sql')
  assert.match(sql, /CREATE POLICY "report_card_areas_ecd_all"/)
  assert.match(sql, /CREATE POLICY "report_card_areas_parent_read"/)
})

check('report_cards migration creates performance indexes', () => {
  const sql = read('supabase/migrations/20260303_001_report_cards.sql')
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_report_cards_ecd_id/)
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_report_cards_child_id/)
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_report_card_areas_report/)
})

// ═══════════════════════════════════════════════════════════════
// Report Cards — Server actions
// ═══════════════════════════════════════════════════════════════
check('report-cards server actions are marked "use server"', () => {
  const source = read('lib/actions/ecd/report-cards.ts')
  assert.match(source, /^'use server'/)
})

check('saveReportCardAction validates input with zod', () => {
  const source = read('lib/actions/ecd/report-cards.ts')
  assert.match(source, /saveReportCardSchema\.safeParse/)
  assert.match(source, /requireEcdPortalSession/)
})

check('saveReportCardAction verifies child belongs to centre', () => {
  const source = read('lib/actions/ecd/report-cards.ts')
  assert.match(source, /Child not found in your centre/)
})

check('publishReportCardAction sets status to published', () => {
  const source = read('lib/actions/ecd/report-cards.ts')
  assert.match(source, /status: 'published'/)
  assert.match(source, /published_at/)
})

check('deleteReportCardAction prevents deleting published report cards', () => {
  const source = read('lib/actions/ecd/report-cards.ts')
  assert.match(source, /Cannot delete a published report card/)
})

check('report-cards actions export DEFAULT_DEVELOPMENT_AREAS', () => {
  const source = read('lib/actions/ecd/report-cards.ts')
  assert.match(source, /DEFAULT_DEVELOPMENT_AREAS/)
  assert.match(source, /Language & Literacy/)
  assert.match(source, /Numeracy & Mathematics/)
})

// ═══════════════════════════════════════════════════════════════
// Report Cards — ECD Portal UI
// ═══════════════════════════════════════════════════════════════
check('ECD report-cards page.tsx uses requireEcdPortalSession', () => {
  const source = read('app/ecd/(portal)/report-cards/page.tsx')
  assert.match(source, /requireEcdPortalSession/)
  assert.match(source, /report_cards/)
  assert.match(source, /report_card_areas/)
})

check('ECD report-cards client is a use client component', () => {
  const source = read('app/ecd/(portal)/report-cards/report-cards-client.tsx')
  assert.match(source, /^'use client'/)
})

check('ECD report-cards client has create/edit/list views', () => {
  const source = read('app/ecd/(portal)/report-cards/report-cards-client.tsx')
  assert.match(source, /view === 'list'/)
  assert.match(source, /view === 'create'/)
  assert.match(source, /view === 'edit'/)
})

check('ECD report-cards client uses star rating component', () => {
  const source = read('app/ecd/(portal)/report-cards/report-cards-client.tsx')
  assert.match(source, /StarRating/)
})

check('ECD report-cards client selects conform to cc-native-field', () => {
  const source = read('app/ecd/(portal)/report-cards/report-cards-client.tsx')
  const selectMatches = source.match(/<select/g)
  const nativeFieldMatches = source.match(/cc-native-field/g)
  assert.ok(selectMatches, 'Should have select elements')
  assert.ok(nativeFieldMatches, 'Should have cc-native-field classes')
  assert.equal(selectMatches.length, nativeFieldMatches.length, 'Every select should have cc-native-field')
})

check('ECD report-cards uses rounded-2xl buttons', () => {
  const source = read('app/ecd/(portal)/report-cards/report-cards-client.tsx')
  assert.match(source, /rounded-2xl/)
  assert.doesNotMatch(source, /admin-/, 'No admin-prefixed classes in ECD portal')
})

// ═══════════════════════════════════════════════════════════════
// Report Cards — Parent Portal UI
// ═══════════════════════════════════════════════════════════════
check('parent report-cards page exists', () => {
  assert.ok(exists('app/(journey)/parent/report-cards/page.tsx'))
  assert.ok(exists('app/(journey)/parent/report-cards/loading.tsx'))
})

check('parent report-cards page requires auth', () => {
  const source = read('app/(journey)/parent/report-cards/page.tsx')
  assert.match(source, /supabase\.auth\.getUser/)
  assert.match(source, /redirect\('\/login'\)/)
})

check('parent report-cards page only shows published reports', () => {
  const source = read('app/(journey)/parent/report-cards/page.tsx')
  assert.match(source, /\.eq\('status', 'published'\)/)
})

check('parent report-cards has star display and progress bars', () => {
  const source = read('app/(journey)/parent/report-cards/page.tsx')
  assert.match(source, /StarDisplay/)
  assert.match(source, /fill-amber-400/)
  assert.match(source, /rounded-full/)
})

check('parent report-cards displays teacher comments', () => {
  const source = read('app/(journey)/parent/report-cards/page.tsx')
  assert.match(source, /Teacher.*Comment/)
  assert.match(source, /overall_comment/)
})

// ═══════════════════════════════════════════════════════════════
// Navigation — Report Cards promoted from Coming Soon
// ═══════════════════════════════════════════════════════════════
check('ECD navigation promotes Report Cards from coming_soon to communication group', () => {
  const source = read('components/layout/ecd-navigation.ts')
  const reportCardsLine = source.split('\n').find(l => l.includes("'/ecd/report-cards'"))
  assert.ok(reportCardsLine, 'Report Cards nav entry should exist')
  assert.match(reportCardsLine, /group: 'communication'/)
  assert.doesNotMatch(reportCardsLine, /comingSoon/)
})

// ═══════════════════════════════════════════════════════════════
// Critical flow checks — Auth sign-in/sign-out
// ═══════════════════════════════════════════════════════════════
check('auth middleware has protected path detection', () => {
  const source = read('middleware.ts')
  assert.match(source, /isProtectedPath/)
  assert.match(source, /hasSupabaseSessionCookie/)
})

check('ECD login page exists', () => {
  assert.ok(exists('app/ecd/login'))
})

check('parent layout requires auth and redirects to login', () => {
  const source = read('app/(journey)/parent/layout.tsx')
  assert.match(source, /redirect\('\/login'\)/)
  assert.match(source, /supabase\.auth\.getUser/)
})

// ═══════════════════════════════════════════════════════════════
// Critical flow checks — Parent applications + details
// ═══════════════════════════════════════════════════════════════
check('parent applications page exists and is accessible', () => {
  assert.ok(exists('app/(journey)/parent/applications'))
})

// ═══════════════════════════════════════════════════════════════
// Critical flow checks — Parent profile routes (bottom nav hidden)
// ═══════════════════════════════════════════════════════════════
check('parent profile hides bottom nav on profile routes', () => {
  const source = read('lib/navigation/parent-bottom-nav.ts')
  assert.match(source, /\/parent\/profile/)
  assert.match(source, /shouldHideParentBottomNav/)
})

// ═══════════════════════════════════════════════════════════════
// Critical flow checks — ECD applications open links
// ═══════════════════════════════════════════════════════════════
check('ECD applications page exists', () => {
  assert.ok(exists('app/ecd/(portal)/applications'))
})

// ═══════════════════════════════════════════════════════════════
// Critical flow checks — AI register import flow
// ═══════════════════════════════════════════════════════════════
check('AI upload page exists in ECD portal', () => {
  assert.ok(exists('app/ecd/(portal)/ai-upload'))
})

check('child enrollment actions have AI extraction flow', () => {
  const source = read('app/ecd/(portal)/children/new/actions.ts')
  assert.match(source, /extractChildDocumentWithGeminiAction/)
  assert.match(source, /extractStructuredDocumentWithGemini/)
})

// ═══════════════════════════════════════════════════════════════
// Style guards
// ═══════════════════════════════════════════════════════════════
check('no admin-prefixed classes in ECD portal files', () => {
  const ecdFiles = [
    'app/ecd/(portal)/report-cards/page.tsx',
    'app/ecd/(portal)/report-cards/report-cards-client.tsx',
    'app/ecd/(portal)/report-cards/loading.tsx',
  ]
  for (const f of ecdFiles) {
    const source = read(f)
    assert.doesNotMatch(source, /className="[^"]*admin-/, `${f} should not contain admin-prefixed classes`)
  }
})

// ═══════════════════════════════════════════════════════════════
console.log('')
if (hasFailure) {
  console.error('Some tests FAILED.')
  process.exit(1)
} else {
  console.log('All tests PASSED.')
}
