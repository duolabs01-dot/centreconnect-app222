"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveInvoicePeriodStart = resolveInvoicePeriodStart;
exports.generateMonthlySubscriptionInvoices = generateMonthlySubscriptionInvoices;
require("server-only");
const activity_log_1 = require("@/lib/admin/activity-log");
const platform_admin_action_notification_1 = require("@/lib/email/platform-admin-action-notification");
const MS_PER_DAY = 24 * 60 * 60 * 1000;
function normalizeOne(value) {
    var _a;
    if (!value)
        return null;
    return Array.isArray(value) ? (_a = value[0]) !== null && _a !== void 0 ? _a : null : value;
}
function startOfMonthUtc(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}
function addMonthsUtc(date, months) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0));
}
function startOfUtcDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}
function daysBetween(start, end) {
    const diff = end.getTime() - start.getTime();
    if (diff <= 0)
        return 0;
    return Math.round(diff / MS_PER_DAY);
}
function roundCurrency(value) {
    return Math.round(value * 100) / 100;
}
function parseIsoDate(value) {
    if (!value)
        return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return null;
    return parsed;
}
function periodTag(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
}
function invoiceNumberFor(ecdId, tag) {
    const compact = ecdId.replace(/-/g, '').slice(0, 8).toUpperCase();
    return `INV-${tag}-${compact}`;
}
function buildDueAt(periodStart, now) {
    const dueAt = new Date(periodStart);
    dueAt.setUTCDate(7);
    if (dueAt.getTime() <= now.getTime()) {
        const fallback = startOfUtcDay(now);
        fallback.setUTCDate(fallback.getUTCDate() + 7);
        return fallback;
    }
    return dueAt;
}
function resolveInvoicePeriodStart(period, now = new Date()) {
    if (!period)
        return startOfMonthUtc(now);
    const match = period.match(/^(\d{4})-(\d{2})$/);
    if (!match)
        return startOfMonthUtc(now);
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return startOfMonthUtc(now);
    }
    return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}
