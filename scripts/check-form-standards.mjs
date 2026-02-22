import fs from 'node:fs'
import path from 'node:path'

const ROOTS = ['app', 'components']
const EXTS = new Set(['.tsx', '.jsx'])
const IGNORE_DIRS = new Set(['node_modules', '.next', '.git'])

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, files)
      continue
    }
    if (EXTS.has(path.extname(entry.name))) files.push(full)
  }
  return files
}

function hasPremiumClass(tagSource) {
  return /className\s*=\s*(\{[^}]*cc-native-field[^}]*\}|["'`][^"'`]*cc-native-field[^"'`]*["'`])/s.test(tagSource)
}

function collectTagStarts(source, tagName) {
  const starts = []
  const rx = new RegExp(`<${tagName}\\b`, 'g')
  let match
  while ((match = rx.exec(source)) !== null) {
    starts.push(match.index)
  }
  return starts
}

const violations = []
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const normalized = file.replace(/\\/g, '/')
    if (normalized === 'components/ui/textarea.tsx') continue
    const source = fs.readFileSync(file, 'utf8')
    for (const idx of collectTagStarts(source, 'select')) {
      const window = source.slice(idx, idx + 700)
      if (!hasPremiumClass(window)) {
        violations.push(`${file}: raw <select> must include className with cc-native-field`)
      }
    }

    for (const idx of collectTagStarts(source, 'textarea')) {
      const window = source.slice(idx, idx + 700)
      if (!hasPremiumClass(window)) {
        violations.push(`${file}: raw <textarea> must include className with cc-native-field`)
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Form standard violations found:')
  for (const v of violations) console.error(`- ${v}`)
  process.exit(1)
}

console.log('Form standard check passed.')
