"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveReminderStage = resolveReminderStage;
exports.runBillingAutomation = runBillingAutomation;
require("server-only");
const send_1 = require("@/lib/email/send");
const activity_log_1 = require("@/lib/admin/activity-log");
const platform_admin_action_notification_1 = require("@/lib/email/platform-admin-action-notification");
const MS_PER_DAY = 24 * 60 * 60 * 1000;
function normalizeOne(value) {
    var _a;
    if (!value)
        return null;
    return Array.isArray(value) ? (_a = value[0]) !== null && _a !== void 0 ? _a : null : value;
}
function startOfUtcDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}
function toUtcDay(value) {
    if (!value)
        return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return null;
    return startOfUtcDay(parsed);
}
function dayDiff(from, to) {
    return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}
function asCurrency(amount) {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}
function parseGraceDays() {
    var _a;
    const parsed = Number((_a = process.env.BILLING_DUNNING_GRACE_DAYS) !== null && _a !== void 0 ? _a : 7);
    if (!Number.isFinite(parsed) || parsed < 1)
        return 7;
    return Math.floor(parsed);
}
function resolveReminderStage(daysUntilDue, daysOverdue) {
    if (daysUntilDue === 7)
        return 'd_minus_7';
    if (daysUntilDue === 3)
        return 'd_minus_3';
    if (daysUntilDue === 0)
        return 'due_date';
    if (daysOverdue === 1)
        return 'overdue_1';
    if (daysOverdue === 7)
        return 'overdue_7';
    if (daysOverdue === 14)
        return 'overdue_14';
    if (daysOverdue === 30)
        return 'overdue_30';
    return null;
}
function reminderSubject(stage, invoiceNumber) {
    if (stage === 'd_minus_7')
        return `Invoice ${invoiceNumber} due in 7 days`;
    if (stage === 'd_minus_3')
        return `Invoice ${invoiceNumber} due in 3 days`;
    if (stage === 'due_date')
        return `Invoice ${invoiceNumber} is due today`;
    return `Invoice ${invoiceNumber} is overdue`;
}
function reminderLine(stage, dueAt) {
    const due = dueAt ? new Date(dueAt).toLocaleDateString('en-ZA', { dateStyle: 'medium' }) : 'the due date';
    if (stage === 'd_minus_7')
        return `Friendly reminder: your invoice is due on ${due} (7 days remaining).`;
    if (stage === 'd_minus_3')
        return `Friendly reminder: your invoice is due on ${due} (3 days remaining).`;
    if (stage === 'due_date')
        return `Your invoice is due today (${due}).`;
    if (stage === 'overdue_1')
        return `Your invoice is now overdue by 1 day. Please settle as soon as possible.`;
    if (stage === 'overdue_7')
        return `Your invoice is overdue by 7 days. Please settle to avoid service interruption.`;
    if (stage === 'overdue_14')
        return `Your invoice is overdue by 14 days and in collections follow-up.`;
    return `Your invoice remains overdue. Immediate action is required to keep services active.`;
}
async function reserveReminderEvent(admin, input) {
    const { error } = await admin.from('notification_logs').insert({
        centre_id: input.ecdId,
        event_key: input.eventKey,
        event_type: 'billing_invoice_reminder',
        channel: 'email',
        recipient: input.recipient,
        status: 'queued',
        provider: 'smtp',
        payload: {
            invoiceId: input.invoiceId,
            invoiceNumber: input.invoiceNumber,
            reminderStage: input.stage,
        },
    });
    if (!error)
        return { reserved: true, duplicate: false };
    if (error.code === '23505')
        return { reserved: false, duplicate: true };
    return { reserved: false, duplicate: false, error: error.message };
}
async function finalizeReminderEvent(admin, input) {
    var _a, _b;
    await admin
        .from('notification_logs')
        .update({
        status: input.status,
        provider_message_id: (_a = input.messageId) !== null && _a !== void 0 ? _a : null,
        error_message: (_b = input.errorMessage) !== null && _b !== void 0 ? _b : null,
        payload: {
            reminderStage: input.stage,
        },
        updated_at: new Date().toISOString(),
    })
        .eq('event_key', input.eventKey)
        .eq('channel', 'email');
}
async function getSubscriptionByInvoice(admin, invoice) {
    var _a;
    if (invoice.subscription_id) {
        const direct = await admin
            .from('subscriptions')
            .select('id,ecd_id,status')
            .eq('id', invoice.subscription_id)
            .maybeSingle();
        if (direct.data)
            return direct.data;
    }
    const fallback = await admin
        .from('subscriptions')
        .select('id,ecd_id,status')
        .eq('ecd_id', invoice.ecd_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    return (_a = fallback.data) !== null && _a !== void 0 ? _a : null;
}
async function runBillingAutomation(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
    const now = (_a = input.now) !== null && _a !== void 0 ? _a : new Date();
    const today = startOfUtcDay(now);
    const graceDays = parseGraceDays();
    const { data: invoices, error: invoiceError } = await input.admin
        .from('invoices')
        .select('id,invoice_number,ecd_id,subscription_id,status,total,due_at,paid_at,reminder_overdue_count,dunning_state,ecd_centres(name,email)')
        .in('status', ['draft', 'sent', 'overdue'])
        .is('paid_at', null)
        .not('due_at', 'is', null)
        .order('due_at', { ascending: true })
        .limit(500);
    if (invoiceError) {
        throw new Error(invoiceError.message);
    }
    let remindersSent = 0;
    let remindersSkipped = 0;
    let remindersFailed = 0;
    let markedOverdue = 0;
    let subscriptionsPastDue = 0;
    let subscriptionsSuspended = 0;
    for (const invoice of (invoices !== null && invoices !== void 0 ? invoices : [])) {
        const dueDay = toUtcDay(invoice.due_at);
        if (!dueDay) {
            remindersSkipped += 1;
            continue;
        }
        const diff = dayDiff(today, dueDay);
        const daysUntilDue = diff;
        const daysOverdue = Math.max(0, -diff);
        if (invoice.status === 'sent' && daysOverdue > 0) {
            const { error: overdueError } = await input.admin
                .from('invoices')
                .update({ status: 'overdue' })
                .eq('id', invoice.id);
            if (!overdueError) {
                markedOverdue += 1;
            }
        }
        const stage = resolveReminderStage(daysUntilDue, daysOverdue);
        const centre = normalizeOne(invoice.ecd_centres);
        const recipient = (_b = centre === null || centre === void 0 ? void 0 : centre.email) === null || _b === void 0 ? void 0 : _b.trim();
        if (stage && recipient) {
            const eventKey = `billing_reminder:${invoice.id}:${stage}`;
            const reservation = await reserveReminderEvent(input.admin, {
                eventKey,
                ecdId: invoice.ecd_id,
                recipient,
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoice_number,
                stage,
            });
            if (reservation.duplicate) {
                remindersSkipped += 1;
            }
            else if (!reservation.reserved) {
                remindersFailed += 1;
            }
            else {
                const result = await (0, send_1.sendEmail)({
                    to: recipient,
                    subject: reminderSubject(stage, invoice.invoice_number),
                    html: `
            <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
              <h2 style="margin: 0 0 10px 0;">Billing reminder</h2>
              <p>Hi ${((_c = centre === null || centre === void 0 ? void 0 : centre.name) === null || _c === void 0 ? void 0 : _c.trim()) || 'there'},</p>
              <p>${reminderLine(stage, invoice.due_at)}</p>
              <p><strong>Invoice:</strong> ${invoice.invoice_number}</p>
              <p><strong>Amount:</strong> ${asCurrency(Number((_d = invoice.total) !== null && _d !== void 0 ? _d : 0))}</p>
            </div>
          `,
                });
                if (result.success) {
                    remindersSent += 1;
                    await finalizeReminderEvent(input.admin, {
                        eventKey,
                        stage,
                        status: 'sent',
                        messageId: (_e = result.messageId) !== null && _e !== void 0 ? _e : null,
                    });
                    await input.admin
                        .from('invoices')
                        .update({
                        reminder_last_stage: stage,
                        reminder_last_sent_at: new Date().toISOString(),
                        reminder_overdue_count: stage.startsWith('overdue')
                            ? Math.max(Number((_f = invoice.reminder_overdue_count) !== null && _f !== void 0 ? _f : 0), 1)
                            : Number((_g = invoice.reminder_overdue_count) !== null && _g !== void 0 ? _g : 0),
                    })
                        .eq('id', invoice.id);
                }
                else {
                    remindersFailed += 1;
                    await finalizeReminderEvent(input.admin, {
                        eventKey,
                        stage,
                        status: 'failed',
                        errorMessage: (_h = result.error) !== null && _h !== void 0 ? _h : 'Reminder delivery failed',
                    });
                }
            }
        }
        else {
            remindersSkipped += 1;
        }
        if (daysOverdue <= 0) {
            continue;
        }
        const graceEndsAt = new Date(dueDay.getTime() + graceDays * MS_PER_DAY).toISOString();
        const subscription = await getSubscriptionByInvoice(input.admin, invoice);
        if (subscription && (subscription.status === 'trial' || subscription.status === 'active')) {
            const { error: pastDueError } = await input.admin
                .from('subscriptions')
                .update({ status: 'past_due' })
                .eq('id', subscription.id)
                .in('status', ['trial', 'active']);
            if (!pastDueError) {
                subscriptionsPastDue += 1;
            }
        }
        if (daysOverdue >= graceDays && subscription && subscription.status !== 'suspended' && subscription.status !== 'canceled') {
            const { error: suspendError } = await input.admin
                .from('subscriptions')
                .update({ status: 'suspended' })
                .eq('id', subscription.id)
                .neq('status', 'canceled');
            if (!suspendError) {
                subscriptionsSuspended += 1;
            }
            await input.admin
                .from('invoices')
                .update({
                dunning_state: 'suspended',
                grace_period_ends_at: graceEndsAt,
                suspended_at: new Date().toISOString(),
            })
                .eq('id', invoice.id);
        }
        else {
            await input.admin
                .from('invoices')
                .update({
                dunning_state: 'grace',
                grace_period_ends_at: graceEndsAt,
            })
                .eq('id', invoice.id);
        }
    }
    const result = {
        scannedInvoices: (invoices !== null && invoices !== void 0 ? invoices : []).length,
        remindersSent,
        remindersSkipped,
        remindersFailed,
        markedOverdue,
        subscriptionsPastDue,
        subscriptionsSuspended,
    };
    await (0, activity_log_1.writePlatformActivity)(input.admin, {
        actorUserId: (_k = (_j = input.actor) === null || _j === void 0 ? void 0 : _j.userId) !== null && _k !== void 0 ? _k : null,
        actorEmail: (_m = (_l = input.actor) === null || _l === void 0 ? void 0 : _l.email) !== null && _m !== void 0 ? _m : null,
        entityType: 'bulk',
        action: 'billing_collections_automation',
        summary: `Billing automation processed ${result.scannedInvoices} invoices (${result.remindersSent} reminders sent)`,
        details: Object.assign(Object.assign({}, result), { graceDays, actor: (_p = (_o = input.actor) === null || _o === void 0 ? void 0 : _o.sourceLabel) !== null && _p !== void 0 ? _p : 'unknown' }),
    });
    if (input.notify !== false) {
        void (0, platform_admin_action_notification_1.sendPlatformAdminActionNotification)({
            subject: 'Billing Automation Run',
            heading: 'Billing reminders and dunning automation executed.',
            lines: [
                `Scanned invoices: ${result.scannedInvoices}`,
                `Reminders sent: ${result.remindersSent}`,
                `Marked overdue: ${result.markedOverdue}`,
                `Subscriptions past_due: ${result.subscriptionsPastDue}`,
                `Subscriptions suspended: ${result.subscriptionsSuspended}`,
                `Actor: ${(_t = (_r = (_q = input.actor) === null || _q === void 0 ? void 0 : _q.email) !== null && _r !== void 0 ? _r : (_s = input.actor) === null || _s === void 0 ? void 0 : _s.sourceLabel) !== null && _t !== void 0 ? _t : 'system'}`,
            ],
            details: Object.assign(Object.assign({}, result), { graceDays, actor: (_v = (_u = input.actor) === null || _u === void 0 ? void 0 : _u.sourceLabel) !== null && _v !== void 0 ? _v : 'unknown' }),
        });
    }
    return result;
}
