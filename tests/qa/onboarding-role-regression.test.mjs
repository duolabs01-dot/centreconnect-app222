import assert from 'node:assert/strict'

function parseRole(value) {
  return value === 'platform_admin' ||
    value === 'ecd_admin' ||
    value === 'ecd_staff' ||
    value === 'ecd_supervisor' ||
    value === 'parent_user'
    ? value
    : null
}

function parseEcdRole(value) {
  return value === 'ecd_admin' || value === 'ecd_staff' || value === 'ecd_supervisor' ? value : null
}

function resolveProvisionRoleFromSignals(signals) {
  const roleFromExisting = parseRole(signals.existingProfileRole)
  if (roleFromExisting === 'platform_admin') {
    return { role: 'platform_admin', source: 'profile' }
  }

  if (roleFromExisting === 'ecd_admin' || roleFromExisting === 'ecd_staff' || roleFromExisting === 'ecd_supervisor') {
    return { role: roleFromExisting, source: 'profile' }
  }

  const roleFromMembership = parseEcdRole(signals.membershipRole)
  if (roleFromMembership) {
    return { role: roleFromMembership, source: 'membership' }
  }

  const roleFromInvitation = parseEcdRole(signals.invitationRole)
  if (roleFromInvitation) {
    return { role: roleFromInvitation, source: 'invitation' }
  }

  const roleFromMetadata = parseRole(signals.metadataRole)
  if (roleFromMetadata) {
    return { role: roleFromMetadata, source: 'metadata' }
  }

  return { role: 'parent_user', source: 'fallback' }
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

test('platform admin is never downgraded', () => {
  const resolved = resolveProvisionRoleFromSignals({
    existingProfileRole: 'platform_admin',
    membershipRole: 'ecd_admin',
    invitationRole: 'ecd_admin',
    metadataRole: 'parent_user',
  })
  assert.equal(resolved.role, 'platform_admin')
  assert.equal(resolved.source, 'profile')
})

test('existing ecd role beats stale parent metadata', () => {
  const resolved = resolveProvisionRoleFromSignals({
    existingProfileRole: 'ecd_admin',
    metadataRole: 'parent_user',
  })
  assert.equal(resolved.role, 'ecd_admin')
  assert.equal(resolved.source, 'profile')
})

test('membership beats invitation and metadata', () => {
  const resolved = resolveProvisionRoleFromSignals({
    existingProfileRole: 'parent_user',
    membershipRole: 'ecd_staff',
    invitationRole: 'ecd_admin',
    metadataRole: 'parent_user',
  })
  assert.equal(resolved.role, 'ecd_staff')
  assert.equal(resolved.source, 'membership')
})

test('invitation beats metadata for converted parents', () => {
  const resolved = resolveProvisionRoleFromSignals({
    existingProfileRole: 'parent_user',
    invitationRole: 'ecd_admin',
    metadataRole: 'parent_user',
  })
  assert.equal(resolved.role, 'ecd_admin')
  assert.equal(resolved.source, 'invitation')
})

test('metadata applies when no profile or ecd links exist', () => {
  const resolved = resolveProvisionRoleFromSignals({
    metadataRole: 'parent_user',
  })
  assert.equal(resolved.role, 'parent_user')
  assert.equal(resolved.source, 'metadata')
})

test('fallback is parent when no signals exist', () => {
  const resolved = resolveProvisionRoleFromSignals({})
  assert.equal(resolved.role, 'parent_user')
  assert.equal(resolved.source, 'fallback')
})

console.log('All onboarding role regression tests passed.')
