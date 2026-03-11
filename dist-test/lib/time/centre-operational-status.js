"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCentreOperationalStatus = getCentreOperationalStatus;
const SOUTH_AFRICA_TIMEZONE = 'Africa/Johannesburg';
const WEEKDAY_INDEX = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
};
function getOperationalWindow(dayIndex) {
    if (dayIndex === 0)
        return null; // Sunday closed
    if (dayIndex === 6) {
        return { openMinutes: 8 * 60, closeMinutes: 13 * 60 }; // Saturday
    }
    return { openMinutes: 7 * 60, closeMinutes: 17 * 60 + 30 }; // Weekdays
}
function getJohannesburgClock(now) {
    var _a, _b, _c, _d;
    const parts = new Intl.DateTimeFormat('en-ZA', {
        timeZone: SOUTH_AFRICA_TIMEZONE,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(now);
    const map = new Map(parts.map((part) => [part.type, part.value]));
    const weekdayLabel = String((_a = map.get('weekday')) !== null && _a !== void 0 ? _a : '').slice(0, 3).toLowerCase();
    const dayIndex = (_b = WEEKDAY_INDEX[weekdayLabel]) !== null && _b !== void 0 ? _b : 1;
    const hour = Number.parseInt(String((_c = map.get('hour')) !== null && _c !== void 0 ? _c : '0'), 10);
    const minute = Number.parseInt(String((_d = map.get('minute')) !== null && _d !== void 0 ? _d : '0'), 10);
    return { dayIndex, minutes: hour * 60 + minute };
}
function getCentreOperationalStatus(now = new Date()) {
    const { dayIndex, minutes } = getJohannesburgClock(now);
    const window = getOperationalWindow(dayIndex);
    if (!window) {
        return {
            isOnline: false,
            label: 'Closed now',
            schedule: 'Mon-Fri 07:00-17:30, Sat 08:00-13:00',
        };
    }
    const isOnline = minutes >= window.openMinutes && minutes < window.closeMinutes;
    return {
        isOnline,
        label: isOnline ? 'Online now' : 'Closed now',
        schedule: 'Mon-Fri 07:00-17:30, Sat 08:00-13:00',
    };
}
