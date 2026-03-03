export type AutomationSendChannel = 'in_app' | 'whatsapp' | 'sms' | 'in_app_whatsapp' | 'in_app_sms'

export type CommunicationAutomationSettings = {
  enabled: boolean
  auto_birthday_calendar: boolean
  auto_birthday_announcements: boolean
  send_channel: AutomationSendChannel
  send_time: string
  reminder_delay_hours: number
  application_reminder_template: string
  birthday_announcement_template: string
  include_centre_phone: boolean
  include_centre_email: boolean
  include_centre_whatsapp: boolean
  signoff: string
}

export const DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS: CommunicationAutomationSettings = {
  enabled: true,
  auto_birthday_calendar: true,
  auto_birthday_announcements: false,
  send_channel: 'in_app_whatsapp',
  send_time: '09:00',
  reminder_delay_hours: 24,
  application_reminder_template:
    'Hello {{parent_name}}, your application for {{child_name}} at {{centre_name}} is almost complete. Please upload: {{missing_documents}}. Continue here: {{direct_link}}',
  birthday_announcement_template:
    'Happy birthday to {{child_name}}. From everyone at {{centre_name}}, we wish your family a wonderful day.',
  include_centre_phone: true,
  include_centre_email: false,
  include_centre_whatsapp: true,
  signoff: 'Admissions Team',
}

function normalizeSendChannel(value: unknown): AutomationSendChannel {
  if (
    value === 'in_app' ||
    value === 'whatsapp' ||
    value === 'sms' ||
    value === 'in_app_whatsapp' ||
    value === 'in_app_sms'
  ) {
    return value
  }
  return DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.send_channel
}

function normalizeTime(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.send_time
  const trimmed = value.trim()
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.send_time
}

function normalizeString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

function normalizeInteger(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(168, Math.round(value)))
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeCommunicationAutomationSettings(value: unknown): CommunicationAutomationSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS
  }

  const source = value as Record<string, unknown>
  return {
    enabled: normalizeBoolean(source.enabled, DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.enabled),
    auto_birthday_calendar: normalizeBoolean(
      source.auto_birthday_calendar,
      DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.auto_birthday_calendar
    ),
    auto_birthday_announcements: normalizeBoolean(
      source.auto_birthday_announcements,
      DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.auto_birthday_announcements
    ),
    send_channel: normalizeSendChannel(source.send_channel),
    send_time: normalizeTime(source.send_time),
    reminder_delay_hours: normalizeInteger(
      source.reminder_delay_hours,
      DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.reminder_delay_hours
    ),
    application_reminder_template: normalizeString(
      source.application_reminder_template,
      DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.application_reminder_template
    ),
    birthday_announcement_template: normalizeString(
      source.birthday_announcement_template,
      DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.birthday_announcement_template
    ),
    include_centre_phone: normalizeBoolean(
      source.include_centre_phone,
      DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.include_centre_phone
    ),
    include_centre_email: normalizeBoolean(
      source.include_centre_email,
      DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.include_centre_email
    ),
    include_centre_whatsapp: normalizeBoolean(
      source.include_centre_whatsapp,
      DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.include_centre_whatsapp
    ),
    signoff: normalizeString(source.signoff, DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.signoff),
  }
}

export function channelIncludesInApp(channel: AutomationSendChannel) {
  return channel === 'in_app' || channel === 'in_app_whatsapp' || channel === 'in_app_sms'
}

export function channelIncludesWhatsapp(channel: AutomationSendChannel) {
  return channel === 'whatsapp' || channel === 'in_app_whatsapp'
}

export function channelIncludesSms(channel: AutomationSendChannel) {
  return channel === 'sms' || channel === 'in_app_sms'
}

export function renderAutomationTemplate(template: string, variables: Record<string, string>) {
  let output = template
  for (const [key, value] of Object.entries(variables)) {
    output = output.replaceAll(`{{${key}}}`, value)
  }
  return output
}

export function appendProfessionalSignature(
  message: string,
  options: {
    centreName: string
    signoff: string
    includeCentrePhone: boolean
    centrePhone?: string | null
    includeCentreEmail: boolean
    centreEmail?: string | null
    includeCentreWhatsapp: boolean
    centreWhatsapp?: string | null
  }
) {
  const lines = [message.trim(), '', `Kind regards,`, `${options.centreName} ${options.signoff}`]

  if (options.includeCentrePhone && options.centrePhone?.trim()) {
    lines.push(`Phone: ${options.centrePhone.trim()}`)
  }
  if (options.includeCentreWhatsapp && options.centreWhatsapp?.trim()) {
    lines.push(`WhatsApp: ${options.centreWhatsapp.trim()}`)
  }
  if (options.includeCentreEmail && options.centreEmail?.trim()) {
    lines.push(`Email: ${options.centreEmail.trim()}`)
  }

  return lines.filter(Boolean).join('\n')
}
