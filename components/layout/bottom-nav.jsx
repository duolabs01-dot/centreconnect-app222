'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BottomNav = BottomNav;
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const utils_1 = require("@/lib/utils");
const BottomNavProvider_1 = require("@/lib/context/BottomNavProvider");
function isTabActive(pathname, href) {
    if (href === '/')
        return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
}
const NavButton = (0, react_1.memo)(({ item, active, onPress }) => {
    var _a;
    const Icon = item.icon;
    const isSavedTab = item.href === '/parent/shortlist';
    const hasBadge = !active && ((_a = item.badge) !== null && _a !== void 0 ? _a : 0) > 0;
    const handleClick = (0, react_1.useCallback)(() => {
        onPress(item.href);
    }, [item.href, onPress]);
    return (<button onClick={handleClick} className={(0, utils_1.cn)('mobile-nav-item relative flex min-h-[44px] flex-1 items-center justify-center overflow-hidden rounded-2xl px-1.5 outline-none transition-colors duration-200', active ? 'text-cyan-900' : 'text-slate-600 hover:text-slate-900')} aria-current={active ? 'page' : undefined} aria-label={item.label} style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>
      {active ? (<span className="pointer-events-none absolute inset-0 rounded-2xl bg-cyan-50/40"/>) : null}

          <div className="relative z-10 flex flex-col items-center justify-center gap-0.5">
            <div className="relative">
          <Icon size={20} strokeWidth={active ? 2.4 : 2} className={(0, utils_1.cn)(active ? 'drop-shadow-[0_0_16px_rgba(14,165,233,0.4)] text-cyan-900' : 'text-slate-500', isSavedTab ? 'text-cyan-600' : '')}/>
          {hasBadge ? (<span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"/>) : null}
        </div>

          <span className={(0, utils_1.cn)('text-[10px] font-semibold tracking-[0.08em] uppercase', active ? 'text-cyan-800' : 'text-slate-500')}>
            {item.label}
          </span>
        </div>
    </button>);
});
NavButton.displayName = 'NavButton';
function BottomNav({ items, pathname }) {
    const router = (0, navigation_1.useRouter)();
    const { isVisible } = (0, BottomNavProvider_1.useBottomNav)();
    const prefetchedRef = (0, react_1.useRef)(false);
    const [savedBadges, setSavedBadges] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        if (prefetchedRef.current)
            return;
        prefetchedRef.current = true;
        items.forEach(item => router.prefetch(item.href));
    }, [items, router]);
    (0, react_1.useEffect)(() => {
        const readSavedCount = () => {
            if (typeof window === 'undefined')
                return;
            const stored = window.localStorage.getItem('cc:saved-count');
            if (stored) {
                setSavedBadges(Number(stored) || 0);
            }
        };
        readSavedCount();
        const handleStorage = (event) => {
            if (event.key === 'cc:saved-count') {
                readSavedCount();
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);
    const decoratedItems = (0, react_1.useMemo)(() => {
        return items.map((item) => item.href === '/parent/shortlist'
            ? Object.assign(Object.assign({}, item), { badge: savedBadges > 0 ? savedBadges : undefined }) : item);
    }, [items, savedBadges]);
    const handleNav = (0, react_1.useCallback)((href) => {
        if (href === pathname)
            return;
        router.push(href);
    }, [pathname, router]);
    const isAuthPage = (pathname === null || pathname === void 0 ? void 0 : pathname.includes('/login')) || (pathname === null || pathname === void 0 ? void 0 : pathname.includes('/register'));
    if (!isVisible || pathname === '/' || isAuthPage)
        return null;
    return (<div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center pointer-events-none md:hidden">
      <div className="pointer-events-auto mb-[calc(0.75rem+env(safe-area-inset-bottom))] w-full max-w-[420px] px-3">
        <nav className="flex items-center gap-1 rounded-[1.75rem] border border-white/40 bg-white/30 p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.22)]" style={{
            WebkitBackdropFilter: 'blur(18px) saturate(160%)',
            backdropFilter: 'blur(18px) saturate(160%)',
        }}>
          {decoratedItems.map((item) => (<NavButton key={item.href} item={item} active={isTabActive(pathname, item.href)} onPress={handleNav}/>))}
        </nav>
      </div>
    </div>);
}
