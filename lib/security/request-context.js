"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientIp = getClientIp;
exports.getClientAgent = getClientAgent;
function getClientIp(request) {
    var _a, _b;
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        const first = (_a = forwardedFor.split(',')[0]) === null || _a === void 0 ? void 0 : _a.trim();
        if (first)
            return first;
    }
    const realIp = (_b = request.headers.get('x-real-ip')) === null || _b === void 0 ? void 0 : _b.trim();
    if (realIp)
        return realIp;
    return 'unknown';
}
function getClientAgent(request) {
    var _a;
    return ((_a = request.headers.get('user-agent')) === null || _a === void 0 ? void 0 : _a.trim()) || 'unknown';
}