async function generateMonthlySubscriptionInvoices(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    const now = (_a = input.now) !== null && _a !== void 0 ? _a : new Date();
    const periodStart = startOfMonthUtc((_b = input.periodStart) !== null && _b !== void 0 ? _b : now);
    const periodEnd = addMonthsUtc(periodStart, 1);
    const dueAt = buildDueAt(periodStart, now);
    const tag = periodTag(periodStart);
    const periodDays = daysBetween(periodStart, periodEnd);
    const { data: subscriptions, error: subscriptionError } = await input.admin
        .from('subscriptions')
        .select('id,ecd_id,tier,status,monthly_price,current_period_start,created_at,ecd_centres(name,slug,is_active)')
        .in('status', ['trial', 'active', 'past_due']);
    if (subscriptionError) {
        throw new Error(subscriptionError.message);
    }
    const scannedSubscriptions = (subscriptions !== null && subscriptions !== void 0 ? subscriptions : []).length;
    const candidateSubscriptions = (subscriptions !== null && subscriptions !== void 0 ? subscriptions : []).filter((sub) => {
        const centre = normalizeOne(sub.ecd_centres);
        return Boolean(centre === null || centre === void 0 ? void 0 : centre.is_active);
    });
    let skippedNonBillable = 0;
    const toInsert = [];
    for (const sub of candidateSubscriptions) {
        const monthlyPrice = Number((_c = sub.monthly_price) !== null && _c !== void 0 ? _c : 0);
        if (!Number.isFinite(monthlyPrice) || monthlyPrice <= 0) {
            skippedNonBillable += 1;
            continue;
        }
        const effectiveStartRaw = (_e = (_d = parseIsoDate(sub.current_period_start)) !== null && _d !== void 0 ? _d : parseIsoDate(sub.created_at)) !== null && _e !== void 0 ? _e : periodStart;
        const effectiveStart = startOfUtcDay(effectiveStartRaw);
        if (effectiveStart.getTime() >= periodEnd.getTime()) {
            skippedNonBillable += 1;
            continue;
        }
        const billableStart = effectiveStart.getTime() > periodStart.getTime() ? effectiveStart : periodStart;
        const billableDays = daysBetween(billableStart, periodEnd);
        if (billableDays <= 0) {
            skippedNonBillable += 1;
            continue;
        }
        const isProrated = billableDays < periodDays;
        const computedAmount = isProrated ? monthlyPrice * (billableDays / periodDays) : monthlyPrice;
        const amount = roundCurrency(computedAmount);
        if (amount <= 0) {
            skippedNonBillable += 1;
            continue;
        }
        const lineItem = isProrated
            ? {
                type: 'subscription',
                tier: sub.tier,
                period: tag,
                amount,
                quantity: 1,
                proration: {
                    billableDays,
                    periodDays,
                    startedAt: billableStart.toISOString(),
                },
            }
            : {
                type: 'subscription',
                tier: sub.tier,
                period: tag,
                amount,
                quantity: 1,
            };
        toInsert.push({
            invoice_number: invoiceNumberFor(sub.ecd_id, tag),
            ecd_id: sub.ecd_id,
            subscription_id: sub.id,
            subtotal: amount,
            tax: 0,
            total: amount,
            status: 'draft',
            due_at: dueAt.toISOString(),
            line_items: [lineItem],
            notes: isProrated
                ? `Auto-generated prorated monthly invoice for ${tag} (${billableDays}/${periodDays} days).`
                : `Auto-generated monthly invoice for ${tag}.`,
        });
    }
    let generated = 0;
    if (toInsert.length > 0) {
        const { data: inserted, error: insertError } = await input.admin
            .from('invoices')
            .upsert(toInsert, { onConflict: 'invoice_number', ignoreDuplicates: true })
            .select('id');
        if (insertError) {
            throw new Error(insertError.message);
        }
        generated = (inserted !== null && inserted !== void 0 ? inserted : []).length;
    }
    const skippedExisting = toInsert.length - generated;
    const skippedInactiveCentre = scannedSubscriptions - candidateSubscriptions.length;
    await (0, activity_log_1.writePlatformActivity)(input.admin, {
        actorUserId: (_g = (_f = input.actor) === null || _f === void 0 ? void 0 : _f.userId) !== null && _g !== void 0 ? _g : null,
        actorEmail: (_j = (_h = input.actor) === null || _h === void 0 ? void 0 : _h.email) !== null && _j !== void 0 ? _j : null,
        entityType: 'bulk',
        action: 'generate_monthly_invoices',
        summary: `Generated ${generated} monthly invoices for period ${tag}`,
        details: {
            period: tag,
            generated,
            skippedExisting,
            skippedInactiveCentre,
            skippedNonBillable,
            scannedSubscriptions,
            actor: (_l = (_k = input.actor) === null || _k === void 0 ? void 0 : _k.sourceLabel) !== null && _l !== void 0 ? _l : 'unknown',
        },
    });
    if (input.notify !== false) {
        void (0, platform_admin_action_notification_1.sendPlatformAdminActionNotification)({
            subject: 'Monthly Invoices Generated',
            heading: 'Monthly invoice generation executed.',
            lines: [
                `Period: ${tag}`,
                `Generated: ${generated}`,
                `Skipped existing: ${skippedExisting}`,
                `Skipped inactive centres: ${skippedInactiveCentre}`,
                `Skipped non-billable: ${skippedNonBillable}`,
                `Actor: ${(_q = (_o = (_m = input.actor) === null || _m === void 0 ? void 0 : _m.email) !== null && _o !== void 0 ? _o : (_p = input.actor) === null || _p === void 0 ? void 0 : _p.sourceLabel) !== null && _q !== void 0 ? _q : 'system'}`,
            ],
            details: {
                action: 'generate_monthly_invoices',
                generated,
                skippedExisting,
                skippedInactiveCentre,
                skippedNonBillable,
                scannedSubscriptions,
                periodStart: periodStart.toISOString(),
                periodEnd: periodEnd.toISOString(),
                actor: (_s = (_r = input.actor) === null || _r === void 0 ? void 0 : _r.sourceLabel) !== null && _s !== void 0 ? _s : 'unknown',
            },
        });
    }
    return {
        generated,
        skippedExisting,
        skippedInactiveCentre,
        skippedNonBillable,
        scannedSubscriptions,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
    };
}
