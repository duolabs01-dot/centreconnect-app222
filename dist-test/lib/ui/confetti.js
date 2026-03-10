"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerConfetti = triggerConfetti;
exports.triggerFirstTimeConfetti = triggerFirstTimeConfetti;
const STYLE_COLORS = {
    child: ['#22c55e', '#f59e0b', '#38bdf8', '#f472b6'],
    application: ['#2563eb', '#06b6d4', '#14b8a6', '#a78bfa'],
    approval: ['#10b981', '#34d399', '#60a5fa', '#fbbf24'],
};
function burst(colors, pieces) {
    if (typeof window === 'undefined' || typeof document === 'undefined')
        return;
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.inset = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    for (let i = 0; i < pieces; i += 1) {
        const piece = document.createElement('span');
        const size = 6 + Math.floor(Math.random() * 8);
        piece.style.position = 'absolute';
        piece.style.top = '-12px';
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.width = `${size}px`;
        piece.style.height = `${size}px`;
        piece.style.borderRadius = Math.random() > 0.5 ? '999px' : '2px';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.opacity = '0.95';
        piece.style.transform = `translateY(0) rotate(${Math.floor(Math.random() * 360)}deg)`;
        piece.style.transition = `transform ${900 + Math.random() * 900}ms ease-out, opacity ${900 + Math.random() * 900}ms ease-out`;
        container.appendChild(piece);
        requestAnimationFrame(() => {
            const dx = -120 + Math.random() * 240;
            const dy = 420 + Math.random() * 280;
            piece.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.floor(Math.random() * 1080)}deg)`;
            piece.style.opacity = '0';
        });
    }
    window.setTimeout(() => {
        container.remove();
    }, 2200);
}
function triggerConfetti(style) {
    burst(STYLE_COLORS[style], style === 'approval' ? 100 : 80);
}
function triggerFirstTimeConfetti(key, style) {
    if (typeof window === 'undefined')
        return false;
    const storageKey = `cc-first-${key}`;
    if (window.localStorage.getItem(storageKey))
        return false;
    window.localStorage.setItem(storageKey, '1');
    triggerConfetti(style);
    return true;
}
