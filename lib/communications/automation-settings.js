"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS = void 0;
exports.normalizeCommunicationAutomationSettings = normalizeCommunicationAutomationSettings;
exports.channelIncludesInApp = channelIncludesInApp;
exports.channelIncludesWhatsapp = channelIncludesWhatsapp;
exports.renderAutomationTemplate = renderAutomationTemplate;
exports.appendProfessionalSignature = appendProfessionalSignature;
exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS = {
    enabled: true,
    auto_birthday_calendar: true,
    auto_birthday_announcements: false,
    send_channel: 'in_app_whatsapp',
    send_time: '09:00',
    reminder_delay_hours: 24,
    application_reminder_template: 'Hello {{parent_name}}, your application for {{child_name}} at {{centre_name}} is almost complete. Please upload: {{missing_documents}}. Continue here: {{direct_link}}',
    birthday_announcement_template: 'Happy birthday to {{child_name}}. From everyone at {{centre_name}}, we wish your family a wonderful day.',
    include_centre_phone: true,
    include_centre_email: false,
    include_centre_whatsapp: true,
    signoff: 'Admissions Team',
};
function normalizeSendChannel(value) {
    if (value === 'in_app' || value === 'whatsapp' || value === 'in_app_whatsapp')
        return value;
    return exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.send_channel;
}
function normalizeTime(value) {
    if (typeof value !== 'string')
        return exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.send_time;
    const trimmed = value.trim();
    return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.send_time;
}
function normalizeString(value, fallback) {
    if (typeof value !== 'string')
        return fallback;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
}
function normalizeInteger(value, fallback) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        return fallback;
    return Math.max(0, Math.min(168, Math.round(value)));
}
function normalizeBoolean(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
}
function normalizeCommunicationAutomationSettings(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS;
    }
    const source = value;
    return {
        enabled: normalizeBoolean(source.enabled, exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.enabled),
        auto_birthday_calendar: normalizeBoolean(source.auto_birthday_calendar, exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.auto_birthday_calendar),
        auto_birthday_announcements: normalizeBoolean(source.auto_birthday_announcements, exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.auto_birthday_announcements),
        send_channel: normalizeSendChannel(source.send_channel),
        send_time: normalizeTime(source.send_time),
        reminder_delay_hours: normalizeInteger(source.reminder_delay_hours, exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.reminder_delay_hours),
        application_reminder_template: normalizeString(source.application_reminder_template, exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.application_reminder_template),
        birthday_announcement_template: normalizeString(source.birthday_announcement_template, exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.birthday_announcement_template),
        include_centre_phone: normalizeBoolean(source.include_centre_phone, exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.include_centre_phone),
        include_centre_email: normalizeBoolean(source.include_centre_email, exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.include_centre_email),
        include_centre_whatsapp: normalizeBoolean(source.include_centre_whatsapp, exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.include_centre_whatsapp),
        signoff: normalizeString(source.signoff, exports.DEFAULT_COMMUNICATION_AUTOMATION_SETTINGS.signoff),
    };
}
function channelIncludesInApp(channel) {
    return channel === 'in_app' || channel === 'in_app_whatsapp';
}
function channelIncludesWhatsapp(channel) {
    return channel === 'whatsapp' || channel === 'in_app_whatsapp';
}
function renderAutomationTemplate(template, variables) {
    let output = template;
    for (const [key, value] of Object.entries(variables)) {
        output = output.replaceAll(`{{${key}}}`, value);
    }
    return output;
}
function appendProfessionalSignature(message, options) {
    var _a, _b, _c;
    const lines = [message.trim(), '', `Kind regards,`, `${options.centreName} ${options.signoff}`];
    if (options.includeCentrePhone && ((_a = options.centrePhone) === null || _a === void 0 ? void 0 : _a.trim())) {
        lines.push(`Phone: ${options.centrePhone.trim()}`);
    }
    if (options.includeCentreWhatsapp && ((_b = options.centreWhatsapp) === null || _b === void 0 ? void 0 : _b.trim())) {
        lines.push(`WhatsApp: ${options.centreWhatsapp.trim()}`);
    }
    if (options.includeCentreEmail && ((_c = options.centreEmail) === null || _c === void 0 ? void 0 : _c.trim())) {
        lines.push(`Email: ${options.centreEmail.trim()}`);
    }
    return lines.filter(Boolean).join('\n');
}
