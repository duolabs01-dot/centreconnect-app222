"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWebPush = sendWebPush;
const web_push_1 = __importDefault(require("web-push"));
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '';
if (publicVapidKey && privateVapidKey) {
    web_push_1.default.setVapidDetails('mailto:admin@centerconnect.co.za', publicVapidKey, privateVapidKey);
}
async function sendWebPush(subscription, payload) {
    try {
        await web_push_1.default.sendNotification(subscription, JSON.stringify(payload));
        return { success: true };
    }
    catch (error) {
        console.error('Web Push error:', error);
        if (error.statusCode === 404 || error.statusCode === 410) {
            return { success: false, expired: true };
        }
        return { success: false, error: error.message };
    }
}
