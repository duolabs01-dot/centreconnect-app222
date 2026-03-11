var _a, _b;
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
    {
        file: 'app/(auth)/login/page.tsx',
        required: ['import { Button } from \'@/components/ui/button\'', 'import { Input } from \'@/components/ui/input\''],
        forbidden: [/<button\b/g],
    },
    {
        file: 'app/(auth)/register/page.tsx',
        required: ['import { Button } from \'@/components/ui/button\'', 'import { Input } from \'@/components/ui/input\''],
        forbidden: [/<button\b/g],
    },
    {
        file: 'app/reset-password/page.tsx',
        required: ['import { Button } from \'@/components/ui/button\'', 'import { Input } from \'@/components/ui/input\''],
        forbidden: [/<button\b/g],
    },
    {
        file: 'app/(journey)/ecd/welcome/CentreConnectWelcomePack.tsx',
        required: ['import { Button } from \'@/components/ui/button\''],
        forbidden: [/<button\b/g],
    },
    {
        file: 'app/(journey)/parent/discover/discover-client.tsx',
        required: ['import { Button } from \'@/components/ui/button\'', 'import { Input } from \'@/components/ui/input\''],
        forbidden: [/fontFamily:\s*['"]Orbitron/i],
    },
    {
        file: 'components/directory/DirectoryExplorer.tsx',
        required: ['import { Button } from \'@/components/ui/button\'', 'import { Input } from \'@/components/ui/input\''],
        forbidden: [/<button\b/g],
    },
    {
        file: 'components/parent/CentreCard.tsx',
        required: ['import { Button } from \'@/components/ui/button\''],
        forbidden: [/<button\b/g],
    },
];
const issues = [];
for (const check of checks) {
    const absolute = path.join(root, check.file);
    if (!fs.existsSync(absolute)) {
        issues.push(`${check.file}: file not found`);
        continue;
    }
    const content = fs.readFileSync(absolute, 'utf8');
    for (const token of (_a = check.required) !== null && _a !== void 0 ? _a : []) {
        if (!content.includes(token)) {
            issues.push(`${check.file}: missing required token "${token}"`);
        }
    }
    for (const pattern of (_b = check.forbidden) !== null && _b !== void 0 ? _b : []) {
        if (pattern.test(content)) {
            issues.push(`${check.file}: found forbidden pattern ${String(pattern)}`);
        }
    }
}
if (issues.length > 0) {
    console.error('Journey shadcn consistency check failed:');
    for (const issue of issues) {
        console.error(`- ${issue}`);
    }
    process.exit(1);
}
console.log('Journey shadcn consistency check passed.');
