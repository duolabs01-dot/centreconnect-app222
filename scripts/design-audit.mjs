#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SCAN_DIRS = ['app', 'components', 'lib']
const ALLOWED_EXT = new Set(['.ts', '.tsx', '.css'])

const HEX_EXEMPT_PATTERNS = [
  /^lib\/email\//,
  /^app\/centre\/\[slug\]\/poster\//,
  /^app\/driver\/\[token\]\//,
  /^app\/offline\//,
  /^tailwind\.config\./,
  /^scripts\//,
  /^app\/ecd\/\(portal\)\/transport\//,
  /^app\/manifest\./,
  /^app\/layout\./,
  /^components\/cc-admin\/HexHeatmap\./,
  /^components\/cc-admin\/MeshAreaChart\./,
  /^lib\/ui\/confetti\./,
  /^lib\/actions\/ecd\/welcome-pack\./,
  /^lib\/actions\/guardians\/send-invite\./,
  /^lib\/ecd\/parent-link-requests\./,
  /^lib\/payments\/billing-automation\./,
  /^lib\/payments\/receipts\./,
  /^lib\/ui\/centre-preview-image\./,
]

const HEX_FALSE_POSITIVES = ['#add']

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g

function isHexExempt(relPath) {
  return HEX_EXEMPT_PATTERNS.some(pattern => pattern.test(relPath))
}

const errors = []
const warnings = []

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(full))
      continue
    }
    if (!ALLOWED_EXT.has(path.extname(full))) continue
    out.push(full)
  }
  return out
}

function checkHex(file, text) {
  if (isHexExempt(file)) return
  const matches = text.match(HEX_RE)
  if (!matches) return
  for (const value of matches) {
    if (HEX_FALSE_POSITIVES.includes(value.toLowerCase())) continue
    errors.push(`${file}: raw hex color "${value}" found. Use semantic token classes/variables only.`)
  }
}

function checkDialogHierarchy(file, text) {
  if (!text.includes('<DialogTitle')) return
  if (!text.includes('<DialogHeader')) {
    errors.push(`${file}: DialogTitle found without DialogHeader.`)
  }

  if (text.includes('<DialogContent') && !text.includes('DialogClose')) {
    warnings.push(`${file}: DialogContent has no DialogClose usage detected. Ensure top-right close action exists.`)
  }
}

function checkSemanticUtilityHints(file, text) {
  if (!file.endsWith('.tsx')) return
  if (text.includes('bg-blue-') || text.includes('text-gray-') || text.includes('bg-red-')) {
    warnings.push(`${file}: literal utility color classes detected. Prefer semantic classes like bg-primary/text-muted.`)
  }
}

const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)))

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/')
  const text = fs.readFileSync(file, 'utf8')
  checkHex(rel, text)
  checkDialogHierarchy(rel, text)
  checkSemanticUtilityHints(rel, text)
}

if (warnings.length > 0) {
  console.log('\nDesign audit warnings:')
  for (const w of warnings) console.log(`- ${w}`)
}

if (errors.length > 0) {
  console.error('\nDesign audit errors:')
  for (const e of errors) console.error(`- ${e}`)
  process.exit(1)
}

console.log('Design audit passed.')
