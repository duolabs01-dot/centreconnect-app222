# Wave 2 — Motion & Reactivity Upgrade (2026-03-12)

## Inspiration sources reviewed
- https://magicui.design/
- https://animate-ui.com/docs

## Applied direction
- Motion should be subtle, spring-based, and purposeful.
- Navigation and primary controls should feel tactile (tap/press feedback).
- Keep accessibility first (reduced-motion support remains in global CSS).

## Shipped in this wave
1. Bottom nav now uses Framer Motion springs:
   - spring entrance
   - animated active pill
   - tap/press scale feedback
   - micro-lift on active icon group
2. Global button component upgraded for tactile behavior:
   - hover lift
   - active press scale
   - smooth transition-all baseline

## Next motion work (P2 continuation)
1. Add route-level page transitions with AnimatePresence in shell boundaries.
2. Add list-item stagger for dashboard cards and inbox rows.
3. Add modal open/close spring variants shared across dialogs.
4. Add haptic-style micro animation for optimistic saves.

## UX guardrails
- Motion must never block task completion.
- Motion duration target: 140–260ms for most interactions.
- Use spring damping to avoid jitter.
- Respect `prefers-reduced-motion` globally.
