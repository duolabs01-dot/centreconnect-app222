'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePageView = usePageView;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const useUser_1 = require("./useUser");
/**
 * Hook to record page views and page duration analytics.
 * Extends telemetry with role segmentation and session tracking.
 */
function usePageView({ ecdId }) {
    const pathname = (0, navigation_1.usePathname)();
    const { profile } = (0, useUser_1.useUser)();
    const startTimeRef = (0, react_1.useRef)(Date.now());
    const sessionIdRef = (0, react_1.useRef)('');
    // Generate or retrieve persistent session ID for the browser session
    (0, react_1.useEffect)(() => {
        if (typeof window !== 'undefined') {
            let sId = sessionStorage.getItem('cc_analytics_session');
            if (!sId) {
                sId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
                sessionStorage.setItem('cc_analytics_session', sId);
            }
            sessionIdRef.current = sId;
        }
    }, []);
    (0, react_1.useEffect)(() => {
        if (!ecdId)
            return;
        const actorRole = (profile === null || profile === void 0 ? void 0 : profile.role) || 'anonymous';
        const sessionId = sessionIdRef.current;
        // 1. Record Entry (Page View)
        const recordPageView = async () => {
            try {
                await fetch('/api/analytics/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ecdId,
                        eventType: 'page_view',
                        actorRole,
                        path: pathname,
                        sessionId,
                        metadata: {
                            referrer: document.referrer,
                            screen: `${window.innerWidth}x${window.innerHeight}`
                        }
                    })
                });
            }
            catch (err) {
                // Silent fail for analytics in production
                if (process.env.NODE_ENV === 'development') {
                    console.error('Analytics: Failed to record page view', err);
                }
            }
        };
        recordPageView();
        startTimeRef.current = Date.now();
        // 2. Record Exit (Page Duration)
        const recordDuration = () => {
            const duration = Date.now() - startTimeRef.current;
            if (duration < 500)
                return; // Ignore "bounces" under 0.5s
            const payload = JSON.stringify({
                ecdId,
                eventType: 'page_duration',
                actorRole,
                path: pathname,
                durationMs: duration,
                sessionId,
                metadata: {
                    exit_at: new Date().toISOString()
                }
            });
            // Use sendBeacon for reliable delivery on page close/navigation
            if (navigator.sendBeacon) {
                const blob = new Blob([payload], { type: 'application/json' });
                navigator.sendBeacon('/api/analytics/events', blob);
            }
            else {
                fetch('/api/analytics/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload,
                    keepalive: true
                }).catch(() => { });
            }
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                recordDuration();
            }
            else {
                // Reset timer when user returns to tab
                startTimeRef.current = Date.now();
            }
        };
        window.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            recordDuration();
        };
    }, [ecdId, pathname, profile === null || profile === void 0 ? void 0 : profile.role]);
}
