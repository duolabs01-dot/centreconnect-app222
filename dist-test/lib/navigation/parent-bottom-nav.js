"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldHideParentBottomNav = shouldHideParentBottomNav;
function shouldHideParentBottomNav(pathname) {
    if (!pathname)
        return false;
    return (pathname.startsWith('/parent/profile/') ||
        pathname === '/parent/applications' ||
        pathname.startsWith('/parent/applications/'));
}
