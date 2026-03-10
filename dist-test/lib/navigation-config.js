"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_MOBILE_NAV_ITEMS = exports.ECD_MOBILE_NAV_ITEMS = exports.PARENT_NAV_ITEMS = void 0;
const lucide_react_1 = require("lucide-react");
exports.PARENT_NAV_ITEMS = [
    { href: '/parent/dashboard', label: 'Home', icon: lucide_react_1.Home },
    { href: '/directory', label: 'Discover', icon: lucide_react_1.Search },
    { href: '/parent/applications', label: 'Apply', icon: lucide_react_1.ClipboardList },
    { href: '/parent/profile', label: 'Profile', icon: lucide_react_1.User },
];
exports.ECD_MOBILE_NAV_ITEMS = [
    { href: '/ecd/dashboard', label: 'Home', icon: lucide_react_1.Home },
    { href: '/ecd/applications', label: 'Admissions', icon: lucide_react_1.ClipboardList },
    { href: '/ecd/attendance', label: 'Attendance', icon: lucide_react_1.UserCheck },
    { href: '/ecd/profile', label: 'Profile', icon: lucide_react_1.User },
];
exports.ADMIN_MOBILE_NAV_ITEMS = [
    { href: '/admin/dashboard', label: 'Overview', icon: lucide_react_1.LayoutDashboard },
    { href: '/admin/tenants', label: 'Centres', icon: lucide_react_1.Building2 },
    { href: '/admin/revenue', label: 'Revenue', icon: lucide_react_1.CreditCard },
    { href: '/admin/support', label: 'Support', icon: lucide_react_1.LifeBuoy },
];
