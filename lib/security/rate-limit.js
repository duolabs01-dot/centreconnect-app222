"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceRateLimit = enforceRateLimit;
const buckets = new Map();
const UPSTASH_URL = ((_a = process.env.UPSTASH_REDIS_REST_URL) === null || _a === void 0 ? void 0 : _a.trim()) || '';
const UPSTASH_TOKEN = ((_b = process.env.UPSTASH_REDIS_REST_TOKEN) === null || _b === void 0 ? void 0 : _b.trim()) || '';
function now() {
    return Date.now();
}
function toBucketId(scope, key) {
    return `${scope}:${key}`;
}
function toRedisKey(scope, key) {
    return `rl:${scope}:${key}`;
}
function cleanupExpired(currentTime) {
    for (const [id, bucket] of buckets.entries()) {
        if (bucket.resetAt <= currentTime) {
            buckets.delete(id);
        }
    }
}
function toRetryAfterSec(resetAtMs, currentTime) {
    return Math.max(1, Math.ceil((resetAtMs - currentTime) / 1000));
}
async function enforceInMemoryRateLimit(input) {
    const currentTime = now();
    cleanupExpired(currentTime);
    const bucketId = toBucketId(input.scope, input.key);
    const existing = buckets.get(bucketId);
    if (!existing || existing.resetAt <= currentTime) {
        buckets.set(bucketId, {
            count: 1,
            resetAt: currentTime + input.windowMs,
        });
        return {
            ok: true,
            remaining: Math.max(0, input.max - 1),
            retryAfterSec: Math.ceil(input.windowMs / 1000),
        };
    }
    existing.count += 1;
    buckets.set(bucketId, existing);
    if (existing.count > input.max) {
        return {
            ok: false,
            remaining: 0,
            retryAfterSec: toRetryAfterSec(existing.resetAt, currentTime),
        };
    }
    return {
        ok: true,
        remaining: Math.max(0, input.max - existing.count),
        retryAfterSec: toRetryAfterSec(existing.resetAt, currentTime),
    };
}
function parseUpstashPipelineResult(payload) {
    if (!Array.isArray(payload))
        return [];
    return payload.map((entry) => {
        if (entry && typeof entry === 'object' && 'result' in entry) {
            return entry.result;
        }
        return null;
    });
}
async function enforceUpstashRateLimit(input) {
    if (!UPSTASH_URL || !UPSTASH_TOKEN)
        return null;
    const key = toRedisKey(input.scope, input.key);
    const headers = {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
    };
    try {
        const pipelineResponse = await fetch(`${UPSTASH_URL}/pipeline`, {
            method: 'POST',
            headers,
            body: JSON.stringify([
                ['INCR', key],
                ['PTTL', key],
            ]),
            cache: 'no-store',
        });
        if (!pipelineResponse.ok)
            return null;
        const pipelinePayload = (await pipelineResponse.json().catch(() => null));
        const [countRaw, ttlRaw] = parseUpstashPipelineResult(pipelinePayload);
        const count = Number(countRaw);
        let ttlMs = Number(ttlRaw);
        if (!Number.isFinite(count) || count <= 0)
            return null;
        if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
            const expireResponse = await fetch(`${UPSTASH_URL}/pexpire/${encodeURIComponent(key)}/${input.windowMs}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
                cache: 'no-store',
            });
            if (!expireResponse.ok)
                return null;
            ttlMs = input.windowMs;
        }
        const retryAfterSec = Math.max(1, Math.ceil(ttlMs / 1000));
        const ok = count <= input.max;
        return {
            ok,
            remaining: ok ? Math.max(0, input.max - count) : 0,
            retryAfterSec,
        };
    }
    catch (_a) {
        return null;
    }
}
async function enforceRateLimit(input) {
    const distributed = await enforceUpstashRateLimit(input);
    if (distributed)
        return distributed;
    return enforceInMemoryRateLimit(input);
}
