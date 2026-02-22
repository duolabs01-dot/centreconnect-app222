export const adminTheme = {
  // Shell & Layout
  shell: 'bg-slate-950 min-h-screen text-slate-200',
  pageHeader: 'mb-8',
  pageTitle: 'text-2xl font-bold text-white tracking-tight sm:text-3xl',
  pageDescription: 'mt-2 text-sm text-slate-400',

  // Cards
  card: 'rounded-[26px] border border-white/10 bg-slate-900/70 shadow-[0_40px_90px_rgba(2,6,23,0.5)] backdrop-blur-md',
  cardInner: 'rounded-2xl border border-white/10 bg-white/5',
  cardHeader: 'px-6 py-5 border-b border-white/10',
  cardTitle: 'text-lg font-semibold text-white tracking-tight',
  cardDescription: 'text-xs text-slate-400 uppercase tracking-[0.2em] mt-1',
  cardContent: 'p-6',

  // Typography
  heading: 'font-semibold text-white',
  body: 'text-sm text-slate-300',
  muted: 'text-xs text-slate-500',
  label: 'text-[10px] font-semibold uppercase tracking-widest text-slate-500',

  // Tables
  tableWrapper: 'overflow-hidden rounded-2xl border border-white/10 bg-white/5',
  tableHeader: 'bg-white/5 border-b border-white/10',
  th: 'h-10 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-left align-middle',
  td: 'p-4 border-b border-white/5 align-middle text-sm text-slate-300',
  tr: 'hover:bg-white/5 transition-colors',

  // Components
  badge: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
  badgeSuccess: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  badgeWarning: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  badgeError: 'bg-rose-500/10 text-rose-400 ring-rose-500/20',
  badgeNeutral: 'bg-slate-400/10 text-slate-400 ring-slate-400/20',
  badgeInfo: 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20',

  buttonPrimary: 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-semibold shadow-lg shadow-cyan-900/20',
  buttonSecondary: 'border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200',
  buttonDestructive: 'border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20',
} as const
