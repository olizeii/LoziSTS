// Leer = gleiche Adresse wie das Dashboard (Backend liefert das Dashboard aus bzw. Vite-Proxy im Dev-Modus)
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

export const EVENT_TITLE = import.meta.env.VITE_EVENT_TITLE || 'LAN-PARTY CHALLENGE';

// Browser-Version der App (wird vom gleichen Server unter /app ausgeliefert)
export const APP_URL = import.meta.env.VITE_APP_URL || `${SERVER_URL.replace(/\/$/, '')}/app/`;

// ?autostart überspringt den Start-Screen (z. B. Chrome-Kiosk mit --autoplay-policy=no-user-gesture-required)
export const AUTOSTART = new URLSearchParams(window.location.search).has('autostart');

export const LEADERBOARD_SIZE = 5;

// Seitenwechsel: ?rotate=40 an der URL ändert die Sekunden pro Seite
const rotateParam = Number(new URLSearchParams(window.location.search).get('rotate'));
export const ROTATE_SECONDS = rotateParam > 0 ? rotateParam : 25;

export const PAGES = [
  { id: 'challenges', label: 'Challenges' },
  { id: 'games', label: 'Games' },
  { id: 'collections', label: 'Mario Kart · Minecraft · Just Dance' },
];

// Farbe eines Games (Hex) als CSS-Variablen wie bei den Challenges
export function colorStyle(color) {
  const c = color || '#a855f7';
  return { '--c': c, '--c2': c, '--glow': `${c}8c` };
}

export const CHALLENGE_THEME = {
  rubiks: { color: '#22d3ee', color2: '#3b82f6', glow: 'rgba(34, 211, 238, 0.55)' },
  pushups: { color: '#fb923c', color2: '#ef4444', glow: 'rgba(249, 115, 22, 0.55)' },
  running: { color: '#a3e635', color2: '#10b981', glow: 'rgba(132, 204, 22, 0.55)' },
  funnel: { color: '#c084fc', color2: '#8b5cf6', glow: 'rgba(168, 85, 247, 0.55)' },
  beer: { color: '#facc15', color2: '#f59e0b', glow: 'rgba(250, 204, 21, 0.55)' },
  darts: { color: '#fb7185', color2: '#e11d48', glow: 'rgba(244, 63, 94, 0.6)' },
};

const FALLBACK_THEME = { color: '#a855f7', color2: '#ec4899', glow: 'rgba(168, 85, 247, 0.55)' };

export function themeFor(challengeId) {
  return CHALLENGE_THEME[challengeId] ?? FALLBACK_THEME;
}

export function themeStyle(challengeId) {
  const t = themeFor(challengeId);
  return { '--c': t.color, '--c2': t.color2, '--glow': t.glow };
}
