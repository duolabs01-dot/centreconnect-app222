import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(relPath) {
  const absolute = path.join(root, relPath)
  if (!fs.existsSync(absolute)) {
    throw new Error(`Missing file: ${relPath}`)
  }
  return fs.readFileSync(absolute, 'utf8')
}

const checks = [
  {
    file: 'lib/auth/provision-role.ts',
    mustInclude: [
      'export function resolveProvisionRoleFromSignals',
      "if (roleFromExisting === 'platform_admin')",
      'const roleFromMembership = parseEcdRole(signals.membershipRole)',
      'const roleFromInvitation = parseEcdRole(signals.invitationRole)',
      'const roleFromMetadata = parseRole(signals.metadataRole)',
      "return { role: 'parent_user', source: 'fallback' }",
    ],
    ordered: ['roleFromMembership', 'roleFromInvitation', 'roleFromMetadata'],
  },
  {
    file: 'app/auth/confirm/route.ts',
    mustInclude: [
      'resolveProvisionRole(',
      'syncAuthUserMetadataRole(',
      'const desiredRole = resolvedRole.role',
      "if (input.role === 'parent_user')",
      "await input.admin.from('parents').delete().eq('id', input.userId)",
    ],
    mustNotInclude: [
      "const desiredRole = sanitizeAllowedRole(user.user_metadata?.role ?? 'parent_user')",
      "const role = sanitizeAllowedRole(user.user_metadata?.role ?? 'parent_user')",
    ],
  },
  {
    file: 'app/api/auth/ensure-profile/route.ts',
    mustInclude: [
      'resolveProvisionRole(',
      'syncAuthUserMetadataRole(',
      'const roleToPersist = resolvedRole.role',
      "if (roleToPersist === 'parent_user')",
      "await admin.from('parents').delete().eq('id', user.id)",
    ],
    mustNotInclude: [
      "const roleToPersist = sanitizeAllowedRole(user.user_metadata?.role ?? 'parent_user')",
      "const role = sanitizeAllowedRole(user.user_metadata?.role ?? 'parent_user')",
    ],
  },
  {
    file: 'app/api/internal/platform-admin/invitations/route.ts',
    mustInclude: [
      'syncAuthUserMetadataRole(',
      "if (previousRole === 'parent_user')",
      'parentAccessRevoked',
      'manualAccessLink',
    ],
  },
  {
    file: 'app/api/ecd/invitations/route.ts',
    mustInclude: [
      'syncAuthUserMetadataRole(',
      "if (previousRole === 'parent_user')",
      'parentAccessRevoked',
      'inviteLinkMode',
    ],
  },
  {
    file: 'app/api/internal/platform-admin/centres/route.ts',
    mustInclude: [
      'syncAuthUserMetadataRole(',
      "if (reusedExistingUser && resolvedExistingRole === 'parent_user')",
      'parentAccessRevoked',
      'parentAccessRevocationError',
    ],
  },
]

const issues = []

for (const check of checks) {
  let source = ''
  try {
    source = read(check.file)
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error))
    continue
  }

  for (const token of check.mustInclude ?? []) {
    if (!source.includes(token)) {
      issues.push(`${check.file}: missing token "${token}"`)
    }
  }

  for (const token of check.mustNotInclude ?? []) {
    if (source.includes(token)) {
      issues.push(`${check.file}: found forbidden token "${token}"`)
    }
  }

  if (Array.isArray(check.ordered) && check.ordered.length > 1) {
    let previousIndex = -1
    for (const token of check.ordered) {
      const idx = source.indexOf(token)
      if (idx === -1) {
        issues.push(`${check.file}: missing ordered token "${token}"`)
        continue
      }
      if (idx < previousIndex) {
        issues.push(`${check.file}: invalid precedence order around "${token}"`)
      }
      previousIndex = idx
    }
  }
}

if (issues.length > 0) {
  console.error('Onboarding role integrity audit failed:')
  for (const issue of issues) {
    console.error(`- ${issue}`)
  }
  process.exit(1)
}

console.log('Onboarding role integrity audit passed.')
