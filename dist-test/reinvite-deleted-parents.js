"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const delivery_1 = require("../lib/email/delivery");
const parent_rejoin_1 = require("../lib/email/templates/parent-rejoin");
function loadDotEnvLocal() {
    const envPath = node_path_1.default.resolve(process.cwd(), '.env.local');
    if (!node_fs_1.default.existsSync(envPath))
        return;
    const raw = node_fs_1.default.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const [key, ...rest] = trimmed.split('=');
        const value = rest.join('=');
        if (!key || process.env[key])
            continue;
        process.env[key] = value.replace(/^"|"$/g, '');
    }
}
loadDotEnvLocal();
const supportEmail = (_a = process.env.PARENT_SUPPORT_EMAIL) !== null && _a !== void 0 ? _a : 'admin@centerconnect.co.za';
const appBaseUrl = (_b = process.env.NEXT_PUBLIC_APP_URL) !== null && _b !== void 0 ? _b : 'https://centerconnect.co.za';
const fileArg = (_c = process.env.REJOIN_PARENT_EMAILS_FILE) !== null && _c !== void 0 ? _c : 'tmp/rejoin-parents.json';
const filePath = node_path_1.default.resolve(process.cwd(), fileArg);
if (!node_fs_1.default.existsSync(filePath)) {
    console.error(`Missing rejoin list: ${filePath}`);
    process.exit(1);
}
const rows = JSON.parse(node_fs_1.default.readFileSync(filePath, 'utf8'));
if (!Array.isArray(rows) || rows.length === 0) {
    console.error('The rejoin list must be a non-empty array of { email, name }.');
    process.exit(1);
}
async function send() {
    for (const entry of rows) {
        if (!(entry === null || entry === void 0 ? void 0 : entry.email))
            continue;
        const name = typeof entry.name === 'string' && entry.name.trim().length > 0 ? entry.name : 'Parent';
        const inviteLink = entry.inviteLink || `${appBaseUrl}/register`;
        const loginLink = entry.loginLink || `${appBaseUrl}/login`;
        const emailData = (0, parent_rejoin_1.renderParentRejoinEmail)({
            recipientName: name,
            inviteLink,
            loginLink,
            supportEmail,
            appBaseUrl,
        });
        const result = await (0, delivery_1.deliverTransactionalEmail)({
            to: entry.email,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
        });
        console.log(`${entry.email}: ${result.deliveryMessage}`);
    }
}
send().catch((error) => {
    console.error('Failed to send rejoin invites:', error);
    process.exit(1);
});
