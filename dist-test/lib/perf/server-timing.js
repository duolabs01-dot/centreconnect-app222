"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRoutePerf = startRoutePerf;
exports.logRoutePerf = logRoutePerf;
require("server-only");
function startRoutePerf(route) {
    return { route, startedAt: Date.now() };
}
function logRoutePerf(mark, meta) {
    const durationMs = Date.now() - mark.startedAt;
    const suffix = meta
        ? ` ${Object.entries(meta)
            .map(([k, v]) => `${k}=${v !== null && v !== void 0 ? v : 'null'}`)
            .join(' ')}`
        : '';
    console.info(`[route-perf] ${mark.route} ${durationMs}ms${suffix}`);
}
