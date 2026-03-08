import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'

type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended'
type ReminderStage = 'd_minus_7' | 'd_minus_3' | 'due_date' | 'overdue_1' | 'overdue_7' | 'overdue_14' | 'overdue_30'

type InvoiceRow = {
  id: string
  invoice_number: string
  ecd_id: string
  subscription_id: string | null
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'canceled'
  total: number | null
  due_at: string | null
  paid_at: string | null
  reminder_overdue_count: number | null
  dunning_state: 'none' | 'grace' | 'suspended' | 'reactivated' | null
  ecd_centres: { name?: string | null; email?: string | null } | { name?: string | null; email?: string | null }[] | null
}

type SubscriptionRow = {
  id: string
  ecd_id: string
  status: SubscriptionStatus
}

type BillingAutomationActor = {
  userId?: string | null
  email?: string | null
  sourceLabel?: string
}

type RunBillingAutomationInput = {
  admin: ReturnType<typeof createAdminClient>
  now?: Date
  actor?: BillingAutomationActor
  notify?: boolean
}

export type RunBillingAutomationResult = {
  scannedInvoices: number
  remindersSent: number
  remindersSkipped: number
  remindersFailed: number
  markedOverdue: number
  subscriptionsPastDue: number
  subscriptionsSuspended: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))
}

function toUtcDay(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return startOfUtcDay(parsed)
}

function dayDiff(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY)
}

function asCurrency(amount: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    amount
  )
}

function parseGraceDays() {
  const parsed = Number(process.env.BILLING_DUNNING_GRACE_DAYS ?? 7)
  if (!Number.isFinite(parsed) || parsed < 1) return 7
  return Math.floor(parsed)
}

export function resolveReminderStage(daysUntilDue: number, daysOverdue: number): ReminderStage | null {
  if (daysUntilDue === 7) return 'd_minus_7'
  if (daysUntilDue === 3) return 'd_minus_3'
  if (daysUntilDue === 0) return 'due_date'

  if (daysOverdue === 1) return 'overdue_1'
  if (daysOverdue === 7) return 'overdue_7'
  if (daysOverdue === 14) return 'overdue_14'
  if (daysOverdue === 30) return 'overdue_30'
  return null
}

function reminderSubject(stage: ReminderStage, invoiceNumber: string) {
  if (stage === 'd_minus_7') return `Invoice ${invoiceNumber} due in 7 days`
  if (stage === 'd_minus_3') return `Invoice ${invoiceNumber} due in 3 days`
  if (stage === 'due_date') return `Invoice ${invoiceNumber} is due today`
  return `Invoice ${invoiceNumber} is overdue`
}

function reminderLine(stage: ReminderStage, dueAt: string | null) {
  const due = dueAt ? new Date(dueAt).toLocaleDateString('en-ZA', { dateStyle: 'medium' }) : 'the due date'
  if (stage === 'd_minus_7') return `Friendly reminder: your invoice is due on ${due} (7 days remaining).`
  if (stage === 'd_minus_3') return `Friendly reminder: your invoice is due on ${due} (3 days remaining).`
  if (stage === 'due_date') return `Your invoice is due today (${due}).`
  if (stage === 'overdue_1') return `Your invoice is now overdue by 1 day. Please settle as soon as possible.`
  if (stage === 'overdue_7') return `Your invoice is overdue by 7 days. Please settle to avoid service interruption.`
  if (stage === 'overdue_14') return `Your invoice is overdue by 14 days and in collections follow-up.`
  return `Your invoice remains overdue. Immediate action is required to keep services active.`
}

async function reserveReminderEvent(
  admin: ReturnType<typeof createAdminClient>,
  input: { eventKey: string; ecdId: string; recipient: string; invoiceId: string; invoiceNumber: string; stage: ReminderStage }
) {
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
  })

  if (!error) return { reserved: true as const, duplicate: false as const }
  if (error.code === '23505') return { reserved: false as const, duplicate: true as const }
  return { reserved: false as const, duplicate: false as const, error: error.message }
}

