"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logBillingEvent = logBillingEvent;
require("server-only");
function logBillingEvent(event, payload = {}, level = 'info') {
    const entry = Object.assign({ ts: new Date().toISOString(), domain: 'billing', event }, payload);
    const line = JSON.stringify(entry);
    if (level === 'error') {
        console.error(line);
        return;
    }
    if (level === 'warn') {
        console.warn(line);
        return;
    }
    console.info(line);
}
