import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
  } catch (error) {
    console.error(`FAIL: ${name}`)
    throw error
  }
}

const ownerInviteRoute = read('app/api/internal/platform-admin/centres/[id]/send-owner-invite/route.ts')
const staffInviteRoute = read('app/api/internal/platform-admin/invitations/route.ts')
const ecdInviteRoute = read('app/api/ecd/invitations/route.ts')
const onboardingLinks = read('lib/auth/onboarding-links.ts')

test('owner invite route enforces invite domain guard', () => {
  assert.match(ownerInviteRoute, /assertInviteDomainHealth\(\)/)
  assert.match(ownerInviteRoute, /invite_domain_misconfigured/)
  assert.match(ownerInviteRoute, /\{\s*status:\s*412\s*\}/)
})

test('staff invite route enforces invite domain guard', () => {
  assert.match(staffInviteRoute, /assertInviteDomainHealth\(\)/)
  assert.match(staffInviteRoute, /invite_domain_misconfigured/)
  assert.match(staffInviteRoute, /\{\s*status:\s*412\s*\}/)
})

test('invite link generation sanitizes to first-party confirm links', () => {
  assert.match(onboardingLinks, /buildFirstPartyConfirmLink\(/)
  assert.match(onboardingLinks, /generateMagicFirstAccessLink\(/)
  assert.match(onboardingLinks, /sanitizeGeneratedAccessLink\(/)
  assert.match(onboardingLinks, /resolveConfirmNextPathFromRedirect\(/)
})

test('invite link domain checks block supabase/vercel hosts', () => {
  assert.match(onboardingLinks, /\.supabase\.co/)
  assert.match(onboardingLinks, /\.vercel\.app/)
  assert.match(onboardingLinks, /assertInviteDomainHealth\(/)
})

test('existing parent migration logic remains active for owner and staff invite paths', () => {
  assert.match(ownerInviteRoute, /previousRole === 'parent_user'/)
  assert.match(ownerInviteRoute, /revokeParentAccess/)
  assert.match(staffInviteRoute, /previousRole === 'parent_user'/)
  assert.match(staffInviteRoute, /revokeParentAccess/)
})

test('ecd role sync remains active in owner and staff invite paths', () => {
  assert.match(ownerInviteRoute, /syncAuthUserMetadataRole/)
  assert.match(staffInviteRoute, /syncAuthUserMetadataRole/)
})

test('password setup links use first-party confirm links in invite routes', () => {
  assert.match(staffInviteRoute, /buildFirstPartyConfirmLink\(/)
  assert.match(staffInviteRoute, /sanitizeGeneratedAccessLink\(/)
  assert.match(ecdInviteRoute, /buildFirstPartyConfirmLink\(/)
  assert.match(ecdInviteRoute, /sanitizeGeneratedAccessLink\(/)
})

test('invite routes gate direct email attempts via SMTP eligibility helper', () => {
  assert.match(staffInviteRoute, /shouldAttemptDirectEmailForRecipient/)
  assert.match(ecdInviteRoute, /shouldAttemptDirectEmailForRecipient/)
})

console.log('Onboarding invite matrix smoke checks passed.')