async function finalizeReminderEvent(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    eventKey: string
    stage: ReminderStage
    status: 'sent' | 'failed'
    messageId?: string | null
    errorMessage?: string | null
  }
) {
  await admin
    .from('notification_logs')
    .update({
      status: input.status,
      provider_message_id: input.messageId ?? null,
      error_message: input.errorMessage ?? null,
      payload: {
        reminderStage: input.stage,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('event_key', input.eventKey)
    .eq('channel', 'email')
}

async function getSubscriptionByInvoice(
  admin: ReturnType<typeof createAdminClient>,
  invoice: Pick<InvoiceRow, 'subscription_id' | 'ecd_id'>
) {
  if (invoice.subscription_id) {
    const direct = await admin
      .from('subscriptions')
      .select('id,ecd_id,status')
      .eq('id', invoice.subscription_id)
      .maybeSingle()
    if (direct.data) return direct.data as SubscriptionRow
  }

  const fallback = await admin
    .from('subscriptions')
    .select('id,ecd_id,status')
    .eq('ecd_id', invoice.ecd_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (fallback.data as SubscriptionRow | null) ?? null
}

export async function runBillingAutomation(input: RunBillingAutomationInput): Promise<RunBillingAutomationResult> {
  const now = input.now ?? new Date()
  const today = startOfUtcDay(now)
  const graceDays = parseGraceDays()

  const { data: invoices, error: invoiceError } = await input.admin
    .from('invoices')
    .select(
      'id,invoice_number,ecd_id,subscription_id,status,total,due_at,paid_at,reminder_overdue_count,dunning_state,ecd_centres(name,email)'
    )
    .in('status', ['draft', 'sent', 'overdue'])
    .is('paid_at', null)
    .not('due_at', 'is', null)
    .order('due_at', { ascending: true })
    .limit(500)

  if (invoiceError) {
    throw new Error(invoiceError.message)
  }

  let remindersSent = 0
  let remindersSkipped = 0
  let remindersFailed = 0
  let markedOverdue = 0
  let subscriptionsPastDue = 0
  let subscriptionsSuspended = 0

  for (const invoice of (invoices ?? []) as InvoiceRow[]) {
    const dueDay = toUtcDay(invoice.due_at)
    if (!dueDay) {
      remindersSkipped += 1
      continue
    }

    const diff = dayDiff(today, dueDay)
    const daysUntilDue = diff
    const daysOverdue = Math.max(0, -diff)

    if (invoice.status === 'sent' && daysOverdue > 0) {
      const { error: overdueError } = await input.admin
        .from('invoices')
        .update({ status: 'overdue' })
        .eq('id', invoice.id)

      if (!overdueError) {
        markedOverdue += 1
      }
    }

    const stage = resolveReminderStage(daysUntilDue, daysOverdue)
    const centre = normalizeOne(invoice.ecd_centres)
    const recipient = centre?.email?.trim()

    if (stage && recipient) {
      const eventKey = `billing_reminder:${invoice.id}:${stage}`
      const reservation = await reserveReminderEvent(input.admin, {
        eventKey,
        ecdId: invoice.ecd_id,
        recipient,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        stage,
      })

      if (reservation.duplicate) {
        remindersSkipped += 1
      } else if (!reservation.reserved) {
        remindersFailed += 1
      } else {
        const result = await sendEmail({
          to: recipient,
          subject: reminderSubject(stage, invoice.invoice_number),
          html: `
            <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
              <h2 style="margin: 0 0 10px 0;">Billing reminder</h2>
              <p>Hi ${centre?.name?.trim() || 'there'},</p>
              <p>${reminderLine(stage, invoice.due_at)}</p>
              <p><strong>Invoice:</strong> ${invoice.invoice_number}</p>
              <p><strong>Amount:</strong> ${asCurrency(Number(invoice.total ?? 0))}</p>
            </div>
          `,
        })

        if (result.success) {
          remindersSent += 1
          await finalizeReminderEvent(input.admin, {
            eventKey,
            stage,
            status: 'sent',
            messageId: result.messageId ?? null,
          })
          await input.admin
            .from('invoices')
            .update({
              reminder_last_stage: stage,
              reminder_last_sent_at: new Date().toISOString(),
              reminder_overdue_count: stage.startsWith('overdue')
                ? Math.max(Number(invoice.reminder_overdue_count ?? 0), 1)
                : Number(invoice.reminder_overdue_count ?? 0),
            })
            .eq('id', invoice.id)
        } else {
          remindersFailed += 1
          await finalizeReminderEvent(input.admin, {
            eventKey,
            stage,
            status: 'failed',
            errorMessage: result.error ?? 'Reminder delivery failed',
          })
        }
      }
    } else {
      remindersSkipped += 1
    }

    if (daysOverdue <= 0) {
      continue
    }

    const graceEndsAt = new Date(dueDay.getTime() + graceDays * MS_PER_DAY).toISOString()
    const subscription = await getSubscriptionByInvoice(input.admin, invoice)

    if (subscription && (subscription.status === 'trial' || subscription.status === 'active')) {
      const { error: pastDueError } = await input.admin
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('id', subscription.id)
        .in('status', ['trial', 'active'])

      if (!pastDueError) {
        subscriptionsPastDue += 1
      }
    }

    if (daysOverdue >= graceDays && subscription && subscription.status !== 'suspended' && subscription.status !== 'canceled') {
      const { error: suspendError } = await input.admin
        .from('subscriptions')
        .update({ status: 'suspended' })
        .eq('id', subscription.id)
        .neq('status', 'canceled')

      if (!suspendError) {
        subscriptionsSuspended += 1
      }

      await input.admin
        .from('invoices')
        .update({
          dunning_state: 'suspended',
          grace_period_ends_at: graceEndsAt,
          suspended_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)
    } else {
      await input.admin
        .from('invoices')
        .update({
          dunning_state: 'grace',
          grace_period_ends_at: graceEndsAt,
        })
        .eq('id', invoice.id)
    }
  }

  const result: RunBillingAutomationResult = {
    scannedInvoices: (invoices ?? []).length,
    remindersSent,
    remindersSkipped,
    remindersFailed,
    markedOverdue,
    subscriptionsPastDue,
    subscriptionsSuspended,
  }

  await writePlatformActivity(input.admin, {
    actorUserId: input.actor?.userId ?? null,
    actorEmail: input.actor?.email ?? null,
    entityType: 'bulk',
    action: 'billing_collections_automation',
    summary: `Billing automation processed ${result.scannedInvoices} invoices (${result.remindersSent} reminders sent)`,
    details: {
      ...result,
      graceDays,
      actor: input.actor?.sourceLabel ?? 'unknown',
    },
  })

  if (input.notify !== false) {
    void sendPlatformAdminActionNotification({
      subject: 'Billing Automation Run',
      heading: 'Billing reminders and dunning automation executed.',
      lines: [
        `Scanned invoices: ${result.scannedInvoices}`,
        `Reminders sent: ${result.remindersSent}`,
        `Marked overdue: ${result.markedOverdue}`,
        `Subscriptions past_due: ${result.subscriptionsPastDue}`,
        `Subscriptions suspended: ${result.subscriptionsSuspended}`,
        `Actor: ${input.actor?.email ?? input.actor?.sourceLabel ?? 'system'}`,
      ],
      details: {
        ...result,
        graceDays,
        actor: input.actor?.sourceLabel ?? 'unknown',
      },
    })
  }

  return result
}

