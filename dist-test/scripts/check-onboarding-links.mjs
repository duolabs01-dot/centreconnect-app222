import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
    {
        file: 'app/api/ecd/invitations/route.ts',
        mustInclude: ['coerceAuthCallbackRedirect(', 'generateMagicFirstAccessLink('],
        mustNotInclude: ["encodeURIComponent('/ecd/dashboard')", "encodeURIComponent(\"/ecd/dashboard\")"],
    },
    {
        file: 'app/api/internal/platform-admin/invitations/route.ts',
        mustInclude: ['coerceAuthCallbackRedirect(', 'generateMagicFirstAccessLink('],
        mustNotInclude: ["encodeURIComponent('/ecd/dashboard')", "encodeURIComponent(\"/ecd/dashboard\")"],
    },
    {
        file: 'app/api/internal/platform-admin/centres/[id]/send-owner-invite/route.ts',
        mustInclude: ['/ecd/welcome?onboarding=1', 'sanitizeGeneratedAccessLinkWithDiagnostics(', 'link_sanitization'],
        mustNotInclude: ["encodeURIComponent('/ecd/dashboard')", "encodeURIComponent(\"/ecd/dashboard\")"],
    },
    {
        file: 'app/api/ecd/resend-welcome-pack/route.ts',
        mustInclude: ["onboarding: '1'", 'sanitizeGeneratedAccessLinkWithDiagnostics('],
        mustNotInclude: ["buildUrl(appUrlRoot, '/ecd/login'"],
    },
    {
        file: 'lib/email/templates/pilot-welcome-pack.tsx',
        mustInclude: [
            'Open my welcome guide',
            'Add your first child',
            'Take attendance once',
            'Turn on safe pickup',
        ],
        mustNotInclude: ['<details', '<summary'],
    },
    {
        file: 'app/centre/[slug]/poster/page.tsx',
        mustInclude: ['Large QR code for', 'Print-ready gate poster', 'h-[70vw] w-[70vw]'],
        mustNotInclude: [],
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
    for (const token of check.mustInclude) {
        if (!content.includes(token)) {
            issues.push(`${check.file}: missing required token "${token}"`);
        }
    }
    for (const token of check.mustNotInclude) {
        if (content.includes(token)) {
            issues.push(`${check.file}: found forbidden token "${token}"`);
        }
    }
    if (Array.isArray(check.ordered) && check.ordered.length > 1) {
        let lastIndex = -1;
        for (const token of check.ordered) {
            const idx = content.indexOf(token);
            if (idx === -1) {
                issues.push(`${check.file}: missing ordered token "${token}"`);
                continue;
            }
            if (idx < lastIndex) {
                issues.push(`${check.file}: token order invalid around "${token}"`);
            }
            lastIndex = idx;
        }
    }
}
if (issues.length > 0) {
    console.error('Onboarding link checks failed:');
    for (const issue of issues) {
        console.error(`- ${issue}`);
    }
    process.exit(1);
}
console.log('Onboarding link checks passed.');
