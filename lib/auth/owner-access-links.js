"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOwnerAccessLink = generateOwnerAccessLink;
exports.generateOwnerPasswordSetupLink = generateOwnerPasswordSetupLink;
const onboarding_links_1 = require("@/lib/auth/onboarding-links");
async function generateOwnerAccessLink(admin, email, onboardingPath) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const redirectTo = (0, onboarding_links_1.buildAuthCallbackRedirect)(onboardingPath);
    const magicLinkResult = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo },
    });
    const magicLink = (_d = (_c = (_b = (_a = magicLinkResult.data) === null || _a === void 0 ? void 0 : _a.properties) === null || _b === void 0 ? void 0 : _b.action_link) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : '';
    if (!magicLinkResult.error && magicLink) {
        const firstPartyConfirmLink = (0, onboarding_links_1.buildFirstPartyConfirmLink)({
            hashedToken: (_g = (_f = (_e = magicLinkResult.data) === null || _e === void 0 ? void 0 : _e.properties) === null || _f === void 0 ? void 0 : _f.hashed_token) !== null && _g !== void 0 ? _g : null,
            verificationType: (_k = (_j = (_h = magicLinkResult.data) === null || _h === void 0 ? void 0 : _h.properties) === null || _j === void 0 ? void 0 : _j.verification_type) !== null && _k !== void 0 ? _k : 'magiclink',
            nextPath: onboardingPath,
        });
        const sanitized = (0, onboarding_links_1.sanitizeGeneratedAccessLinkWithDiagnostics)({
            actionLink: magicLink,
            fallbackRedirectTo: redirectTo,
        });
        return {
            link: firstPartyConfirmLink !== null && firstPartyConfirmLink !== void 0 ? firstPartyConfirmLink : sanitized.link,
            authUserId: (_o = (_m = (_l = magicLinkResult.data) === null || _l === void 0 ? void 0 : _l.user) === null || _m === void 0 ? void 0 : _m.id) !== null && _o !== void 0 ? _o : null,
            warning: null,
            diagnostics: sanitized.diagnostics,
        };
    }
    return {
        link: '',
        authUserId: null,
        warning: (_q = (_p = magicLinkResult.error) === null || _p === void 0 ? void 0 : _p.message) !== null && _q !== void 0 ? _q : 'Failed to generate owner access link.',
        diagnostics: {
            originalHost: null,
            originalPath: null,
            sanitizedHost: null,
            sanitizedPath: null,
            usedFallback: false,
            changed: false,
        },
    };
}
async function generateOwnerPasswordSetupLink(admin, email) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const resetPath = '/reset-password?locked_email=';
    const fallbackRedirectTo = (0, onboarding_links_1.buildLockedResetPasswordRedirect)(email);
    const recoveryResult = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: fallbackRedirectTo },
    });
    const actionLink = (_d = (_c = (_b = (_a = recoveryResult.data) === null || _a === void 0 ? void 0 : _a.properties) === null || _b === void 0 ? void 0 : _b.action_link) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : '';
    if (!recoveryResult.error && actionLink) {
        const firstPartyConfirmLink = (0, onboarding_links_1.buildFirstPartyConfirmLink)({
            hashedToken: (_g = (_f = (_e = recoveryResult.data) === null || _e === void 0 ? void 0 : _e.properties) === null || _f === void 0 ? void 0 : _f.hashed_token) !== null && _g !== void 0 ? _g : null,
            verificationType: (_k = (_j = (_h = recoveryResult.data) === null || _h === void 0 ? void 0 : _h.properties) === null || _j === void 0 ? void 0 : _j.verification_type) !== null && _k !== void 0 ? _k : 'recovery',
            nextPath: resetPath,
        });
        const sanitized = (0, onboarding_links_1.sanitizeGeneratedAccessLinkWithDiagnostics)({
            actionLink,
            fallbackRedirectTo,
        });
        return {
            link: firstPartyConfirmLink !== null && firstPartyConfirmLink !== void 0 ? firstPartyConfirmLink : sanitized.link,
            authUserId: (_o = (_m = (_l = recoveryResult.data) === null || _l === void 0 ? void 0 : _l.user) === null || _m === void 0 ? void 0 : _m.id) !== null && _o !== void 0 ? _o : null,
            warning: null,
            diagnostics: sanitized.diagnostics,
        };
    }
    return {
        link: '',
        authUserId: null,
        warning: (_q = (_p = recoveryResult.error) === null || _p === void 0 ? void 0 : _p.message) !== null && _q !== void 0 ? _q : 'Failed to generate password setup link.',
        diagnostics: {
            originalHost: null,
            originalPath: null,
            sanitizedHost: null,
            sanitizedPath: null,
            usedFallback: false,
            changed: false,
        },
    };
}
