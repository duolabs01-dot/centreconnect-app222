"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSecurityEvent = logSecurityEvent;
const server_1 = require("@/lib/supabase/server");
const headers_1 = require("next/headers");
async function logSecurityEvent(parentId, eventType, details, metadata = {}) {
    var _a;
    const supabase = await (0, server_1.createClient)();
    const head = await (0, headers_1.headers)();
    const ip = ((_a = head.get('x-forwarded-for')) === null || _a === void 0 ? void 0 : _a.split(',')[0]) || 'unknown';
    const city = head.get('x-vercel-ip-city');
    const country = head.get('x-vercel-ip-country');
    const region = city && country ? `${city}, ${country}` : country || 'unknown';
    const ua = head.get('user-agent') || 'unknown';
    await supabase.from('parent_security_events').insert({
        parent_id: parentId,
        event_type: eventType,
        details,
        metadata,
        ip_address: ip,
        region,
        user_agent: ua
    });
}
