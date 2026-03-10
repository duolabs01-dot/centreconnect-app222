import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
const projectRoot = process.cwd();
function walk(relativeDir) {
    const absoluteDir = resolve(projectRoot, relativeDir);
    const entries = readdirSync(absoluteDir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const childRelative = join(relativeDir, entry.name);
        const childAbsolute = resolve(projectRoot, childRelative);
        if (entry.isDirectory()) {
            files.push(...walk(childRelative));
            continue;
        }
        if (!entry.isFile())
            continue;
        if (/\.(ts|tsx|css)$/.test(entry.name)) {
            files.push(childRelative.replace(/\\/g, '/'));
        }
    }
    return files;
}
const targets = [
    ...walk('app/ecd/(portal)'),
    'components/layout/ecd-portal-sidebar.tsx',
    'components/layout/parent-app-shell.tsx',
];
const pattern = /\badmin-[A-Za-z0-9_-]+\b/g;
const violations = [];
for (const relativePath of targets) {
    const absPath = resolve(projectRoot, relativePath);
    if (!statSync(absPath).isFile())
        continue;
    const content = readFileSync(absPath, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
        const matches = [...line.matchAll(pattern)];
        for (const match of matches) {
            violations.push({
                file: relativePath,
                line: index + 1,
                token: match[0],
            });
        }
    });
}
if (violations.length > 0) {
    console.error('ECD light-theme guard failed. Remove admin-prefixed classes from ECD portal files:');
    for (const violation of violations) {
        console.error(`- ${violation.file}:${violation.line} -> ${violation.token}`);
    }
    process.exit(1);
}
console.log('ECD light-theme guard passed: no admin-prefixed classes found in ECD portal scope.');
