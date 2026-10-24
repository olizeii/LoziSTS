import confettiLib from 'canvas-confetti';

const BASE = { disableForReducedMotion: true };
const GOLD = ['#facc15', '#fde047', '#f59e0b', '#ffffff'];

// Eigenes Canvas ohne Web-Worker: läuft auch auf TV-Browsern ohne OffscreenCanvas zuverlässig
let instance = null;
function confetti(options) {
  if (!instance) {
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: '200',
    });
    document.body.appendChild(canvas);
    instance = confettiLib.create(canvas, { resize: true, useWorker: false });
  }
  return instance(options);
}

function originOf(el) {
  const rect = el.getBoundingClientRect();
  return {
    x: Math.min(Math.max(rect.right / window.innerWidth, 0.03), 0.97),
    y: Math.min(Math.max((rect.top + rect.height / 2) / window.innerHeight, 0.03), 0.97),
  };
}

// Kleiner Burst am Ende des Fortschrittsbalkens bei jedem Tick
export function tickBurst(el, color) {
  if (!el) return;
  confetti({
    ...BASE,
    origin: originOf(el),
    particleCount: 40,
    spread: 70,
    angle: 90,
    startVelocity: 30,
    gravity: 1.1,
    ticks: 120,
    scalar: 0.85,
    colors: [color, '#ffffff', color],
  });
}

// Meilenstein: großer Knall in der Mitte + Konfetti-Kanonen von beiden Seiten
export function milestoneCelebration(color) {
  const colors = [color, '#ffffff', '#a855f7', '#ec4899'];
  confetti({ ...BASE, origin: { x: 0.5, y: 0.45 }, particleCount: 180, spread: 130, startVelocity: 48, colors, scalar: 1.1 });

  const end = Date.now() + 2400;
  (function frame() {
    confetti({ ...BASE, particleCount: 5, angle: 60, spread: 55, startVelocity: 65, origin: { x: 0, y: 0.8 }, colors });
    confetti({ ...BASE, particleCount: 5, angle: 120, spread: 55, startVelocity: 65, origin: { x: 1, y: 0.8 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

// 100 %: goldenes Feuerwerk über mehrere Sekunden
export function completeCelebration() {
  const colors = [...GOLD, '#22d3ee', '#a855f7'];
  confetti({ ...BASE, origin: { x: 0.5, y: 0.5 }, particleCount: 260, spread: 360, startVelocity: 55, colors, scalar: 1.3, ticks: 260 });

  const end = Date.now() + 6000;
  const interval = setInterval(() => {
    if (Date.now() > end) {
      clearInterval(interval);
      return;
    }
    const origin = { x: 0.1 + Math.random() * 0.8, y: 0.1 + Math.random() * 0.45 };
    confetti({ ...BASE, origin, particleCount: 70, spread: 360, startVelocity: 32, gravity: 0.9, ticks: 180, colors, scalar: 1.1 });
  }, 280);

  const sideEnd = Date.now() + 3500;
  (function frame() {
    confetti({ ...BASE, particleCount: 7, angle: 60, spread: 60, startVelocity: 75, origin: { x: 0, y: 0.9 }, colors: GOLD });
    confetti({ ...BASE, particleCount: 7, angle: 120, spread: 60, startVelocity: 75, origin: { x: 1, y: 0.9 }, colors: GOLD });
    if (Date.now() < sideEnd) requestAnimationFrame(frame);
  })();
}
